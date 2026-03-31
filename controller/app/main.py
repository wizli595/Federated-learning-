"""
main.py — Controller FastAPI application.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .routes import clients, data, training, inference, experiments
from .services import flower


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    # If the container restarted while training was running, reset stale status
    # so the Start button appears immediately instead of being stuck on "training"
    _reset_stale_training()
    yield


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router)
app.include_router(data.router)
app.include_router(training.router)
app.include_router(inference.router)
app.include_router(experiments.router)


@app.get("/health")
def health():
    return {"status": "ok"}
