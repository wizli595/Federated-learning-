"""
producer.py — Singleton Kafka producer + typed publish helpers.

All Worker→Kafka writes go through this module so there is a single
producer instance (thread-safe in confluent-kafka).
"""

from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np

from fl.shared.kafka_utils import make_producer, publish, flush, TOPICS
from fl.shared.schemas import GlobalWeightsMessage, MetricsMessage

log = logging.getLogger(__name__)

_producer = None


def get_producer():
    global _producer
    if _producer is None:
        _producer = make_producer()
        log.info("Kafka producer created")
    return _producer


# ── Typed publish helpers ──────────────────────────────────────────────────────

def publish_global_weights(
    round_num:     int,
    num_clients:   int,
    total_samples: int,
    weights:       List[np.ndarray],
) -> None:
    """Publish aggregated global weights to global.weights topic."""
    msg = GlobalWeightsMessage.build(
        round=round_num,
        num_clients=num_clients,
        total_samples=total_samples,
        weights=weights,
    )
    publish(get_producer(), TOPICS["global_weights"], msg.to_bytes())
    log.info("Published GlobalWeightsMessage round=%d clients=%d samples=%d",
             round_num, num_clients, total_samples)


def publish_metrics(
    round_num:    int,
    avg_loss:     float,
    avg_accuracy: float,
    precision:    float,
    recall:       float,
    f1:           float,
    tp: int, fp: int, tn: int, fn: int,
    per_client:   Dict[str, dict],
) -> None:
    """Publish aggregated round metrics to fl.metrics topic."""
    msg = MetricsMessage(
        round        = round_num,
        avg_loss     = avg_loss,
        avg_accuracy = avg_accuracy,
        precision    = precision,
        recall       = recall,
        f1           = f1,
        tp=tp, fp=fp, tn=tn, fn=fn,
        clients      = per_client,
    )
    publish(get_producer(), TOPICS["metrics"], msg.to_bytes())
    log.info(
        "Published MetricsMessage round=%d loss=%.4f acc=%.4f f1=%.4f",
        round_num, avg_loss, avg_accuracy, f1,
    )


def flush_producer(timeout: float = 10.0) -> None:
    if _producer is not None:
        flush(_producer, timeout)
