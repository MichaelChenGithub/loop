from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client

from app.core.auth import get_current_user_id
from app.core.db import get_supabase
from app.core.realtime import RealtimeClientSecretBroker
from app.core.settings import get_settings
from app.models.quota import SessionEndRequest
from app.models.realtime import RealtimeClientSecretResponse, RealtimeSessionRequest

SESSION_QUOTA = 3
MIN_BILLABLE_SECONDS = 180  # sessions <= 3 min are free


def _sanitize_client_secret(payload: dict[str, Any]) -> RealtimeClientSecretResponse:
    session = payload.get("session") or {}
    return RealtimeClientSecretResponse.model_validate(
        {
            "value": payload["value"],
            "expires_at": payload["expires_at"],
            "session": {
                "id": session["id"],
                "model": session["model"],
                "object": session["object"],
                "type": session["type"],
            },
        }
    )


def _default_session_creator(request: RealtimeSessionRequest) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="Realtime broker is not configured")

    broker = RealtimeClientSecretBroker(
        api_key=settings.openai_api_key,
        model=settings.openai_realtime_model,
        voice=settings.openai_realtime_voice,
        instructions=settings.openai_realtime_instructions,
        max_interview_seconds=settings.max_interview_seconds,
    )
    try:
        return broker.create(request)
    except httpx.HTTPStatusError as exc:
        body = exc.response.text
        raise HTTPException(status_code=502, detail=f"OpenAI error {exc.response.status_code}: {body}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Request error: {exc}") from exc


def _check_and_register_user(user_id: str, db: Client) -> None:
    """
    On first sign-in: insert a user_quota row and atomically increment beta_signups.
    Raises 403 if the beta cap is already reached.
    On subsequent calls: just check quota.
    """
    existing = (
        db.table("user_quota")
        .select("sessions_used")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if existing.data is None:
        # New user — atomically claim a beta slot
        result = (
            db.rpc("claim_beta_slot", {})
            .execute()
        )
        # claim_beta_slot returns the new total_users, or null if cap was reached
        if result.data is None:
            raise HTTPException(status_code=403, detail={"error": "beta_full"})

        # upsert avoids a duplicate-key error if two concurrent requests
        # both see no existing row and both claim a beta slot
        db.table("user_quota").upsert({"user_id": user_id}).execute()

    else:
        if existing.data["sessions_used"] >= SESSION_QUOTA:
            raise HTTPException(status_code=403, detail={"error": "no_quota"})


def create_app(
    *,
    create_session: Callable[[RealtimeSessionRequest], dict[str, Any]] | None = None,
    get_db: Callable[[], Client] | None = None,
    get_user_id: Callable[[], str] | None = None,
) -> FastAPI:
    app = FastAPI(title="loop api")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://leetcode.com", "https://www.leetcode.com"],
        allow_methods=["POST"],
    )

    session_creator = create_session or _default_session_creator
    db_factory = get_db or get_supabase
    user_id_dep = get_user_id or get_current_user_id

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/v1/realtime/sessions", response_model=RealtimeClientSecretResponse)
    def create_realtime_session(
        request: RealtimeSessionRequest,
        user_id: str = Depends(user_id_dep),
    ) -> RealtimeClientSecretResponse:
        db = db_factory()
        _check_and_register_user(user_id, db)

        try:
            payload = session_creator(request)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Failed to create realtime session",
            ) from exc
        return _sanitize_client_secret(payload)

    @app.post("/v1/realtime/sessions/end", status_code=200)
    def end_realtime_session(
        body: SessionEndRequest,
        user_id: str = Depends(user_id_dep),
    ) -> dict[str, str]:
        if body.duration_seconds <= MIN_BILLABLE_SECONDS:
            return {"status": "not_counted"}

        db = db_factory()
        minutes = round(body.duration_seconds / 60, 2)
        db.rpc(
            "increment_session_usage",
            {"p_user_id": user_id, "p_minutes": minutes},
        ).execute()
        return {"status": "recorded"}

    return app


app = create_app()
