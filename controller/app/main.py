"""
main.py — Controller FastAPI application.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from . import db
from .routes import clients, data, training, inference, experiments, auth
from .services import flower, kafka_bridge

# ── Auth middleware ────────────────────────────────────────────────────────────
_PUBLIC_PATHS = {"/health", "/auth/login"}

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token or not auth.verify_token(token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    _reset_stale_training()
    # Background Kafka consumer — no-ops gracefully if Kafka is absent
    _kafka_task = asyncio.create_task(kafka_bridge.start_consumer())
    yield
    _kafka_task.cancel()


def _reset_stale_training() -> None:
    import json
    if not flower.METRICS.exists():
        return
    try:
        with open(flower.METRICS) as f:
            m = json.load(f)
        if m.get("status") in ("training", "waiting"):
            m["status"] = "idle"
            with open(flower.METRICS, "w") as f:
                json.dump(m, f, indent=2)
            print("[controller] reset stale training state → idle", flush=True)
    except Exception:
        pass


app = FastAPI(title="FL Email Spam — Controller", version="2.0.0", lifespan=lifespan)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(data.router)
app.include_router(training.router)
app.include_router(inference.router)
app.include_router(experiments.router)


@app.get("/health")
def health():
    return {"status": "ok"}
