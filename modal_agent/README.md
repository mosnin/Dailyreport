# DailyReport Agent — Modal Service

This Python service runs on Modal and orchestrates the DailyReport AI agent using the OpenAI Agents SDK and Composio platform integrations.

## Setup

1. Install Modal CLI: `pip install modal`
2. Authenticate: `modal token new`
3. Create secret (fill in your values):
   ```bash
   modal secret create dailyreport-agent \
     OPENAI_API_KEY=sk-... \
     COMPOSIO_API_KEY=... \
     APP_URL=https://your-app.vercel.app \
     MODAL_AGENT_SECRET=your-random-secret-here
   ```
4. Deploy: `modal deploy modal_agent/app.py`
5. Copy the deployment URL (looks like `https://your-workspace--dailyreport-agent.modal.run`)
6. Add to your Next.js `.env.local`:
   ```
   MODAL_AGENT_URL=https://your-workspace--dailyreport-agent.modal.run
   MODAL_AGENT_SECRET=your-random-secret-here
   ```

## Platform Integrations (via Composio)

Connections are managed through the app's Integrations page. Composio stores the OAuth tokens and provides them to the agent at runtime using the user's entity ID (their Clerk user ID).

## Local Development

```bash
modal serve modal_agent/app.py
```

This gives you a local URL for testing without deploying.
