from __future__ import annotations

import os
from dataclasses import dataclass


SUPPORTED_PLATFORMS = {"slack", "notion", "asana", "clickup", "trello", "googlecalendar"}


@dataclass
class ComposioAvailability:
    available: bool
    reason: str = ""


@dataclass
class ComposioPreflight:
    ok: bool
    enabled_platforms: list[str]
    warnings: list[str]


class ComposioAdapter:
    def __init__(self) -> None:
        self.enabled = os.environ.get("AGENT_ENABLE_COMPOSIO", "false").lower() == "true"

    def availability(self) -> ComposioAvailability:
        if not self.enabled:
            return ComposioAvailability(False, "AGENT_ENABLE_COMPOSIO is false")

        if not os.environ.get("COMPOSIO_API_KEY"):
            return ComposioAvailability(False, "COMPOSIO_API_KEY is missing")

        try:
            import composio  # noqa: F401
            import composio_openai_agents  # noqa: F401
        except Exception as exc:
            return ComposioAvailability(False, f"dependency import failed: {exc}")

        return ComposioAvailability(True, "")

    def preflight(self, connected_platforms: list[str]) -> ComposioPreflight:
        normalized = [p.lower().strip() for p in connected_platforms if p and p.strip()]
        enabled = [p for p in normalized if p in SUPPORTED_PLATFORMS]
        unsupported = sorted(set(normalized) - SUPPORTED_PLATFORMS)

        warnings: list[str] = []
        if unsupported:
            warnings.append(
                "Unsupported connected platforms skipped: " + ", ".join(unsupported)
            )
        if not enabled and normalized:
            warnings.append("No supported integrations available. Reconnect supported apps in Integrations.")

        return ComposioPreflight(ok=len(enabled) > 0, enabled_platforms=enabled, warnings=warnings)

    def load_tools(self, user_id: str, connected_platforms: list[str]) -> list:
        status = self.availability()
        if not status.available:
            raise RuntimeError(status.reason)

        preflight = self.preflight(connected_platforms)
        if not preflight.ok:
            raise RuntimeError("No supported connected platforms available for Composio.")

        from composio import Composio
        from composio_openai_agents import OpenAIAgentsProvider

        composio = Composio(
            api_key=os.environ["COMPOSIO_API_KEY"],
            provider=OpenAIAgentsProvider(),
        )
        session = composio.create(user_id=user_id)
        return session.tools(apps=preflight.enabled_platforms)
