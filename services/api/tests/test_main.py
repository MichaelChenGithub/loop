from __future__ import annotations

from app.main import create_app
from fastapi.testclient import TestClient


def test_health_returns_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_realtime_session_returns_browser_safe_fields_only() -> None:
    created = []

    def create_session() -> dict[str, object]:
        payload = {
            "value": "ek_123",
            "expires_at": 1_900_000_000,
            "session": {
                "id": "sess_123",
                "model": "gpt-realtime-2025-08-25",
                "object": "realtime.session",
                "type": "realtime",
            },
            "server_secret": "must-not-leak",
        }
        created.append(payload)
        return payload

    client = TestClient(create_app(create_session=create_session))

    response = client.post("/v1/realtime/sessions")

    assert response.status_code == 200
    assert len(created) == 1
    assert response.json() == {
        "value": "ek_123",
        "expires_at": 1_900_000_000,
        "session": {
            "id": "sess_123",
            "model": "gpt-realtime-2025-08-25",
            "object": "realtime.session",
            "type": "realtime",
        },
    }


def test_create_realtime_session_creates_a_new_session_per_request() -> None:
    counter = {"value": 0}

    def create_session() -> dict[str, object]:
        counter["value"] += 1
        index = counter["value"]
        return {
            "value": f"ek_{index}",
            "expires_at": 1_900_000_000 + index,
            "session": {
                "id": f"sess_{index}",
                "model": "gpt-realtime-2025-08-25",
                "object": "realtime.session",
                "type": "realtime",
            },
        }

    client = TestClient(create_app(create_session=create_session))

    first = client.post("/v1/realtime/sessions")
    second = client.post("/v1/realtime/sessions")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["session"]["id"] != second.json()["session"]["id"]
    assert first.json()["value"] != second.json()["value"]


def test_create_realtime_session_hides_upstream_errors() -> None:
    def create_session() -> dict[str, object]:
        raise RuntimeError("upstream auth failed with sk-live-secret")

    client = TestClient(create_app(create_session=create_session))

    response = client.post("/v1/realtime/sessions")

    assert response.status_code == 502
    assert response.json() == {"detail": "Failed to create realtime session"}
