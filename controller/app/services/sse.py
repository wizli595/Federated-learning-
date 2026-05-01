"""
sse.py — Server-Sent Events generators for training streams.

Two generators:
  - kafka_stream: pushes Kafka-sourced round metrics in real time
  - log_stream: tails logs.jsonl and pushes new lines as they appear

Both include heartbeat comments to keep connections alive through proxies.
"""

import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator

from starlette.requests import Request

from . import kafka_sse


async def kafka_stream(request: Request) -> AsyncGenerator[str, None]:
    """Yield SSE events from Kafka round metrics. Heartbeat every 15s."""
    q = kafka_sse.subscribe()
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                data = await asyncio.wait_for(q.get(), timeout=15.0)
                yield f"data: {json.dumps(data)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        kafka_sse.unsubscribe(q)


async def log_stream(
    request: Request,
    log_file: Path,
    tail: bool = False,
) -> AsyncGenerator[str, None]:
    """Yield SSE events by tailing a logs.jsonl file. Heartbeat every 0.3s."""
    last_pos = 0
    if tail and log_file.exists():
        try:
            last_pos = log_file.stat().st_size
        except OSError:
            pass

    while True:
        if await request.is_disconnected():
            break

        lines: list[str] = []
        if log_file.exists():
            try:
                with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                    f.seek(last_pos)
                    lines = f.readlines()
                    last_pos = f.tell()
            except OSError:
                pass

        for line in lines:
            line = line.strip()
            if line:
                yield f"data: {line}\n\n"

        if not lines:
            yield ": heartbeat\n\n"

        await asyncio.sleep(0.3)
