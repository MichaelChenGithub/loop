from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import jwt
import pytest

from app.core.auth import _verify_token


def test_verify_token_returns_user_id_for_valid_token() -> None:
    response = SimpleNamespace(user=SimpleNamespace(id="user-123"))

    with patch("app.core.auth.get_supabase") as get_supabase:
        get_supabase.return_value.auth.get_user.return_value = response

        user_id = _verify_token("token-value")

    assert user_id == "user-123"


def test_verify_token_raises_for_missing_user() -> None:
    response = SimpleNamespace(user=None)

    with patch("app.core.auth.get_supabase") as get_supabase:
        get_supabase.return_value.auth.get_user.return_value = response

        with pytest.raises(jwt.InvalidTokenError):
            _verify_token("token-value")


def test_verify_token_raises_for_backend_validation_failure() -> None:
    with patch("app.core.auth.get_supabase") as get_supabase:
        get_supabase.return_value.auth.get_user.side_effect = RuntimeError("boom")

        with pytest.raises(jwt.InvalidTokenError):
            _verify_token("token-value")
