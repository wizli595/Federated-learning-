"""
handlers/fl_status.py — Handle StatusMessage from the Controller.

On status='training': configure the Aggregator with the expected
client count so it knows when a round is complete.

On status='finished': flush the Kafka producer and log a summary.
"""

from __future__ import annotations

import logging

from fl.shared.schemas import StatusMessage

from worker.aggregator import aggregator
from worker.producer import flush_producer
from worker.router import register

log = logging.getLogger(__name__)


@register("fl_status")
def handle_fl_status(msg: StatusMessage) -> None:
    log.info(
        "fl_status | status=%s round=%d/%d clients=%d",
        msg.status, msg.current_round, msg.total_rounds, msg.num_clients,
    )

    if msg.status == "training" and msg.num_clients > 0:
        aggregator.configure(num_clients=msg.num_clients)

    elif msg.status == "finished":
        log.info("Training finished — flushing producer")
        flush_producer()

    elif msg.status == "idle":
        log.debug("System idle — no action needed")
