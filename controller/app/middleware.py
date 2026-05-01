"""
middleware.py — JWT authentication middleware.

Skips auth for:
  - CORS preflight (OPTIONS)
  - Public paths (/health, /auth/login)
  - All portal self-service routes (/portal/*)
"""

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .routes import auth

_PUBLIC_PATHS = {"/health", "/auth/login"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if (request.method == "OPTIONS"
                or path in _PUBLIC_PATHS
                or path.startswith("/portal/")):
            return await call_next(request)
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token or not auth.verify_token(token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)
