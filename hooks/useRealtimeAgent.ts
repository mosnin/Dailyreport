"use client";

import { useRef, useState, useCallback } from "react";

export type AgentState = "idle" | "connecting" | "listening" | "speaking" | "error";

export interface ActionLogEntry {
  id: string;
  text: string;
}

export interface ToolHandlers {
  addGoal: (title: string, category: "weekly" | "monthly" | "quarterly" | "yearly") => Promise<void>;
  addProblem: (title: string) => Promise<void>;
  addAffirmation: (text: string) => Promise<void>;
  patchReport: (field: "tomorrowPlan" | "dayActivity", value: string) => Promise<void>;
}

const INSTRUCTIONS = `You are a quiet, perceptive assistant inside a personal accountability journal. Help the user capture their intentions through natural conversation.

You can add goals, log problems, add affirmations, update today's activity, and update tomorrow's plan.

Rules:
- Be brief. Confirm every action in one sentence.
- Ask one clarifying question only when genuinely needed.
- Never lecture or give unsolicited advice.
- For goals: weekly = tasks this week, monthly = month-long projects, quarterly = 3-month objectives, yearly = big life goals.
- If user says "done", "that's it", or "close", say goodbye warmly.`;

const TOOLS = [
  {
    type: "function",
    name: "add_goal",
    description: "Add a goal to the user's goal list",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Concise goal title, max 8 words, action phrase" },
        category: {
          type: "string",
          enum: ["weekly", "monthly", "quarterly", "yearly"],
          description: "Time horizon for the goal",
        },
      },
      required: ["title", "category"],
    },
  },
  {
    type: "function",
    name: "add_problem",
    description: "Log a problem to solve in today's report",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Concise problem description" },
      },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "add_affirmation",
    description: "Add an affirmation to the user's list",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Affirmation in present tense" },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "update_tomorrow_plan",
    description: "Set the user's plan for tomorrow",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Tomorrow's plan" },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "update_day_activity",
    description: "Update what the user did today",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Description of today's activity" },
      },
      required: ["text"],
    },
  },
];

export function useRealtimeAgent(handlers: ToolHandlers) {
  const [state, setState] = useState<AgentState>("idle");
  const [transcript, setTranscript] = useState("");
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function pushLog(text: string) {
    setActionLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...prev]);
  }

  async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    try {
      switch (name) {
        case "add_goal": {
          await handlers.addGoal(
            args.title as string,
            args.category as "weekly" | "monthly" | "quarterly" | "yearly"
          );
          const msg = `Added "${args.title}" to ${args.category} goals`;
          pushLog(msg);
          return msg;
        }
        case "add_problem": {
          await handlers.addProblem(args.title as string);
          const msg = `Logged: "${args.title}"`;
          pushLog(msg);
          return msg;
        }
        case "add_affirmation": {
          await handlers.addAffirmation(args.text as string);
          pushLog("Affirmation added");
          return "Affirmation added";
        }
        case "update_tomorrow_plan": {
          await handlers.patchReport("tomorrowPlan", args.text as string);
          pushLog("Tomorrow's plan updated");
          return "Tomorrow's plan updated";
        }
        case "update_day_activity": {
          await handlers.patchReport("dayActivity", args.text as string);
          pushLog("Today's activity updated");
          return "Today's activity updated";
        }
        default:
          return "Unknown action";
      }
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "failed"}`;
    }
  }

  function cleanup() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }

  const connect = useCallback(async () => {
    if (state === "connecting" || state === "listening" || state === "speaking") return;
    setState("connecting");
    setActionLog([]);
    setTranscript("");

    try {
      const res = await fetch("/api/realtime/session", { method: "POST" });
      if (!res.ok) throw new Error(`Session error: ${res.status}`);
      const { client_secret } = await res.json();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setState("listening");
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: INSTRUCTIONS,
            tools: TOOLS,
            tool_choice: "auto",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
        }));
      };

      dc.onmessage = async (e) => {
        let event: Record<string, unknown>;
        try { event = JSON.parse(e.data as string); } catch { return; }

        switch (event.type) {
          case "input_audio_buffer.speech_started":
            setTranscript("");
            setState("listening");
            break;
          case "response.created":
          case "response.audio.delta":
            setState("speaking");
            break;
          case "response.audio_transcript.delta":
            setTranscript((prev) => prev + ((event.delta as string) ?? ""));
            break;
          case "response.audio_transcript.done":
            setTranscript((event.transcript as string) ?? "");
            break;
          case "response.done":
            setState("listening");
            break;
          case "conversation.item.input_audio_transcription.completed":
            setTranscript((event.transcript as string) ?? "");
            break;
          case "response.function_call_arguments.done": {
            const callId = event.call_id as string;
            const name = event.name as string;
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(event.arguments as string); } catch {}
            const result = await executeTool(name, args);
            dc.send(JSON.stringify({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: callId, output: result },
            }));
            dc.send(JSON.stringify({ type: "response.create" }));
            break;
          }
          case "error":
            console.error("Realtime API error:", event.error);
            setState("error");
            break;
        }
      };

      dc.onclose = () => { if (state !== "idle") setState("idle"); };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            "Content-Type": "application/sdp",
          },
        }
      );
      if (!sdpRes.ok) throw new Error("SDP exchange failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

    } catch (err) {
      console.error("Voice agent connection failed:", err);
      cleanup();
      setState("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const disconnect = useCallback(() => {
    cleanup();
    setState("idle");
    setTranscript("");
  }, []);

  return { state, transcript, actionLog, connect, disconnect };
}
