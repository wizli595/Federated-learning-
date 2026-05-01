"""
distributor.py — Model distribution and fine-tuning after training.
"""

import asyncio
import json
import shutil
import sys
from pathlib import Path
from typing import List

from .logs import append_log, drain_stdout

ROOT     = Path(__file__).parent.parent.parent.parent.parent
FL_DIR   = ROOT / "fl"
DATA_DIR = FL_DIR / "data"
OUT_DIR  = FL_DIR / "output"


def copy_model_to_clients() -> List[str]:
    """Copy best/global model to each client's data dir. Returns list of client IDs."""
    best_src   = OUT_DIR / "best_model.pt"
    latest_src = OUT_DIR / "global_model.pt"
    src = best_src if best_src.exists() else latest_src
    if not src.exists():
        return []

    label = "best checkpoint" if src == best_src else "final checkpoint"
    append_log("controller", f"distributing {label} ({src.name})")

    clients_dir = ROOT / "controller" / "app" / "clients"
    client_ids: List[str] = []
    for path in clients_dir.glob("*.json"):
        with open(path) as f:
            cid = json.load(f)["id"]
        dest = DATA_DIR / cid / "model.pt"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        msg = f"model ({label}) distributed -> {cid}"
        print(f"[controller] {msg}", flush=True)
        append_log("controller", msg)
        client_ids.append(cid)

    return client_ids


async def finetune_clients(client_ids: List[str], epochs: int) -> None:
    """Spawn one finetune.py subprocess per client; run all in parallel."""
    append_log(
        "controller",
        f"personalizing {len(client_ids)} client(s) — {epochs} fine-tune epoch(s) each…",
    )

    async def _one(cid: str) -> None:
        model_path = DATA_DIR / cid / "model.pt"
        data_path  = DATA_DIR / cid / "dataset.csv"
        if not data_path.exists() or not model_path.exists():
            append_log("controller", f"[{cid}] skipping fine-tune — missing data or model")
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
        await drain_stdout(proc, cid)
        await proc.wait()

    await asyncio.gather(*[_one(cid) for cid in client_ids])
    append_log("controller", "personalization complete — all client models updated")
