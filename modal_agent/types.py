from pydantic import BaseModel
from typing import Optional


class AgentRequest(BaseModel):
    userId: str           # Clerk user ID
    convexUserId: str     # Convex document ID for the user
    intent: str           # What the user wants the agent to do
    jobId: str            # Convex agentJobs document ID
    connectedPlatforms: list[str] = []  # e.g. ["notion", "asana"] — only load tools for these


class TaskItem(BaseModel):
    platform: str
    externalId: str
    title: str
    status: str
    dueDate: Optional[str] = None
    url: Optional[str] = None
    priority: Optional[str] = None
    completed: bool = False
