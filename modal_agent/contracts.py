from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

CONTRACT_VERSION = "2026-05-02.v1"


class AgentJobRequest(BaseModel):
    contractVersion: str = CONTRACT_VERSION
    userId: str
    convexUserId: str
    intent: str
    jobId: str
    connectedPlatforms: list[str] = Field(default_factory=list)
    userName: str = ""
    userTimezone: str = "UTC"
    today: str = ""
    traceId: str = ""


class AgentBriefingResult(BaseModel):
    briefing: str
    priorities: list[str] = Field(default_factory=list)
    taskCount: int = 0


class AgentTaskResult(BaseModel):
    summary: str
    actions: list[str] = Field(default_factory=list)


class AgentJobSuccess(BaseModel):
    status: Literal["ok"] = "ok"
    result: dict[str, Any]


class AgentJobFailure(BaseModel):
    status: Literal["error"] = "error"
    error: str
