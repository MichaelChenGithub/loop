from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class RealtimeProblemExample(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class RealtimeProblem(BaseModel):
    slug: str
    title: str
    difficulty: Literal["Easy", "Medium", "Hard", "Unknown"]
    description: str
    examples: list[RealtimeProblemExample]
    constraints: list[str]


class RealtimeSessionRequest(BaseModel):
    problem: RealtimeProblem


class RealtimeSessionSummary(BaseModel):
    id: str
    model: str
    object: str
    type: str


class RealtimeClientSecretResponse(BaseModel):
    value: str
    expires_at: int
    session: RealtimeSessionSummary
