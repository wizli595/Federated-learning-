"""
kafka_sse.py — SSE subscriber state for real-time Kafka metrics.

Manages per-dashboard-client queues and the round data cache.
The consumer pushes into these queues; the SSE endpoints drain them.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

# round_num → round metrics dict (mirrors metrics.json structure)
_kafka_rounds: Dict[int, Dict[str, Any]] = {}

# SSE subscriber queues — one per connected dashboard client
_sse_queues: List[asyncio.Queue] = []


def subscribe() -> asyncio.Queue:
    """Register a new SSE client; returns a queue that receives round dicts."""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_queues.append(q)
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    """Remove a queue when the SSE client disconnects."""
    try:
        _sse_queues.remove(q)
    except ValueError:
        pass


def broadcast(round_data: Dict[str, Any]) -> None:
    """Push a new round to all active SSE subscribers (non-blocking)."""
    for q in list(_sse_queues):
        try:
            q.put_nowait(round_data)
        except asyncio.QueueFull:
            pass  # slow client — drop; it will catch up via polling


def store_round(round_num: int, data: Dict[str, Any]) -> None:
    """Cache a round received from Kafka."""
    _kafka_rounds[round_num] = data


def get_rounds() -> Dict[int, Dict[str, Any]]:
    """Return a snapshot of all rounds received via Kafka."""
    return dict(_kafka_rounds)


def merge_into(file_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge Worker-sourced rounds into a metrics.json payload.
    Kafka data wins for any round it covers (more authoritative).
    """
    if not _kafka_rounds:
        return file_payload

    file_rounds: Dict[int, Dict] = {r["round"]: r for r in file_payload.get("rounds", [])}
    file_rounds.update(_kafka_rounds)
    file_payload["rounds"] = sorted(file_rounds.values(), key=lambda r: r["round"])
    return file_payload
