import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import control_router, federation_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="FL Server",
    version="0.1.0",
    description="Federated Learning aggregation server — from scratch, no Flower",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(control_router)
app.include_router(federation_router)
