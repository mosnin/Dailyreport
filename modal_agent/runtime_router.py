from __future__ import annotations

import hashlib
import os

from .contracts import AgentJobRequest
from .orchestrator import run_agent as run_agent_v2


def _in_canary_bucket(user_id: str, percent: int) -> bool:
    if percent <= 0:
        return False
    if percent >= 100:
        return True
    h = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
    bucket = int(h[:8], 16) % 100
    return bucket < percent


def resolve_runtime_version(request: AgentJobRequest) -> str:
    mode = os.environ.get("AGENT_RUNTIME_VERSION", "v2").lower()
    if mode in {"v1", "v2"}:
        return mode

    if mode == "canary":
        try:
            percent = int(os.environ.get("AGENT_V2_CANARY_PERCENT", "10"))
        except ValueError:
            percent = 10
        percent = max(0, min(100, percent))
        return "v2" if _in_canary_bucket(request.userId, percent) else "v1"

    return "v2"


def run_agent_with_rollout(request: AgentJobRequest) -> None:
    version = resolve_runtime_version(request)
    print(f"[agent-rollout] runtime={version} user_id={request.userId} trace_id={request.traceId}")

    # v1 fallback currently points to the same stable runner while Phase 6 rollout is live.
    if version == "v1":
        run_agent_v2(request)
        return

    run_agent_v2(request)
