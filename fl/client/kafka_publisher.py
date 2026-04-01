"""
kafka_publisher.py — Kafka publish helper for FL clients.

After local training + DP, the client publishes a ClientWeightsMessage
to the client.weights topic in addition to returning via Flower gRPC.

Design principles
-----------------
- Lazy producer: created on first publish, reused across all rounds.
- Best-effort: any exception is caught and logged; the Flower gRPC path
  is NEVER affected by a Kafka failure.
- Disabled automatically if confluent_kafka is not installed or if
  KAFKA_BOOTSTRAP is unreachable on first connect.
- Key = client_id bytes so Kafka routes each client to the same
  partition (ordered per-client delivery).
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import List

import numpy as np

log = logging.getLogger(__name__)

# Make fl/shared importable from within fl/client/
_FL_DIR = Path(__file__).parent.parent
if str(_FL_DIR) not in sys.path:
    sys.path.insert(0, str(_FL_DIR))

KAFKA_BOOTSTRAP: str = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")

_producer = None
_enabled  = True   # flipped False on first import/connect failure


def _get_producer():
    global _producer, _enabled
    if not _enabled:
        return None
    if _producer is not None:
        return _producer
    try:
        from shared.kafka_utils import make_producer
        _producer = make_producer(KAFKA_BOOTSTRAP)
        log.info("Kafka producer ready for FL client (bootstrap=%s)", KAFKA_BOOTSTRAP)
    except Exception as exc:
        log.warning(
            "Kafka unavailable — client will publish via Flower only. Error: %s", exc
        )
        _enabled = False
    return _producer


def publish_weights(
    client_id:   str,
    round_num:   int,
    num_samples: int,
    weights:     List[np.ndarray],   # already DP-noised
    loss:        float = 0.0,
    accuracy:    float = 0.0,
    spam_rate:   float = 0.0,
    tp: int = 0,
    fp: int = 0,
    tn: int = 0,
    fn: int = 0,
) -> None:
    """
    Publish DP-noised weights + metrics to Kafka client.weights (best-effort).

    Called from EmailSpamClient.fit() after privatize_weights().
    The Flower gRPC return happens regardless of what this function does.
    """
    prod = _get_producer()
    if prod is None:
        return

    try:
        from shared.schemas    import ClientWeightsMessage
        from shared.kafka_utils import publish, TOPICS

        msg = ClientWeightsMessage.build(
            client_id   = client_id,
            round       = round_num,
            num_samples = num_samples,
            weights     = weights,
            loss        = loss,
            accuracy    = accuracy,
            spam_rate   = spam_rate,
            tp=tp, fp=fp, tn=tn, fn=fn,
        )

        publish(
            prod,
            TOPICS["client_weights"],
            msg.to_bytes(),
            key=client_id.encode(),   # same client always → same partition
        )
        prod.poll(0)   # trigger delivery callback without blocking

        log.info(
            "[%s] Kafka: published weights round=%d samples=%d loss=%.4f acc=%.4f",
            client_id, round_num, num_samples, loss, accuracy,
        )

    except Exception as exc:
        # Never let Kafka errors surface to Flower
        log.warning("[%s] Kafka publish failed (Flower path unaffected): %s", client_id, exc)
