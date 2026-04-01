"""
handlers/fl_weights.py — Handle ClientWeightsMessage from FL clients.

Pipeline per message:
  1. Decode weights from base64 payload
  2. Store raw arrays in HDFS  (non-blocking — failure is logged, not fatal)
  3. Add to round buffer in the Aggregator
  4. If round is complete → FedAvg → store global weights in HDFS
                                    → publish GlobalWeightsMessage
                                    → publish MetricsMessage
"""

from __future__ import annotations

import logging

from fl.shared.schemas import ClientWeightsMessage

from worker.aggregator import ClientSubmission, aggregator
from worker.hdfs_client import store_client_weights, store_global_weights
from worker.producer import publish_global_weights, publish_metrics
from worker.router import register

log = logging.getLogger(__name__)


@register("fl_weights")
def handle_fl_weights(msg: ClientWeightsMessage) -> None:
    log.info(
        "fl_weights | client=%s round=%d samples=%d loss=%.4f acc=%.4f",
        msg.client_id, msg.round, msg.num_samples, msg.loss, msg.accuracy,
    )

    # 1 — decode weights
    weights = msg.decode_weights()

    # 2 — persist to HDFS (best-effort)
    store_client_weights(msg.round, msg.client_id, weights)

    # 3 — add to aggregation buffer
    submission = ClientSubmission(
        weights     = weights,
        num_samples = msg.num_samples,
        loss        = msg.loss,
        accuracy    = msg.accuracy,
        spam_rate   = msg.spam_rate,
        tp          = msg.tp,
        fp          = msg.fp,
        tn          = msg.tn,
        fn          = msg.fn,
    )

    result = aggregator.add(
        round_num  = msg.round,
        client_id  = msg.client_id,
        submission = submission,
    )

    if result is None:
        return   # still waiting for more clients

    # 4 — round complete: persist global weights + publish to Kafka

    store_global_weights(result.round_num, result.weights)

    publish_global_weights(
        round_num     = result.round_num,
        num_clients   = result.num_clients,
        total_samples = result.total_samples,
        weights       = result.weights,
    )

    publish_metrics(
        round_num    = result.round_num,
        avg_loss     = result.avg_loss,
        avg_accuracy = result.avg_accuracy,
        precision    = result.precision,
        recall       = result.recall,
        f1           = result.f1,
        tp           = result.tp,
        fp           = result.fp,
        tn           = result.tn,
        fn           = result.fn,
        per_client   = result.per_client,
    )

    log.info(
        "Round %d aggregated | loss=%.4f acc=%.4f f1=%.4f (prec=%.4f rec=%.4f)",
        result.round_num,
        result.avg_loss, result.avg_accuracy, result.f1,
        result.precision, result.recall,
    )
