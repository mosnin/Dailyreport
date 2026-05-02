import os
import json
from agents import Agent, Runner, function_tool
from composio_openai import ComposioToolSet, App
from .client import AppClient
from .types import AgentRequest

SYSTEM_PROMPT = """You are the user's personal chief of staff. You have access to their daily reports, active goals, and their connected work platforms including task managers and Google Calendar.

Rules:
- Be decisive and direct. Never hedge.
- Always call post_progress before each major step so the user knows what you're doing.
- When briefing: fetch their report, fetch their goals. If Google Calendar is connected, fetch today's events. Synthesize into a clear briefing covering their day, top priorities, and any schedule conflicts.
- When asked about tasks: fetch them, sync them back to the app via sync_tasks_to_app, then summarize.
- When asked to create/update calendar events, tasks, or messages: use the appropriate platform tool, then confirm the action taken.
- When done with all work, call complete_job with your final result as a JSON object.
  For briefings include: briefing (string), priorities (list of 3 strings), taskCount (int).
  For other intents include: summary (string), actions (list of strings of things done).
- If complete_job is not called, Python will handle it — but always try to call it for structured output."""

PLATFORM_APP_MAP: dict[str, App] = {
    "slack":          App.SLACK,
    "notion":         App.NOTION,
    "asana":          App.ASANA,
    "clickup":        App.CLICKUP,
    "trello":         App.TRELLO,
    "googlecalendar": App.GOOGLECALENDAR,
}


def run_agent(request: AgentRequest) -> None:
    app_url = os.environ["APP_URL"]
    secret = os.environ["MODAL_AGENT_SECRET"]
    client = AppClient(app_url, secret)

    job_id = request.jobId
    user_id = request.convexUserId

    # Track whether the agent explicitly called complete_job
    completion_state: dict = {"completed": False, "result": None}

    try:
        toolset = ComposioToolSet(api_key=os.environ["COMPOSIO_API_KEY"], entity_id=request.userId)

        # Only load tools for platforms the user has actually connected
        # Empty connectedPlatforms = no Composio tools (reports+goals only)
        composio_tools: list = []
        for platform_id in request.connectedPlatforms:
            composio_app = PLATFORM_APP_MAP.get(platform_id.lower())
            if not composio_app:
                continue
            try:
                tools = toolset.get_tools(apps=[composio_app])
                composio_tools.extend(tools)
            except Exception:
                pass  # Platform auth failed or not connected — skip

        # ── Agent-to-app callback tools ────────────────────────────────────

        @function_tool
        def post_progress(text: str) -> str:
            """Report progress to the user. Call before each major step."""
            client.post_progress(job_id, user_id, text)
            return "Progress noted."

        @function_tool
        def get_user_report() -> str:
            """Get the user's last 7 daily reports. Returns JSON array."""
            data = client.get_data(user_id, "report")
            return json.dumps(data)

        @function_tool
        def get_user_goals() -> str:
            """Get the user's active goals across all time horizons. Returns JSON."""
            data = client.get_data(user_id, "goals")
            return json.dumps(data)

        @function_tool
        def sync_tasks_to_app(tasks_json: str) -> str:
            """Sync fetched tasks back to the app so the user can see them.
            Pass a JSON array where each item has: platform, externalId, title,
            status, completed (bool), and optionally dueDate, url, priority."""
            try:
                tasks = json.loads(tasks_json)
            except json.JSONDecodeError:
                return "Error: invalid JSON"
            client.sync_tasks(user_id, tasks)
            return f"Synced {len(tasks)} tasks."

        @function_tool
        def complete_job(result_json: str) -> str:
            """Mark the job as done with a structured result. Always call this last.
            Pass a JSON object. For briefings: {briefing, priorities, taskCount}.
            For other tasks: {summary, actions}."""
            try:
                result = json.loads(result_json)
            except json.JSONDecodeError:
                result = {"summary": result_json}
            client.complete_job(job_id, user_id, result)
            completion_state["completed"] = True
            completion_state["result"] = result
            return "Job completed."

        # ── Build agent ────────────────────────────────────────────────────

        all_tools = [
            post_progress,
            get_user_report,
            get_user_goals,
            sync_tasks_to_app,
            complete_job,
        ] + composio_tools

        agent = Agent(
            name="DailyReport Chief of Staff",
            instructions=SYSTEM_PROMPT,
            tools=all_tools,
            model="gpt-4o",
        )

        client.post_progress(job_id, user_id, "Starting…")

        run_result = Runner.run_sync(agent, request.intent, max_turns=15)

        # If the agent didn't call complete_job (e.g. hit max_turns), handle it here
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
            client.complete_job(job_id, user_id, result)

    except Exception as e:
        if not completion_state["completed"]:
            client.fail_job(job_id, user_id, str(e))
        raise
