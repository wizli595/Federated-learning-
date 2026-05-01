"""
health.py — Service health checks for Kafka and HDFS.

Called by main.py at startup to block until all dependencies are reachable.
Retries with configurable count and delay so transient Docker startup
ordering doesn't crash the worker.
"""

import logging
import sys
import time

log = logging.getLogger(__name__)


def check_kafka(bootstrap: str, required_topics: list) -> bool:
    """Return True if Kafka is reachable and all required topics exist."""
    from confluent_kafka.admin import AdminClient
    admin = AdminClient({"bootstrap.servers": bootstrap})
    meta = admin.list_topics(timeout=10)
    existing = set(meta.topics.keys())
    missing = set(required_topics) - existing
    if missing:
        log.warning("Kafka topics not yet visible: %s", missing)
        return False
    log.info("Kafka OK — topics: %s", sorted(existing))
    return True


def check_hdfs(hdfs_url: str) -> bool:
    """Return True if HDFS NameNode is reachable via WebHDFS."""
    from hdfs import InsecureClient
    client = InsecureClient(hdfs_url, user="root")
    client.status("/")
    log.info("HDFS OK — WebHDFS at %s", hdfs_url)
    return True


def wait_for_services(
    bootstrap: str,
    hdfs_url: str,
    required_topics: list,
    retries: int = 30,
    delay: int = 5,
) -> None:
    """Block until both Kafka and HDFS are healthy, or exit after retries."""
    for attempt in range(1, retries + 1):
        log.info("Health check %d/%d …", attempt, retries)
        kafka_ok = hdfs_ok = False
        try:
            kafka_ok = check_kafka(bootstrap, required_topics)
        except Exception as exc:
            log.warning("Kafka not ready: %s", exc)
        try:
            hdfs_ok = check_hdfs(hdfs_url)
        except Exception as exc:
            log.warning("HDFS not ready: %s", exc)
        if kafka_ok and hdfs_ok:
            return
        time.sleep(delay)
    log.error("Services did not become ready — exiting.")
    sys.exit(1)
