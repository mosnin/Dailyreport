import os
import json
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from agents import Agent, Runner, function_tool
from .client import AppClient
from .contracts import AgentJobRequest as AgentRequest
from .integrations.composio_adapter import ComposioAdapter


def _local_now(timezone: str) -> str:
    """Return a human-readable date+time string in the user's timezone."""
    try:
        tz = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, Exception):
        tz = ZoneInfo("UTC")
    now = datetime.now(tz)
    return now.strftime("%A, %B %-d, %Y at %-I:%M %p %Z")


def build_system_prompt(request: AgentRequest) -> str:
    name = request.userName or "the user"
    tz = request.userTimezone or "UTC"
    now_str = request.today or _local_now(tz)
    platforms = ", ".join(request.connectedPlatforms) if request.connectedPlatforms else "none"

    return f"""You are {name}'s personal chief of staff. Right now it is {now_str}.

Connected platforms: {platforms}
You have access to {name}'s daily reports, active goals, and the platforms listed above.

━━━ MANDATORY: REASON BEFORE EVERY ACTION ━━━
Before each significant action, call think() to reason through:
  1. What does {name} actually need here — not just what they literally said?
  2. What is the exact sequence of steps to accomplish it?
  3. Is this action reversible? If not, is there unambiguous intent to proceed?

This is non-negotiable. Skipping think() before mutations (create/update/delete/send)
means you are acting without evaluation — do not do this.

━━━ CORE BEHAVIORS ━━━

MORNING BRIEFING:
  - Call get_user_report() to review recent daily reports
  - Call get_user_goals() to see goal completion rates
  - If Google Calendar is connected, fetch today's events
  - Synthesize into a briefing that mentions {name} by name, references actual goal
    categories and completion rates, any calendar events, and gives 3 concrete
    priorities for today — not generic advice, not platitudes
  - Output JSON: {{"briefing": "...", "priorities": ["...", "...", "..."], "taskCount": N}}

TASK OPERATIONS:
  - Fetch tasks via the platform tool (e.g. list Trello cards)
  - Call think() to decide what to sync (filter to open, relevant tasks)
  - Call sync_tasks_to_app() with the filtered task list
  - Summarize: total found, how many overdue, top 3 tasks
  - Output JSON: {{"summary": "...", "actions": ["Synced N tasks from Trello", ...]}}

CREATE / UPDATE / DELETE (calendar events, tasks, messages, cards):
  - REQUIRED: call think() first. Verify:
      a. The action exactly matches {name}'s stated intent — no assumptions
      b. You have all required fields (title, date, platform, etc.)
      c. The action is reversible OR {name} explicitly requested it
  - After completing: report exactly what was done and where
  - NEVER delete anything, send a message, or modify shared data without unambiguous
    instruction in the original request. When in doubt, describe what you would do
    and ask for confirmation via post_progress() instead of acting.

TOOL FAILURES:
  - If a tool returns an error or empty data, call think() to decide: retry, use
    alternate data source, or report the failure clearly to {name}
  - Never fabricate task titles, goal names, calendar events, or metrics
  - If you genuinely cannot fetch something, say so in the briefing

━━━ FINISHING ━━━
When all work is complete, call complete_job() with a JSON string.
  Briefings → {{"briefing": str, "priorities": [str, str, str], "taskCount": int}}
  Other tasks → {{"summary": str, "actions": [str, ...]}}
Python handles completion if you don't call it, but structured output requires you call it."""


