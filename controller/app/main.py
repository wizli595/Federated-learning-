"""
main.py — Composition Root for the Controller FastAPI application.

Wires together middleware, routers, and lifespan hooks.
Defines no logic — only imports, configures, and calls.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .middleware import AuthMiddleware
from .startup import reset_stale_training
from .routes import clients, data, training, inference, experiments, auth, portal
from .services import kafka_consumer


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    reset_stale_training()
    _kafka_task = asyncio.create_task(kafka_consumer.start())
    yield
    _kafka_task.cancel()


app = FastAPI(title="FL Email Spam — Controller", version="2.0.0", lifespan=lifespan)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(portal.router)
app.include_router(clients.router)
app.include_router(data.router)
app.include_router(training.router)
app.include_router(inference.router)
app.include_router(experiments.router)


@app.get("/health")
def health():
    return {"status": "ok"}
