"""
logs.py — Shared log helpers for the Flower training lifecycle.

Writes structured JSON entries to logs.jsonl and drains subprocess stdout
into the same file for SSE streaming to the dashboard.
"""

import asyncio
import json
import time
from pathlib import Path

ROOT    = Path(__file__).parent.parent.parent.parent.parent
OUT_DIR = ROOT / "fl" / "output"
LOGS    = OUT_DIR / "logs.jsonl"
METRICS = OUT_DIR / "metrics.json"


def append_log(source: str, msg: str) -> None:
    """Append a JSON log entry to logs.jsonl (one per line)."""
    entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "source": source, "msg": msg}
    try:
        with open(LOGS, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError:
        pass


async def drain_stdout(proc: asyncio.subprocess.Process, source: str) -> None:
    """Read subprocess stdout line-by-line and forward to logs.jsonl."""
    if proc.stdout is None:
        return
    async for raw in proc.stdout:
        msg = raw.decode("utf-8", errors="replace").strip()
        if msg:
            append_log(source, msg)
