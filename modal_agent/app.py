import modal

app = modal.App("dailyreport-agent")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "openai-agents>=0.0.14",
        "composio-openai>=0.5.0",
        "httpx>=0.27.0",
        "pydantic>=2.7.0",
        "fastapi>=0.111.0",
    )
)

agent_secrets = modal.Secret.from_name("dailyreport-agent")


@app.function(
    image=image,
    secrets=[agent_secrets],
    timeout=300,
    retries=0,
)
def run_agent_job(request_dict: dict) -> None:
    import sys
    sys.path.insert(0, "/root")
    from modal_agent.orchestrator import run_agent
    from modal_agent.types import AgentRequest
    request = AgentRequest(**request_dict)
    run_agent(request)


@app.function(image=image, secrets=[agent_secrets])
@modal.asgi_app(label="dailyreport-agent")
def fastapi_app():
    import os
    from fastapi import FastAPI, HTTPException, Header, Request

    web_app = FastAPI()

    @web_app.post("/run")
    async def run(request: Request, authorization: str = Header(None)):
        secret = os.environ.get("MODAL_AGENT_SECRET", "")
        if not authorization or authorization != f"Bearer {secret}":
            raise HTTPException(status_code=401, detail="Unauthorized")

        body = await request.json()
        run_agent_job.spawn(body)

        return {"status": "started", "jobId": body.get("jobId")}

    @web_app.get("/health")
    async def health():
        return {"status": "ok"}

    return web_app
