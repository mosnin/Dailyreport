import httpx
import os
from typing import Any


class AppClient:
    def __init__(self, app_url: str, secret: str):
        self.app_url = app_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {secret}", "Content-Type": "application/json"}

    def post_progress(self, job_id: str, user_id: str, text: str) -> None:
        try:
            httpx.post(
                f"{self.app_url}/api/agent/progress",
                json={"jobId": job_id, "userId": user_id, "text": text},
                headers=self.headers,
                timeout=10,
            )
        except Exception:
            pass  # progress updates are best-effort

    def complete_job(self, job_id: str, user_id: str, result: dict) -> None:
        httpx.post(
            f"{self.app_url}/api/agent/complete",
            json={"jobId": job_id, "userId": user_id, "result": result},
            headers=self.headers,
            timeout=15,
        )

    def fail_job(self, job_id: str, user_id: str, error: str) -> None:
        httpx.post(
            f"{self.app_url}/api/agent/fail",
            json={"jobId": job_id, "userId": user_id, "error": error},
            headers=self.headers,
            timeout=10,
        )

    def sync_tasks(self, user_id: str, tasks: list[dict]) -> None:
        httpx.post(
            f"{self.app_url}/api/agent/sync-tasks",
            json={"userId": user_id, "tasks": tasks},
            headers=self.headers,
            timeout=30,
        )

    def get_data(self, user_id: str, data_type: str) -> dict:
        response = httpx.get(
            f"{self.app_url}/api/agent/data",
            params={"userId": user_id, "type": data_type},
            headers=self.headers,
            timeout=15,
        )
        return response.json()
