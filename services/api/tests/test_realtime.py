from __future__ import annotations

import httpx
from app.core.realtime import RealtimeClientSecretBroker


def test_broker_posts_backend_owned_defaults_to_openai() -> None:
    captured = {}

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
        http_client=http_client,
    )

    result = broker.create()

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
