"""
kafka_consumer.py — Async Kafka consumer for fl.metrics.

Long-running background task that polls Kafka and pushes received
MetricsMessages into the SSE state (kafka_sse module).

Uses non-blocking poll(0) + asyncio.sleep so we never block the event loop.
"""

from __future__ import annotations

import asyncio
import logging
import os

from . import kafka_sse
from .kafka_producer import is_enabled

log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP: str = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")


async def start() -> None:
    """Long-running asyncio task — polls fl.metrics and updates kafka_sse state."""
    if not is_enabled():
        log.warning("Kafka bridge disabled — consumer not started")
        return

    try:
        from shared.kafka_utils import make_consumer
        from shared.schemas import parse_message, MetricsMessage
    except Exception as exc:
        log.warning("Could not import kafka_utils — consumer not started: %s", exc)
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
            msg = consumer.poll(0)  # non-blocking
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
    """Process a raw Kafka message — store round data and broadcast to SSE clients."""
    parsed = parse_message(raw)
    if parsed is None:
        return

    if isinstance(parsed, MetricsMessage):
        round_data = {
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
            "source":       "kafka",
        }
        kafka_sse.store_round(parsed.round, round_data)
        kafka_sse.broadcast(round_data)
        log.info(
            "Kafka metric received: round=%d loss=%.4f acc=%.4f f1=%.4f",
            parsed.round, parsed.avg_loss, parsed.avg_accuracy, parsed.f1,
        )
