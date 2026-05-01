"""
training.py — HTTP handlers for training control + SSE log stream.
"""

import json
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services import flower, kafka_sse, sse
from ..state import training

router = APIRouter(prefix="/training", tags=["training"])

CLIENTS_DIR = Path(__file__).parent.parent / "clients"
DATA_DIR    = Path(__file__).parent.parent.parent.parent / "fl" / "data"


class StartTrainingRequest(BaseModel):
    rounds: int          = 10
    local_epochs: int    = 5
    learning_rate: float = 0.01
    algorithm: str       = "fedavg"
    mu: float            = 0.1
    clip_norm: float     = 1.0
    noise_mult: float    = 0.01
    min_clients: int     = 2
    port: int            = 8090
    lr_schedule: str     = "none"      # "none" | "cosine" | "step"
    finetune_epochs: int = 3           # local fine-tune epochs after distribution; 0 = disabled


def _load_clients() -> List[Dict]:
    clients = []
    for p in sorted(CLIENTS_DIR.glob("*.json")):
        with open(p) as f:
            clients.append(json.load(f))
    return clients


@router.post("/start")
async def start_training(req: StartTrainingRequest):
    if training.running:
        raise HTTPException(409, "training already running")

    clients = _load_clients()
    if not clients:
        raise HTTPException(400, "no clients configured — add clients first")

    missing = [c["id"] for c in clients if not (DATA_DIR / c["id"] / "dataset.csv").exists()]
    if missing:
        raise HTTPException(400, f"missing datasets for: {missing} — run /data/generate first")

    training.config = req.model_dump()
    await flower.start(req, clients)
    return {"message": "training started", "clients": [c["id"] for c in clients]}


@router.post("/stop")
async def stop_training():
    if not training.running:
        raise HTTPException(400, "no training is running")
    await flower.stop()
    return {"message": "training stopped"}


@router.get("/status")
def training_status():
    data = flower.read_metrics()
    # Overlay any rounds received from the Worker via Kafka (authoritative source)
    data = kafka_sse.merge_into(data)
    data["config"] = training.config
    return data


@router.get("/logs")
def get_logs():
    """Return all current log entries from logs.jsonl as a JSON array."""
    if not flower.LOGS.exists():
        return []
    entries = []
    with open(flower.LOGS, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries


@router.post("/reset")
async def reset_training():
    """Delete all model files, datasets, and metrics. Keeps client configs intact."""
    import shutil

    if training.running:
        raise HTTPException(409, "stop training before resetting")

    removed = []

    # Model + metrics files in fl/output/
    out_dir = Path(__file__).parent.parent.parent.parent / "fl" / "output"
    for name in ("global_model.pt", "best_model.pt", "metrics.json", "logs.jsonl"):
        p = out_dir / name
        if p.exists():
            p.unlink()
            removed.append(name)

    # Datasets + per-client models in fl/data/{id}/
    for p in DATA_DIR.iterdir():
        if p.is_dir():
            for f in ("dataset.csv", "model.pt"):
                fp = p / f
                if fp.exists():
                    fp.unlink()
                    removed.append(f"{p.name}/{f}")

    # Reset in-memory training state
    training.config = None

    return {"message": "reset complete", "removed": removed}


_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.get("/kafka-stream")
async def kafka_metric_stream(request: Request):
    """SSE endpoint — pushes Kafka-sourced round metrics in real time."""
    return StreamingResponse(
        sse.kafka_stream(request),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/stream")
async def training_stream(request: Request, tail: bool = False):
    """SSE endpoint — tails logs.jsonl for training output."""
    return StreamingResponse(
        sse.log_stream(request, flower.LOGS, tail=tail),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
