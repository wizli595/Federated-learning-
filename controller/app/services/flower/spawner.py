"""
spawner.py — Subprocess spawning for Flower server and clients.
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List

from .logs import drain_stdout

ROOT     = Path(__file__).parent.parent.parent.parent.parent
FL_DIR   = ROOT / "fl"
DATA_DIR = FL_DIR / "data"


async def spawn_server(req) -> asyncio.subprocess.Process:
    """Spawn the Flower gRPC server as a subprocess."""
    proc = await asyncio.create_subprocess_exec(
        sys.executable, str(FL_DIR / "server" / "main.py"),
        "--rounds",        str(req.rounds),
        "--min-clients",   str(req.min_clients),
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
    asyncio.create_task(drain_stdout(proc, "server"))
    return proc


async def spawn_clients(
    clients: List[Dict],
    port: int,
) -> List[asyncio.subprocess.Process]:
    """Spawn one Flower client subprocess per config dict."""
    procs = []
    for client in clients:
        cid = client["id"]
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(FL_DIR / "client" / "main.py"),
            "--client-id", cid,
            "--data-path", str(DATA_DIR / cid / "dataset.csv"),
            "--server",    f"127.0.0.1:{port}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        procs.append(proc)
        asyncio.create_task(drain_stdout(proc, cid))
    return procs
