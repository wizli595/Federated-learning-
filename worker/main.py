"""
worker/main.py — Worker service entry point.

Start-up sequence
-----------------
1. Wait for Kafka + HDFS to be healthy
2. Initialise HDFS base directories (/fl/weights, /fl/global)
3. Import worker.handlers (auto-discovers and registers all @register handlers)
4. Log the registered handler table
5. Subscribe to Kafka topics and run the dispatch loop forever

Adding new topics / handlers
-----------------------------
  • New message type  → add a file to worker/handlers/, use @register("my_type")
  • New Kafka topic   → add to SUBSCRIBED_TOPICS below + TOPICS in fl/shared/schemas.py
  • No other changes  → auto-discovered on next restart
"""

import logging
import os
import sys
import time

logging.basicConfig(
    level    = logging.INFO,
    format   = "%(asctime)s [worker] %(levelname)s  %(name)s — %(message)s",
    datefmt  = "%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")
HDFS_URL        = os.getenv("HDFS_URL",        "http://hdfs-namenode:9870")

# ── Topics the Worker consumes ─────────────────────────────────────────────────
# Add a topic here + add a handler in worker/handlers/ to handle its messages.
SUBSCRIBED_TOPICS = [
    "client.weights",   # FL clients → Worker  (type: fl_weights)
    "fl.status",        # Controller → Worker  (type: fl_status)
    # "fl.metrics",     # uncomment to audit own published metrics
    # "my.new.topic",   # add topics here as the system grows
]


# ── Health checks ──────────────────────────────────────────────────────────────

def _check_kafka() -> bool:
    from confluent_kafka.admin import AdminClient
    admin = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})
    meta  = admin.list_topics(timeout=10)
    required = set(SUBSCRIBED_TOPICS)
    existing = set(meta.topics.keys())
    missing  = required - existing
    if missing:
        log.warning("Kafka topics not yet visible: %s", missing)
        return False
    log.info("Kafka OK — topics: %s", sorted(existing))
    return True


def _check_hdfs() -> bool:
    from hdfs import InsecureClient
    client = InsecureClient(HDFS_URL, user="root")
    client.status("/")
    log.info("HDFS OK — WebHDFS at %s", HDFS_URL)
    return True


def wait_for_services(retries: int = 30, delay: int = 5) -> None:
    for attempt in range(1, retries + 1):
        log.info("Health check %d/%d …", attempt, retries)
        kafka_ok = hdfs_ok = False
        try:
            kafka_ok = _check_kafka()
        except Exception as exc:
            log.warning("Kafka not ready: %s", exc)
        try:
            hdfs_ok = _check_hdfs()
        except Exception as exc:
            log.warning("HDFS not ready: %s", exc)
        if kafka_ok and hdfs_ok:
            return
        time.sleep(delay)
    log.error("Services did not become ready — exiting.")
    sys.exit(1)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("Worker starting")
    log.info("  KAFKA_BOOTSTRAP  = %s", KAFKA_BOOTSTRAP)
    log.info("  HDFS_URL         = %s", HDFS_URL)
    log.info("  SUBSCRIBED_TOPICS = %s", SUBSCRIBED_TOPICS)

    # 1 — wait for dependencies
    wait_for_services()

    # 2 — initialise HDFS directories
    try:
        from worker.hdfs_client import init_directories
        init_directories()
    except Exception as exc:
        log.warning("HDFS init failed (continuing without HDFS persistence): %s", exc)

    # 3 — auto-discover and register all handlers
    import worker.handlers  # noqa — side-effect: registers all @register decorators

    # 4 — log the handler table
    from worker.router import registered_types
    log.info("Registered handlers: %s", registered_types())

    # 5 — subscribe and run dispatch loop
    from fl.shared.kafka_utils import make_consumer, poll_loop
    from worker.router import dispatch

    consumer = make_consumer(
        group_id           = "fl-worker",
        topics             = SUBSCRIBED_TOPICS,
        auto_offset_reset  = "latest",
    )

    log.info("Worker ready — listening on %s", SUBSCRIBED_TOPICS)
    poll_loop(consumer, dispatch)


if __name__ == "__main__":
    main()
