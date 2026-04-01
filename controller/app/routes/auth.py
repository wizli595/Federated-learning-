"""
auth.py — Login endpoint. Validates ACCESS_CODE from env, returns a JWT.
"""

import os
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from jose import jwt
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

_ACCESS_CODE = os.getenv("ACCESS_CODE", "spamfl2024")
_JWT_SECRET  = os.getenv("JWT_SECRET",  "spamfl-dev-secret")
_ALGORITHM   = "HS256"
_TOKEN_TTL   = timedelta(days=30)


def create_token() -> str:
    payload = {
        "sub": "dashboard",
        "exp": datetime.utcnow() + _TOKEN_TTL,
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_ALGORITHM)


def verify_token(token: str) -> bool:
    try:
        jwt.decode(token, _JWT_SECRET, algorithms=[_ALGORITHM])
        return True
    except Exception:
        return False


class LoginRequest(BaseModel):
    code: str


@router.post("/login")
def login(req: LoginRequest):
    if req.code != _ACCESS_CODE:
        raise HTTPException(status_code=401, detail="Invalid access code")
    return {"token": create_token()}
