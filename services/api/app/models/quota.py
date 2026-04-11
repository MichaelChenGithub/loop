from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class SessionEndRequest(BaseModel):
    duration_seconds: int


class QuotaErrorResponse(BaseModel):
    error: Literal["beta_full", "no_quota"]
