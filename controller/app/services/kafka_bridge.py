"""
kafka_bridge.py — Controller's Kafka integration.

PUBLISH side
  publish_status(status, ...) → sends StatusMessage to fl.status
  Called by flower.py on training start / stop / finish so the Worker
  knows how many clients to expect each round.

CONSUME side
  start_consumer() → async task; polls fl.metrics continuously.
  When the Worker publishes a MetricsMessage, we store it in
  _kafka_rounds so the /training/status endpoint can include it.

Graceful degradation
  If Kafka is unreachable (local dev without Docker) every call is a
  no-op and a warning is logged once.  The rest of the controller
  works exactly as before.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)

# ── Kafka config ───────────────────────────────────────────────────────────────

KAFKA_BOOTSTRAP: str = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")

# Add /app/fl to sys.path so we can import fl.shared.*
_FL_DIR = Path(__file__).parent.parent.parent.parent / "fl"
if str(_FL_DIR) not in sys.path:
    sys.path.insert(0, str(_FL_DIR))


# ── Shared in-memory state (updated by the consumer task) ─────────────────────

# round_num → round metrics dict (mirrors the structure in metrics.json)
_kafka_rounds: Dict[int, Dict[str, Any]] = {}
_kafka_enabled: bool = True   # set False after first import failure

# SSE subscriber queues — one per connected dashboard client
_sse_queues: List[asyncio.Queue] = []


def subscribe_metrics() -> asyncio.Queue:
    """Register a new SSE client; returns a queue that receives round dicts."""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_queues.append(q)
    return q


def unsubscribe_metrics(q: asyncio.Queue) -> None:
    """Remove a queue when the SSE client disconnects."""
    try:
        _sse_queues.remove(q)
    except ValueError:
        pass


def _broadcast_metric(round_data: Dict[str, Any]) -> None:
    """Push a new round to all active SSE subscribers (non-blocking)."""
    for q in list(_sse_queues):
        try:
            q.put_nowait(round_data)
        except asyncio.QueueFull:
            pass   # slow client — drop; it will catch up via polling


def get_kafka_rounds() -> Dict[int, Dict[str, Any]]:
    """Return a snapshot of all rounds received via Kafka."""
    return dict(_kafka_rounds)


def merge_kafka_into(file_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge Worker-sourced rounds into a metrics.json payload.
    Kafka data wins for any round it covers (more authoritative).
    """
    if not _kafka_rounds:
        return file_payload

    # Build a dict of existing file rounds by round number
    file_rounds: Dict[int, Dict] = {r["round"]: r for r in file_payload.get("rounds", [])}

    # Overlay Kafka rounds
    file_rounds.update(_kafka_rounds)

    file_payload["rounds"] = sorted(file_rounds.values(), key=lambda r: r["round"])
    return file_payload


# ── Producer (fire-and-forget) ─────────────────────────────────────────────────

_producer = None


def _get_producer():
    global _producer, _kafka_enabled
    if not _kafka_enabled:
        return None
    if _producer is not None:
        return _producer
    try:
        from shared.kafka_utils import make_producer
        _producer = make_producer(KAFKA_BOOTSTRAP)
        log.info("Kafka producer ready (%s)", KAFKA_BOOTSTRAP)
    except Exception as exc:
        log.warning("Kafka unavailable — bridge disabled: %s", exc)
        _kafka_enabled = False
    return _producer


def publish_status(
    status:        str,
    current_round: int = 0,
    total_rounds:  int = 0,
    num_clients:   int = 0,
    message:       str = "",
) -> None:
    """Publish a StatusMessage to fl.status (non-blocking, best-effort)."""
    prod = _get_producer()
    if prod is None:
        return
    try:
        from shared.schemas import StatusMessage
        from shared.kafka_utils import publish
        msg = StatusMessage(
            status        = status,
            current_round = current_round,
            total_rounds  = total_rounds,
            num_clients   = num_clients,
            message       = message,
        )
        publish(prod, "fl.status", msg.to_bytes())
        prod.poll(0)
        log.info("Published fl.status: status=%s clients=%d rounds=%d",
                 status, num_clients, total_rounds)
    except Exception as exc:
        log.warning("publish_status failed: %s", exc)


# ── Consumer (async background task) ──────────────────────────────────────────

async def start_consumer() -> None:
    """
    Long-running asyncio task.  Polls fl.metrics with a short timeout and
    updates _kafka_rounds when MetricsMessage arrives.

    Uses non-blocking poll(0) + asyncio.sleep so we never block the event loop.
    """
    global _kafka_enabled
    if not _kafka_enabled:
        log.warning("Kafka bridge disabled — consumer not started")
        return

    try:
        from shared.kafka_utils import make_consumer
        from shared.schemas import parse_message, MetricsMessage
    except Exception as exc:
        log.warning("Could not import kafka_utils — consumer not started: %s", exc)
        _kafka_enabled = False
        return

    consumer = None
    while consumer is None:
        try:
            consumer = make_consumer(
                group_id          = "fl-controller",
                topics            = ["fl.metrics", "fl.status"],
                bootstrap         = KAFKA_BOOTSTRAP,
                auto_offset_reset = "latest",
            )
            log.info("Kafka consumer started — subscribed to fl.metrics + fl.status")
        except Exception as exc:
            log.warning("Consumer connect failed, retrying in 10 s: %s", exc)
            await asyncio.sleep(10)

    try:
        while True:
            msg = consumer.poll(0)   # non-blocking
            if msg is not None and not msg.error():
                _handle_incoming(msg.value(), parse_message, MetricsMessage)
            await asyncio.sleep(0.2)
    except asyncio.CancelledError:
        log.info("Kafka consumer task cancelled")
    finally:
        try:
            consumer.close()
        except Exception:
            pass


def _handle_incoming(raw: bytes, parse_message, MetricsMessage) -> None:
    """Process a raw Kafka message from the consumer."""
    parsed = parse_message(raw)
    if parsed is None:
        return

    if isinstance(parsed, MetricsMessage):
        _kafka_rounds[parsed.round] = {
            "round":        parsed.round,
            "timestamp":    parsed.timestamp,
            "avg_loss":     parsed.avg_loss,
            "avg_accuracy": parsed.avg_accuracy,
            "precision":    parsed.precision,
            "recall":       parsed.recall,
            "f1":           parsed.f1,
            "tp":           parsed.tp,
            "fp":           parsed.fp,
            "tn":           parsed.tn,
            "fn":           parsed.fn,
            "clients":      parsed.clients,
            "source":       "kafka",    # lets dashboard know this came via Worker
        }
        log.info(
            "Kafka metric received: round=%d loss=%.4f acc=%.4f f1=%.4f",
            parsed.round, parsed.avg_loss, parsed.avg_accuracy, parsed.f1,
        )
        _broadcast_metric(_kafka_rounds[parsed.round])
