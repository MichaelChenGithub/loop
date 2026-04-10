from __future__ import annotations

from pydantic import BaseModel


class RealtimeSessionSummary(BaseModel):
    id: str
    model: str
    object: str
    type: str


class RealtimeClientSecretResponse(BaseModel):
    value: str
    expires_at: int
    session: RealtimeSessionSummary
