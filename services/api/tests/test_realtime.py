from __future__ import annotations

import json
from unittest.mock import patch

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

    body = json.loads(captured["json"])

    assert result["value"] == "ek_123"
    assert captured["method"] == "POST"
    assert captured["url"] == "https://api.openai.com/v1/realtime/client_secrets"
    assert captured["authorization"] == "Bearer sk-test"
    assert body["expires_after"] == {"anchor": "created_at", "seconds": 600}
    assert body["session"]["type"] == "realtime"
    assert body["session"]["model"] == "gpt-realtime-2025-08-25"
    assert body["session"]["audio"] == {"output": {"voice": "alloy"}}
    assert body["session"]["tools"] == [
        {
            "type": "function",
            "name": "get_current_code_context",
            "description": (
                "Get the user's latest LeetCode codepad snapshot from the extension "
                "background state."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        }
    ]
    assert body["session"]["instructions"].startswith("You are Loop, a voice interviewer.")
    assert "\n---\n\n## Current Interview Problem\n" in body["session"]["instructions"]
    assert "Title: Two Sum" in body["session"]["instructions"]
    assert (
        "Interviewer directive: Ask only about this problem, use it as the active interview"
        " prompt, do not substitute another question, and keep follow-ups anchored to this"
        " problem."
    ) in body["session"]["instructions"]


def test_broker_uses_configured_max_interview_seconds() -> None:
    broker, captured = _make_broker(max_interview_seconds=1800)

    broker.create(VALID_REQUEST)

    body = json.loads(captured["json"])
    assert body["expires_after"]["seconds"] == 1800


def test_broker_compiles_full_problem_context_into_instructions() -> None:
    broker, captured = _make_broker(max_interview_seconds=600)

    broker.create(VALID_REQUEST)

    instructions = json.loads(captured["json"])["session"]["instructions"]

    assert instructions.startswith("You are Loop, a voice interviewer.")
    assert "Slug: two-sum" in instructions
    assert "Difficulty: Easy" in instructions
    assert "Description:\nGiven an array of integers nums and an integer target." in instructions
    assert "Examples:\n1. Input: nums = [2,7], target = 9\n   Output: [0,1]" in instructions
    assert "Constraints:\n- 2 <= nums.length <= 10^4" in instructions


def test_broker_prints_compiled_instructions_for_debugging() -> None:
    broker, _ = _make_broker(max_interview_seconds=600)

    with patch("builtins.print") as print_mock:
        broker.create(VALID_REQUEST)

    print_mock.assert_called_once()
    printed_output = print_mock.call_args.args[0]
    assert printed_output.startswith("[loop] Compiled realtime instructions:\n")
    assert "## Current Interview Problem" in printed_output
    assert "Title: Two Sum" in printed_output


def test_broker_declares_current_code_context_tool_without_arguments() -> None:
    broker, captured = _make_broker(max_interview_seconds=600)

    broker.create(VALID_REQUEST)

    tool = json.loads(captured["json"])["session"]["tools"][0]

    assert tool["name"] == "get_current_code_context"
    assert tool["parameters"] == {"type": "object", "properties": {}, "required": []}