def run_agent(request: AgentRequest) -> None:
    app_url = os.environ["APP_URL"]
    secret = os.environ["MODAL_AGENT_SECRET"]
    client = AppClient(app_url, secret)

    job_id = request.jobId
    user_id = request.convexUserId

    completion_state: dict = {"completed": False, "result": None}
    trace_id = request.traceId or str(uuid.uuid4())
    print(f"[agent-run] trace_id={trace_id} job_id={job_id} user_id={user_id}")

    def finalize_success(result: dict) -> None:
        if completion_state["completed"]:
            return
        client.complete_job(job_id, user_id, result, trace_id=trace_id)
        completion_state["completed"] = True
        completion_state["result"] = result

    try:
        composio_tools: list = []
        if request.connectedPlatforms:
            adapter = ComposioAdapter()
            preflight = adapter.preflight(request.connectedPlatforms)
            for warning in preflight.warnings:
                client.post_progress(job_id, user_id, warning, trace_id=trace_id)
            try:
                composio_tools = adapter.load_tools(request.userId, request.connectedPlatforms)
            except Exception as exc:
                client.post_progress(job_id, user_id, f"External app tools unavailable: {exc}", trace_id=trace_id)

        # ── Internal callback tools ────────────────────────────────────────

        @function_tool
        def think(reasoning: str) -> str:
            """
            Reason through a problem before acting. Call this to:
            - Plan the exact sequence of steps before executing them
            - Evaluate whether a proposed action matches the user's actual intent
            - Check if an action is irreversible or has side effects
            - Decide what to do when a tool fails or returns unexpected data

            This does not call any external service or modify any data.
            Your reasoning is private — users see post_progress messages, not this.
            Always call this before mutations (create, update, delete, send).
            Returns: "Reasoning complete. Proceed with your plan."
            """
            return "Reasoning complete. Proceed with your plan."

        @function_tool
        def post_progress(text: str) -> str:
            """
            Report progress to the user. Call this before each major step so the
            user knows what you're doing in real time.
            """
            client.post_progress(job_id, user_id, text, trace_id=trace_id)
            return "Progress noted."

        @function_tool
        def get_user_report() -> str:
            """
            Fetch the user's last 7 daily reports. Returns a JSON object with key
            'reports': an array ordered newest-first. Each report contains:
              date (str, YYYY-MM-DD), submittedAt (int, unix ms),
              responses (object) with fields:
                dayActivity (str), peopleMetToday (list), dailyGoals (list of str),
                emotionalDrain (str), problemsToSolve (list), problemsSolvedToday (list),
                didAffirmations (bool|null), tomorrowPlan (str)
            Use this to identify patterns, accomplishments, and blockers.
            """
            data = client.get_data(user_id, "report")
            return json.dumps(data)

        @function_tool
        def get_user_goals() -> str:
            """
            Fetch the user's active goals across all time horizons. Returns a JSON
            object with keys: yearly, quarterly, monthly, weekly. Each value is:
              { total: int, completed: int, periodKey: str }
            Use this to understand which goal periods need attention and calculate
            completion rates. A period with completed < total needs attention.
            """
            data = client.get_data(user_id, "goals")
            return json.dumps(data)

        @function_tool
        def sync_tasks_to_app(tasks_json: str) -> str:
            """
            Persist fetched tasks into the app so the user sees them in their Today view.
            Pass a JSON array where each item has:
              platform (str): slack|notion|asana|clickup|trello|googlecalendar
              externalId (str): unique ID from the source platform
              title (str): task name
              status (str): e.g. "open", "in_progress", "done"
              completed (bool): true if done
              dueDate (str, optional): YYYY-MM-DD
              url (str, optional): link to the task
              priority (str, optional): high|medium|low
            Call think() first to filter to only open, relevant tasks (max 50).
            """
            try:
                tasks = json.loads(tasks_json)
            except json.JSONDecodeError:
                return "Error: tasks_json is not valid JSON"
            if not isinstance(tasks, list):
                return "Error: tasks_json must be a JSON array"
            if len(tasks) > 50:
                tasks = tasks[:50]
            client.sync_tasks(user_id, tasks)
            return f"Synced {len(tasks)} tasks to the app."

        @function_tool
        def complete_job(result_json: str) -> str:
            """
            Mark the job as done and deliver the final result to the user.
            ALWAYS call this last, after all work is complete.

            Pass a JSON string. For briefings:
              {"briefing": "...", "priorities": ["...", "...", "..."], "taskCount": N}
            For other tasks:
              {"summary": "...", "actions": ["did X", "did Y"]}

            The briefing field is shown prominently to the user, so make it specific,
            personal, and actionable — not generic.
            """
            try:
                result = json.loads(result_json)
            except json.JSONDecodeError:
                result = {"summary": result_json}
            finalize_success(result)
            return "Job completed and delivered to the user."

        # ── Build and run agent ────────────────────────────────────────────

        all_tools = [
            think,
            post_progress,
            get_user_report,
            get_user_goals,
            sync_tasks_to_app,
            complete_job,
        ] + composio_tools

        agent = Agent(
            name="DailyReport Chief of Staff",
            instructions=build_system_prompt(request),
            tools=all_tools,
            model="gpt-4o",
        )

        client.post_progress(job_id, user_id, "Starting…", trace_id=trace_id)

        run_result = Runner.run_sync(agent, request.intent, max_turns=20)

        # Python-owned completion fallback if agent hit max_turns or skipped complete_job
        if not completion_state["completed"]:
            output = run_result.final_output
            if isinstance(output, str):
                try:
                    parsed = json.loads(output)
                    result = parsed if isinstance(parsed, dict) else {"briefing": output}
                except json.JSONDecodeError:
                    result = {"briefing": output}
            elif isinstance(output, dict):
                result = output
            else:
                result = {"summary": str(output) if output else "Agent completed."}
            finalize_success(result)

    except Exception as e:
        if not completion_state["completed"]:
            client.fail_job(job_id, user_id, str(e), trace_id=trace_id)
        raise
