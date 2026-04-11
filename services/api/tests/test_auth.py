from __future__ import annotations

from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.auth import _fetch_jwks, _verify_token


def _generate_rsa_key_pair() -> tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _make_jwks(public_key: rsa.RSAPublicKey) -> dict:
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
    import base64, struct

    pub_numbers = public_key.public_key().public_numbers() if hasattr(public_key, "public_key") else public_key.public_numbers()

    def _int_to_base64url(n: int) -> str:
        length = (n.bit_length() + 7) // 8
        b = n.to_bytes(length, "big")
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

    return {
        "keys": [
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "n": _int_to_base64url(pub_numbers.n),
                "e": _int_to_base64url(pub_numbers.e),
            }
        ]
    }


def test_verify_token_returns_user_id_for_valid_token() -> None:
    private_key, public_key = _generate_rsa_key_pair()
    jwks = _make_jwks(public_key)
    token = jwt.encode({"sub": "user-123"}, private_key, algorithm="RS256")

    with patch("app.core.auth._fetch_jwks", return_value=jwks):
        user_id = _verify_token(token, "https://test.supabase.co")

    assert user_id == "user-123"


def test_verify_token_raises_for_expired_token() -> None:
    import time
    private_key, public_key = _generate_rsa_key_pair()
    jwks = _make_jwks(public_key)
    token = jwt.encode(
        {"sub": "user-123", "exp": int(time.time()) - 10},
        private_key,
        algorithm="RS256",
    )

    with patch("app.core.auth._fetch_jwks", return_value=jwks):
        with pytest.raises(jwt.ExpiredSignatureError):
            _verify_token(token, "https://test.supabase.co")


def test_verify_token_raises_for_tampered_token() -> None:
    private_key, public_key = _generate_rsa_key_pair()
    other_private_key, _ = _generate_rsa_key_pair()
    jwks = _make_jwks(public_key)
    # signed with a different key
    token = jwt.encode({"sub": "user-123"}, other_private_key, algorithm="RS256")

    with patch("app.core.auth._fetch_jwks", return_value=jwks):
        with pytest.raises(jwt.InvalidTokenError):
            _verify_token(token, "https://test.supabase.co")
