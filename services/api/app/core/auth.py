from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import get_supabase
from app.core.settings import get_settings

_bearer = HTTPBearer()

def _verify_token(token: str) -> str:
    try:
        response = get_supabase().auth.get_user(token)
    except Exception as exc:
        raise jwt.InvalidTokenError("Invalid token") from exc

    user = getattr(response, "user", None)
    user_id = getattr(user, "id", None)

    if not isinstance(user_id, str) or not user_id:
        raise jwt.InvalidTokenError("Invalid token")

    return user_id


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Auth is not configured")
    try:
        return _verify_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
