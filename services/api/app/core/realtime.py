from __future__ import annotations

from typing import Any

import httpx

from app.models.realtime import RealtimeSessionRequest


class RealtimeClientSecretBroker:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        voice: str,
        instructions: str,
        max_interview_seconds: int = 600,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._voice = voice
        self._instructions = instructions
        self._max_interview_seconds = max_interview_seconds
        self._http_client = http_client

    def create(self, request: RealtimeSessionRequest) -> dict[str, Any]:
        payload = {
            "expires_after": {"anchor": "created_at", "seconds": self._max_interview_seconds},
            "session": {
                "type": "realtime",
                "model": self._model,
                "instructions": self._instructions,
                "audio": {
                    "output": {
                        "voice": self._voice,
                    }
                },
            },
        }
        _ = request
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        if self._http_client is not None:
            response = self._http_client.post(
                "https://api.openai.com/v1/realtime/client_secrets",
                headers=headers,
                json=payload,
            )
        else:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/realtime/client_secrets",
                    headers=headers,
                    json=payload,
                )

        response.raise_for_status()
        return response.json()
