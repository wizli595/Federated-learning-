"""
worker/main.py — Composition Root.

Wires together health checks, HDFS init, handler discovery, and the Kafka
poll loop. Defines no logic — only imports, configures, and calls.

Adding new topics / handlers
-----------------------------
  - New message type  -> add a file to worker/handlers/, use @register("my_type")
  - New Kafka topic   -> add to SUBSCRIBED_TOPICS below + TOPICS in shared/schemas.py
  - No other changes  -> auto-discovered on next restart
"""

import logging
import os

logging.basicConfig(
    level    = logging.INFO,
    format   = "%(asctime)s [worker] %(levelname)s  %(name)s — %(message)s",
    datefmt  = "%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")
HDFS_URL        = os.getenv("HDFS_URL",        "http://hdfs-namenode:9870")

SUBSCRIBED_TOPICS = [
    "client.weights",   # FL clients -> Worker  (type: fl_weights)
    "fl.status",        # Controller -> Worker  (type: fl_status)
]


# ── Composition Root ───────────────────────────────────────────────────────────

def main() -> None:
    log.info("Worker starting")
    log.info("  KAFKA_BOOTSTRAP   = %s", KAFKA_BOOTSTRAP)
    log.info("  HDFS_URL          = %s", HDFS_URL)
    log.info("  SUBSCRIBED_TOPICS = %s", SUBSCRIBED_TOPICS)

    # 1 — block until Kafka + HDFS are healthy
    from worker.health import wait_for_services
    wait_for_services(KAFKA_BOOTSTRAP, HDFS_URL, SUBSCRIBED_TOPICS)

    # 2 — create HDFS directories
    try:
        from worker.hdfs_client import init_directories
        init_directories()
    except Exception as exc:
        log.warning("HDFS init failed (continuing without persistence): %s", exc)

    # 3 — auto-discover handlers
    import worker.handlers  # noqa: F401 — side-effect: registers @register decorators

    # 4 — log handler table
    from worker.router import registered_types
    log.info("Registered handlers: %s", registered_types())

    # 5 — subscribe and run
    from shared.kafka_utils import make_consumer, poll_loop
    from worker.router import dispatch

    consumer = make_consumer(
        group_id          = "fl-worker",
        topics            = SUBSCRIBED_TOPICS,
        auto_offset_reset = "latest",
    )
    log.info("Worker ready — listening on %s", SUBSCRIBED_TOPICS)
    poll_loop(consumer, dispatch)


if __name__ == "__main__":
    main()
