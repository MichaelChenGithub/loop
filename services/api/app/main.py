from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.realtime import RealtimeClientSecretBroker
from app.core.settings import get_settings
from app.models.realtime import RealtimeClientSecretResponse, RealtimeSessionRequest


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


def create_app(
    *,
    create_session: Callable[[RealtimeSessionRequest], dict[str, Any]] | None = None,
) -> FastAPI:
    app = FastAPI(title="loop api")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://leetcode.com", "https://www.leetcode.com"],
        allow_methods=["POST"],
    )

    session_creator = create_session or _default_session_creator

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/v1/realtime/sessions", response_model=RealtimeClientSecretResponse)
    def create_realtime_session(request: RealtimeSessionRequest) -> RealtimeClientSecretResponse:
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

    return app


app = create_app()
