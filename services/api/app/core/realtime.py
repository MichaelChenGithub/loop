from __future__ import annotations

from typing import Any

import httpx

from app.core.prompt_compiler import compile_realtime_instructions
from app.models.realtime import RealtimeSessionRequest


def build_current_code_context_tool() -> dict[str, Any]:
    return {
        "type": "function",
        "name": "get_current_code_context",
        "description": (
            "Retrieve the candidate's current editor content — including code, pseudocode, and comments. "
            "Call this whenever the candidate may have written anything in the editor: during approach "
            "planning, implementation, debugging, or optimization. Do not wait for the candidate to ask."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    }


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
        instructions = compile_realtime_instructions(self._instructions, request.problem)
        print(f"[loop] Compiled realtime instructions:\n{instructions}")
        payload = {
            "expires_after": {"anchor": "created_at", "seconds": self._max_interview_seconds},
            "session": {
                "type": "realtime",
                "model": self._model,
                "instructions": instructions,
                "audio": {
                    "input": {
                        "turn_detection": {
                            "type": "server_vad",
                            "create_response": True,
                        }
                    },
                    "output": {
                        "voice": self._voice,
                    }
                },
                "tools": [build_current_code_context_tool()],
            },
        }
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
