from __future__ import annotations

from unittest.mock import MagicMock

from app.main import create_app
from fastapi.testclient import TestClient

VALID_REQUEST = {
    "problem": {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target.",
        "examples": [{"input": "nums = [2,7], target = 9", "output": "[0,1]"}],
        "constraints": ["2 <= nums.length <= 10^4"],
    }
}

# Fake dependencies that bypass auth and DB for tests focused on session logic
_FAKE_USER_ID = "test-user-id"


def _fake_user_id() -> str:
    return _FAKE_USER_ID


def _fake_db() -> MagicMock:
    db = MagicMock()
    # Returning user with quota remaining — satisfies _check_and_register_user
    quota_result = MagicMock()
    quota_result.data = {"sessions_used": 0}
    (
        db.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = quota_result
    return db


def test_health_returns_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_realtime_session_returns_browser_safe_fields_only() -> None:
    created = []

    def create_session(problem: object) -> dict[str, object]:
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
        created.append({"problem": problem, "payload": payload})
        return payload

    client = TestClient(create_app(
        create_session=create_session,
        get_db=_fake_db,
        get_user_id=_fake_user_id,
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 200
    assert len(created) == 1
    assert created[0]["problem"].model_dump(exclude_none=True) == VALID_REQUEST
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

    def create_session(problem: object) -> dict[str, object]:
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

    client = TestClient(create_app(
        create_session=create_session,
        get_db=_fake_db,
        get_user_id=_fake_user_id,
    ))

    first = client.post("/v1/realtime/sessions", json=VALID_REQUEST)
    second = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["session"]["id"] != second.json()["session"]["id"]
    assert first.json()["value"] != second.json()["value"]


def test_create_realtime_session_hides_upstream_errors() -> None:
    def create_session(problem: object) -> dict[str, object]:
        raise RuntimeError("upstream auth failed with sk-live-secret")

    client = TestClient(create_app(
        create_session=create_session,
        get_db=_fake_db,
        get_user_id=_fake_user_id,
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 502
    assert response.json() == {"detail": "Failed to create realtime session"}


def test_create_realtime_session_rejects_missing_problem() -> None:
    client = TestClient(create_app(
        get_db=_fake_db,
        get_user_id=_fake_user_id,
    ))

    response = client.post("/v1/realtime/sessions", json={})

    assert response.status_code == 422


def test_create_realtime_session_rejects_placeholder_problem_content() -> None:
    client = TestClient(create_app(
        get_db=_fake_db,
        get_user_id=_fake_user_id,
    ))

    response = client.post(
        "/v1/realtime/sessions",
        json={
            "problem": {
                "slug": "cannot-parse-slug",
                "title": "Cannot parse title",
                "difficulty": "Unknown",
                "description": "Cannot parse description",
                "examples": [],
                "constraints": [],
            }
        },
    )

    assert response.status_code == 422
