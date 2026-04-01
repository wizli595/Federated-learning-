"""
handlers/fl_metrics.py — Handle MetricsMessage (echo/audit handler).

The Worker itself publishes MetricsMessages to fl.metrics.
This handler runs if the Worker also consumes from fl.metrics
(e.g. for auditing or forwarding to a time-series store).

Currently: logs the round summary.
Future:    write to InfluxDB / Prometheus push-gateway / HDFS audit log.
"""

from __future__ import annotations

import logging

from fl.shared.schemas import MetricsMessage

from worker.router import register

log = logging.getLogger(__name__)


@register("fl_metrics")
def handle_fl_metrics(msg: MetricsMessage) -> None:
    log.info(
        "fl_metrics | round=%d loss=%.4f acc=%.4f "
        "precision=%.4f recall=%.4f f1=%.4f "
        "TP=%d FP=%d TN=%d FN=%d",
        msg.round,
        msg.avg_loss, msg.avg_accuracy,
        msg.precision, msg.recall, msg.f1,
        msg.tp, msg.fp, msg.tn, msg.fn,
    )
