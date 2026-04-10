from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_REALTIME_INSTRUCTIONS = (
    "You are Loop, a concise voice interviewer helping a user work through a LeetCode problem."
)


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_realtime_model: str
    openai_realtime_voice: str
    openai_realtime_instructions: str
    max_interview_seconds: int


def get_settings() -> Settings:
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_realtime_model=os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime"),
        openai_realtime_voice=os.getenv("OPENAI_REALTIME_VOICE", "alloy"),
        openai_realtime_instructions=os.getenv(
            "OPENAI_REALTIME_INSTRUCTIONS",
            DEFAULT_REALTIME_INSTRUCTIONS,
        ),
        max_interview_seconds=int(os.getenv("MAX_INTERVIEW_SECONDS", "600")),
    )
