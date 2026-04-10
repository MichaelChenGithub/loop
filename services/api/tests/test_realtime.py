from __future__ import annotations

import httpx
from app.core.realtime import RealtimeClientSecretBroker
from app.models.realtime import RealtimeSessionRequest

VALID_REQUEST = RealtimeSessionRequest.model_validate(
    {
        "problem": {
            "slug": "two-sum",
            "title": "Two Sum",
            "difficulty": "Easy",
            "description": "Given an array of integers nums and an integer target.",
            "examples": [{"input": "nums = [2,7], target = 9", "output": "[0,1]"}],
            "constraints": ["2 <= nums.length <= 10^4"],
        }
    }
)


def _make_broker(
    max_interview_seconds: int = 600,
) -> tuple[RealtimeClientSecretBroker, dict]:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers["Authorization"]
        captured["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "value": "ek_123",
                "expires_at": 1_900_000_000,
                "session": {
                    "id": "sess_123",
                    "model": "gpt-realtime-2025-08-25",
                    "object": "realtime.session",
                    "type": "realtime",
                },
            },
        )

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport)
    broker = RealtimeClientSecretBroker(
        api_key="sk-test",
        model="gpt-realtime-2025-08-25",
        voice="alloy",
        instructions="You are Loop, a voice interviewer.",
        max_interview_seconds=max_interview_seconds,
        http_client=http_client,
    )
    return broker, captured


def test_broker_posts_backend_owned_defaults_to_openai() -> None:
    broker, captured = _make_broker(max_interview_seconds=600)

    result = broker.create(VALID_REQUEST)

    assert result["value"] == "ek_123"
    assert captured == {
        "method": "POST",
        "url": "https://api.openai.com/v1/realtime/client_secrets",
        "authorization": "Bearer sk-test",
        "json": (
            '{"expires_after":{"anchor":"created_at","seconds":600},"session":'
            '{"type":"realtime","model":"gpt-realtime-2025-08-25",'
            '"instructions":"You are Loop, a voice interviewer.","audio":'
            '{"output":{"voice":"alloy"}}}}'
        ),
    }


def test_broker_uses_configured_max_interview_seconds() -> None:
    broker, captured = _make_broker(max_interview_seconds=1800)

    broker.create(VALID_REQUEST)

    import json
    body = json.loads(captured["json"])
    assert body["expires_after"]["seconds"] == 1800


def test_broker_accepts_problem_context_for_future_instruction_integration() -> None:
    broker, _ = _make_broker(max_interview_seconds=600)

    result = broker.create(VALID_REQUEST)

    assert result["value"] == "ek_123"
