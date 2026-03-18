import logging
from collections import deque
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import control_router, federation_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

log_buffer: deque = deque(maxlen=1000)


class BufferHandler(logging.Handler):
    def emit(self, record):
        try:
            log_buffer.append({
                "ts": datetime.utcnow().isoformat() + "Z",
                "level": record.levelname,
                "source": "server",
                "msg": self.format(record),
            })
        except Exception:
            pass


logging.getLogger().addHandler(BufferHandler())

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
