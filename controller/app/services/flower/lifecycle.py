"""
lifecycle.py — Flower training lifecycle orchestration.

start() / stop() / read_metrics() are the public API.
Delegates spawning to spawner.py and distribution to distributor.py.
"""

import asyncio
import json
import time
from typing import Dict, List

from ...state import training
from ... import db
from .. import kafka_producer
from .logs import append_log, LOGS, METRICS, OUT_DIR
from .spawner import spawn_server, spawn_clients
from .distributor import copy_model_to_clients, finetune_clients

ROOT = LOGS.parent.parent.parent  # repo root


async def start(req, clients: List[Dict]) -> None:
    """Spawn Flower server then one client process per config dict."""
    OUT_DIR.mkdir(exist_ok=True)
    LOGS.write_text("", encoding="utf-8")

    req.min_clients = min(req.min_clients, len(clients))
    training.server_process = await spawn_server(req)

    await asyncio.sleep(2)  # let server bind the port

    training.client_processes = await spawn_clients(clients, req.port)
    training.running = True
    asyncio.create_task(_watch_and_distribute())

    kafka_producer.publish_status(
        status="training", current_round=0,
        total_rounds=req.rounds, num_clients=len(clients),
        message="training started",
    )


async def stop() -> None:
    """Kill all Flower subprocesses."""
    for proc in training.client_processes:
        try:
            proc.kill()
        except Exception:
            pass
    if training.server_process:
        try:
            training.server_process.kill()
        except Exception:
            pass
    training.running = False
    training.client_processes = []
    training.server_process = None

    append_log("controller", "Training stopped by user")
    kafka_producer.publish_status(status="idle", message="stopped by user")

    if METRICS.exists():
        try:
            with open(METRICS) as f:
                m = json.load(f)
            m["status"] = "idle"
            with open(METRICS, "w") as f:
                json.dump(m, f, indent=2)
        except Exception:
            pass


def read_metrics() -> Dict:
    """Return current metrics.json content, or an idle placeholder."""
    if not METRICS.exists():
        return {
            "status": "idle", "current_round": 0, "total_rounds": 0,
            "rounds": [], "model_distributed": False,
        }
    with open(METRICS) as f:
        return json.load(f)


async def _watch_and_distribute() -> None:
    """Wait for Flower server to exit, distribute model, then save run to DB."""
    if training.server_process:
        await training.server_process.wait()
    training.running = False

    client_ids = copy_model_to_clients()

    finetune_epochs = int((training.config or {}).get("finetune_epochs", 0))
    if finetune_epochs > 0 and client_ids:
        await finetune_clients(client_ids, finetune_epochs)

    _finalise_run()


def _finalise_run() -> None:
    """Mark model as distributed in metrics.json and save run to DB."""
    if not METRICS.exists():
        return

    with open(METRICS) as f:
        metrics = json.load(f)

    finetune_epochs = int((training.config or {}).get("finetune_epochs", 0))
    metrics["model_distributed"] = True
    metrics["finetuning_complete"] = finetune_epochs > 0
    metrics["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")

    with open(METRICS, "w") as f:
        json.dump(metrics, f, indent=2)

    append_log("controller", "Training complete — model distributed to all clients")
    kafka_producer.publish_status(status="finished", message="model distributed")

    if training.config:
        clients_dir = ROOT / "controller" / "app" / "clients"
        num_clients = len(list(clients_dir.glob("*.json")))
        db.save_run(training.config, metrics, num_clients)
        append_log("controller", "Run saved to experiment history")
        print("[controller] run saved to experiments DB", flush=True)
