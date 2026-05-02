import os
import json
from agents import Agent, Runner, function_tool
from composio_openai import ComposioToolSet, Action, App
from .client import AppClient
from .types import AgentRequest

SYSTEM_PROMPT = """You are the user's personal chief of staff. You have access to their daily reports, active goals, and all their connected work platforms (Slack, Notion, ClickUp, Trello, Asana).

Your job:
- When asked to "brief" or "brief me": fetch their tasks from all connected platforms, read their latest daily report and goals, then write a clear prioritized briefing as a JSON object with keys: "briefing" (prose paragraph), "priorities" (list of 3 strings), "taskCount" (int).
- When asked to update or complete a task: find it and update it on the source platform.
- When asked about their tasks: fetch and summarize them.
- Be decisive and direct. Never hedge. Surface what matters most.

Always call sync_tasks_to_app after fetching tasks from platforms so the app stays in sync.
Always call post_progress to keep the user informed as you work.
Always end by calling complete_job with your result."""


def run_agent(request: AgentRequest) -> None:
    app_url = os.environ["APP_URL"]
    secret = os.environ["MODAL_AGENT_SECRET"]
    client = AppClient(app_url, secret)

    job_id = request.jobId
    user_id = request.convexUserId

    try:
        # Initialize Composio toolset for this user's entity
        toolset = ComposioToolSet(api_key=os.environ["COMPOSIO_API_KEY"], entity_id=request.userId)

        # Get tools for all supported platforms
        composio_tools = []
        for app in [App.NOTION, App.SLACK, App.ASANA, App.CLICKUP, App.TRELLO]:
            try:
                tools = toolset.get_tools(apps=[app])
                composio_tools.extend(tools)
            except Exception:
                pass  # Platform not connected — skip gracefully

        # Define app-callback tools
        @function_tool
        def post_progress(text: str) -> str:
            """Update the user on what you're currently doing."""
            client.post_progress(job_id, user_id, text)
            return "Progress updated."

        @function_tool
        def get_user_report() -> str:
            """Get the user's latest daily report responses."""
            data = client.get_data(user_id, "report")
            return json.dumps(data)

        @function_tool
        def get_user_goals() -> str:
            """Get the user's active goals across all time horizons."""
            data = client.get_data(user_id, "goals")
            return json.dumps(data)

        @function_tool
        def sync_tasks_to_app(tasks_json: str) -> str:
            """Sync a list of tasks from external platforms back to the app. Pass a JSON array of task objects with: platform, externalId, title, status, dueDate (optional), url (optional), priority (optional), completed (bool)."""
            tasks = json.loads(tasks_json)
            client.sync_tasks(user_id, tasks)
            return f"Synced {len(tasks)} tasks."

        @function_tool
        def complete_job(result_json: str) -> str:
            """Call this when you are done. Pass a JSON object as the result. For briefings, include: briefing (string), priorities (list of strings), taskCount (int)."""
            result = json.loads(result_json)
            client.complete_job(job_id, user_id, result)
            return "Job completed."

        all_tools = [post_progress, get_user_report, get_user_goals, sync_tasks_to_app, complete_job] + composio_tools

        agent = Agent(
            name="DailyReport Chief of Staff",
            instructions=SYSTEM_PROMPT,
            tools=all_tools,
            model="gpt-4o",
        )

        client.post_progress(job_id, user_id, "Starting…")

        Runner.run_sync(agent, request.intent)

    except Exception as e:
        client.fail_job(job_id, user_id, str(e))
        raise
