import httpx
import time
import os
from typing import Any


class AppClient:
    def __init__(self, app_url: str, secret: str):
        self.app_url = app_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {secret}", "X-Modal-Secret": secret, "Content-Type": "application/json"}
        if not secret:
            raise RuntimeError("MODAL_AGENT_SECRET is missing in Modal secret; cannot authenticate callbacks.")

    def _post_with_retry(self, url: str, json_data: dict, timeout: int = 15, retries: int = 2) -> None:
        delay = 1.0
        last_exc: Exception = RuntimeError("no attempts made")
        for attempt in range(retries + 1):
            try:
                resp = httpx.post(url, json=json_data, headers=self.headers, timeout=timeout, follow_redirects=False)
                if 300 <= resp.status_code < 400:
                    location = resp.headers.get("location", "")
                    raise RuntimeError(
                        f"Redirected while calling {url} (status {resp.status_code}) to {location}. "
                        "Set APP_URL in Modal secret to the final canonical domain to preserve Authorization headers."
                    )
                resp.raise_for_status()
                return
            except Exception as exc:
                last_exc = exc
                if attempt < retries:
                    time.sleep(delay)
                    delay *= 2
        raise last_exc

    def post_progress(self, job_id: str, user_id: str, text: str) -> None:
        try:
            httpx.post(
                f"{self.app_url}/api/agent/progress",
                json={"jobId": job_id, "userId": user_id, "text": text},
                headers=self.headers,
                timeout=10,
                follow_redirects=False,
            )
        except Exception:
            pass  # progress updates are best-effort

    def complete_job(self, job_id: str, user_id: str, result: dict) -> None:
        self._post_with_retry(
            f"{self.app_url}/api/agent/complete",
            {"jobId": job_id, "userId": user_id, "result": result},
            timeout=15,
        )

    def fail_job(self, job_id: str, user_id: str, error: str) -> None:
        self._post_with_retry(
            f"{self.app_url}/api/agent/fail",
            {"jobId": job_id, "userId": user_id, "error": error},
            timeout=10,
        )

    def sync_tasks(self, user_id: str, tasks: list[dict]) -> None:
        httpx.post(
            f"{self.app_url}/api/agent/sync-tasks",
            json={"userId": user_id, "tasks": tasks},
            headers=self.headers,
            timeout=30,
            follow_redirects=False,
        )

    def get_data(self, user_id: str, data_type: str) -> dict:
        response = httpx.get(
            f"{self.app_url}/api/agent/data",
            params={"userId": user_id, "type": data_type},
            headers=self.headers,
            timeout=15,
            follow_redirects=False,
        )
        return response.json()
