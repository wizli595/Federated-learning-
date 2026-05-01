"""
kafka_producer.py — Fire-and-forget Kafka publisher for the Controller.

Publishes StatusMessages to fl.status so the Worker knows when
training starts/stops and how many clients to expect per round.

Graceful degradation: if Kafka is unreachable, all calls are no-ops.
"""

from __future__ import annotations

import logging
import os

log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP: str = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")

_producer = None
_enabled: bool = True


def _get_producer():
    global _producer, _enabled
    if not _enabled:
        return None
    if _producer is not None:
        return _producer
    try:
        from shared.kafka_utils import make_producer
        _producer = make_producer(KAFKA_BOOTSTRAP)
        log.info("Kafka producer ready (%s)", KAFKA_BOOTSTRAP)
    except Exception as exc:
        log.warning("Kafka unavailable — producer disabled: %s", exc)
        _enabled = False
    return _producer


def is_enabled() -> bool:
    return _enabled


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
