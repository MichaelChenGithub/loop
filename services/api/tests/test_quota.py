from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import MIN_BILLABLE_SECONDS, SESSION_QUOTA, create_app

VALID_REQUEST: dict[str, Any] = {
    "problem": {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target.",
        "examples": [{"input": "nums = [2,7], target = 9", "output": "[0,1]"}],
        "constraints": ["2 <= nums.length <= 10^4"],
    }
}

VALID_SESSION_RESPONSE: dict[str, Any] = {
    "value": "ek_123",
    "expires_at": 1_900_000_000,
    "session": {
        "id": "sess_123",
        "model": "gpt-realtime-2025-08-25",
        "object": "realtime.session",
        "type": "realtime",
    },
}


def _make_db(*, is_new_user: bool = False, sessions_used: int = 0, beta_full: bool = False) -> MagicMock:
    """Build a fake Supabase client covering user_quota and beta_signups interactions."""
    db = MagicMock()

    # user_quota.select(...).eq(...).maybe_single().execute()
    quota_result = MagicMock()
    quota_result.data = None if is_new_user else {"sessions_used": sessions_used}
    (
        db.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = quota_result

    # claim_beta_slot rpc
    beta_result = MagicMock()
    beta_result.data = None if beta_full else 1
    db.rpc.return_value.execute.return_value = beta_result

    return db


def _stub_session(request: object) -> dict[str, Any]:
    return VALID_SESSION_RESPONSE


# ---------------------------------------------------------------------------
# POST /v1/realtime/sessions — auth
# ---------------------------------------------------------------------------

def test_create_session_rejects_missing_auth_header() -> None:
    client = TestClient(create_app(), raise_server_exceptions=False)

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 403  # HTTPBearer returns 403 when header absent


def test_create_session_rejects_invalid_token() -> None:
    def bad_user_id() -> str:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")

    client = TestClient(create_app(get_user_id=bad_user_id))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /v1/realtime/sessions — beta cap + quota
# ---------------------------------------------------------------------------

def test_create_session_succeeds_for_new_user_with_slots_available() -> None:
    db = _make_db(is_new_user=True)
    client = TestClient(create_app(
        create_session=_stub_session,
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 200
    assert response.json()["value"] == "ek_123"


def test_create_session_returns_403_beta_full_for_new_user_when_cap_reached() -> None:
    db = _make_db(is_new_user=True, beta_full=True)
    client = TestClient(create_app(
        create_session=_stub_session,
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "beta_full"


def test_create_session_returns_403_no_quota_when_sessions_exhausted() -> None:
    db = _make_db(is_new_user=False, sessions_used=SESSION_QUOTA)
    client = TestClient(create_app(
        create_session=_stub_session,
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "no_quota"


def test_create_session_succeeds_for_returning_user_with_quota_remaining() -> None:
    db = _make_db(is_new_user=False, sessions_used=SESSION_QUOTA - 1)
    client = TestClient(create_app(
        create_session=_stub_session,
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post("/v1/realtime/sessions", json=VALID_REQUEST)

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# POST /v1/realtime/sessions/end
# ---------------------------------------------------------------------------

def test_end_session_returns_not_counted_for_short_session() -> None:
    db = _make_db()
    client = TestClient(create_app(
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post(
        "/v1/realtime/sessions/end",
        json={"duration_seconds": MIN_BILLABLE_SECONDS},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "not_counted"
    db.rpc.assert_not_called()


def test_end_session_records_usage_for_billable_session() -> None:
    db = _make_db()
    client = TestClient(create_app(
        get_db=lambda: db,
        get_user_id=lambda: "user-abc",
    ))

    response = client.post(
        "/v1/realtime/sessions/end",
        json={"duration_seconds": MIN_BILLABLE_SECONDS + 1},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "recorded"
    db.rpc.assert_called_once_with(
        "increment_session_usage",
        {"p_user_id": "user-abc", "p_minutes": pytest.approx((MIN_BILLABLE_SECONDS + 1) / 60, abs=0.01)},
    )


def test_end_session_rejects_missing_auth() -> None:
    client = TestClient(create_app(), raise_server_exceptions=False)

    response = client.post(
        "/v1/realtime/sessions/end",
        json={"duration_seconds": 300},
    )

    assert response.status_code == 403
