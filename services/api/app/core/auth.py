from __future__ import annotations

from typing import Any

import httpx
import jwt
from cachetools import TTLCache, cached
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.settings import get_settings

_bearer = HTTPBearer()

# Cache JWKS for 90 minutes — safely longer than our max 40-min session
_jwks_cache: TTLCache[str, Any] = TTLCache(maxsize=1, ttl=90 * 60)


@cached(_jwks_cache)
def _fetch_jwks(supabase_url: str) -> dict[str, Any]:
    url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _verify_token(token: str, supabase_url: str) -> str:
    jwks = _fetch_jwks(supabase_url)
    signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwks["keys"][0])
    payload = jwt.decode(
        token,
        signing_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
    user_id: str = payload["sub"]
    return user_id


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Auth is not configured")
    try:
        return _verify_token(credentials.credentials, settings.supabase_url)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
