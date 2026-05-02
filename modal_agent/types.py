from pydantic import BaseModel, Field
from typing import Optional


class AgentRequest(BaseModel):
    userId: str                      # Clerk user ID
    convexUserId: str                # Convex document ID for the user
    intent: str                      # What the user wants the agent to do
    jobId: str                       # Convex agentJobs document ID
    connectedPlatforms: list[str] = Field(default_factory=list)  # e.g. ["notion", "asana"] — only load tools for these
    userName: str = ""               # User's display name — injected into system prompt
    userTimezone: str = "UTC"        # IANA timezone — used for date/time awareness
    today: str = ""                  # Pre-formatted date string — avoids re-computing in container


class TaskItem(BaseModel):
    platform: str
    externalId: str
    title: str
    status: str
    dueDate: Optional[str] = None
    url: Optional[str] = None
    priority: Optional[str] = None
    completed: bool = False
