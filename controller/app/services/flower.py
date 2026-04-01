"""
flower.py — Flower subprocess lifecycle management.
Spawn server + clients, drain their stdout → logs.jsonl for SSE streaming,
watch for completion, distribute the trained model, and persist the run to DB.
"""

import asyncio
import json
import shutil
import sys
import time
from pathlib import Path
from typing import Dict, List

from ..state import training
from .. import db
from . import kafka_bridge

ROOT     = Path(__file__).parent.parent.parent.parent
FL_DIR   = ROOT / "fl"
DATA_DIR = FL_DIR / "data"
OUT_DIR  = FL_DIR / "output"
METRICS  = OUT_DIR / "metrics.json"
LOGS     = OUT_DIR / "logs.jsonl"


# ── Log helpers ────────────────────────────────────────────────────────────────

def _append_log(source: str, msg: str) -> None:
    """Append a JSON log entry to logs.jsonl (one per line)."""
    entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "source": source, "msg": msg}
    try:
        with open(LOGS, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError:
        pass


async def _drain_stdout(proc: asyncio.subprocess.Process, source: str) -> None:
    """Read subprocess stdout line-by-line and forward to logs.jsonl."""
    if proc.stdout is None:
        return
    async for raw in proc.stdout:
        msg = raw.decode("utf-8", errors="replace").strip()
        if msg:
            _append_log(source, msg)


# ── Start ──────────────────────────────────────────────────────────────────────

async def start(req, clients: List[Dict]) -> None:
    """Spawn Flower server then one client process per config dict."""
    OUT_DIR.mkdir(exist_ok=True)
    # Clear previous run's logs
    LOGS.write_text("", encoding="utf-8")

    server_proc = await asyncio.create_subprocess_exec(
        sys.executable, str(FL_DIR / "server" / "main.py"),
        "--rounds",        str(req.rounds),
        "--min-clients",   str(min(req.min_clients, len(clients))),
        "--local-epochs",  str(req.local_epochs),
        "--learning-rate", str(req.learning_rate),
        "--algorithm",     req.algorithm,
        "--mu",            str(req.mu),
        "--clip-norm",     str(req.clip_norm),
        "--noise-mult",    str(req.noise_mult),
        "--port",          str(req.port),
        "--lr-schedule",   req.lr_schedule,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    training.server_process = server_proc
    asyncio.create_task(_drain_stdout(server_proc, "server"))

    await asyncio.sleep(2)  # let server bind the port

    for client in clients:
        cid  = client["id"]
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(FL_DIR / "client" / "main.py"),
            "--client-id", cid,
            "--data-path", str(DATA_DIR / cid / "dataset.csv"),
            "--server",    f"127.0.0.1:{req.port}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        training.client_processes.append(proc)
        asyncio.create_task(_drain_stdout(proc, cid))

    training.running = True
    asyncio.create_task(_watch_and_distribute())

    # Notify Worker: how many clients to expect per round
    kafka_bridge.publish_status(
        status        = "training",
        current_round = 0,
        total_rounds  = req.rounds,
        num_clients   = len(clients),
        message       = "training started",
    )


# ── Stop ───────────────────────────────────────────────────────────────────────

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
    training.running          = False
    training.client_processes = []
    training.server_process   = None

    _append_log("controller", "Training stopped by user")
    kafka_bridge.publish_status(status="idle", message="stopped by user")

    if METRICS.exists():
        try:
            with open(METRICS) as f:
                m = json.load(f)
            m["status"] = "idle"
            with open(METRICS, "w") as f:
                json.dump(m, f, indent=2)
        except Exception:
            pass


# ── Status ─────────────────────────────────────────────────────────────────────

def read_metrics() -> Dict:
    """Return current metrics.json content, or an idle placeholder."""
    if not METRICS.exists():
        return {
            "status": "idle", "current_round": 0, "total_rounds": 0,
            "rounds": [], "model_distributed": False,
        }
    with open(METRICS) as f:
        return json.load(f)


# ── Background watcher ─────────────────────────────────────────────────────────

async def _watch_and_distribute() -> None:
    """Wait for Flower server to exit, distribute model, then save run to DB."""
    if training.server_process:
        await training.server_process.wait()
    training.running = False
    await _distribute_model()
    _finalise_run()


async def _distribute_model() -> None:
    # Prefer best_model.pt (peak accuracy round) over global_model.pt (last round)
    # This prevents a late-round cosine-LR collapse from reaching clients.
    best_src   = OUT_DIR / "best_model.pt"
    latest_src = OUT_DIR / "global_model.pt"
    src        = best_src if best_src.exists() else latest_src
    if not src.exists():
        return

    label = "best checkpoint" if src == best_src else "final checkpoint"
    _append_log("controller", f"distributing {label} ({src.name})")

    clients_dir = ROOT / "controller" / "app" / "clients"
    client_ids: List[str] = []
    for path in clients_dir.glob("*.json"):
        with open(path) as f:
            cid = json.load(f)["id"]
        dest = DATA_DIR / cid / "model.pt"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        msg = f"model ({label}) distributed → {cid}"
        print(f"[controller] {msg}", flush=True)
        _append_log("controller", msg)
        client_ids.append(cid)

    # Per-client fine-tuning: adapt the global model to each client's local data
    finetune_epochs = int((training.config or {}).get("finetune_epochs", 0))
    if finetune_epochs > 0 and client_ids:
        await _finetune_clients(client_ids, finetune_epochs)


async def _finetune_clients(client_ids: List[str], epochs: int) -> None:
    """Spawn one finetune.py subprocess per client; run all in parallel."""
    _append_log(
        "controller",
        f"personalizing {len(client_ids)} client(s) — {epochs} fine-tune epoch(s) each…",
    )

    async def _one(cid: str) -> None:
        model_path = DATA_DIR / cid / "model.pt"
        data_path  = DATA_DIR / cid / "dataset.csv"
        if not data_path.exists() or not model_path.exists():
            _append_log("controller", f"[{cid}] skipping fine-tune — missing data or model")
            return
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(FL_DIR / "client" / "finetune.py"),
            "--client-id",  cid,
            "--data-path",  str(data_path),
            "--model-path", str(model_path),
            "--epochs",     str(epochs),
            "--lr",         "0.001",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        await _drain_stdout(proc, cid)
        await proc.wait()

    await asyncio.gather(*[_one(cid) for cid in client_ids])
    _append_log("controller", "personalization complete — all client models updated")


def _finalise_run() -> None:
    """Mark model as distributed in metrics.json and save run to DB."""
    if not METRICS.exists():
        return

    with open(METRICS) as f:
        metrics = json.load(f)

    finetune_epochs = int((training.config or {}).get("finetune_epochs", 0))
    metrics["model_distributed"]   = True
    metrics["finetuning_complete"] = finetune_epochs > 0
    metrics["finished_at"]         = time.strftime("%Y-%m-%dT%H:%M:%S")

    with open(METRICS, "w") as f:
        json.dump(metrics, f, indent=2)

    _append_log("controller", "Training complete — model distributed to all clients")
    kafka_bridge.publish_status(status="finished", message="model distributed")

    if training.config:
        clients_dir = ROOT / "controller" / "app" / "clients"
        num_clients = len(list(clients_dir.glob("*.json")))
        db.save_run(training.config, metrics, num_clients)
        _append_log("controller", "Run saved to experiment history")
        print("[controller] run saved to experiments DB", flush=True)
