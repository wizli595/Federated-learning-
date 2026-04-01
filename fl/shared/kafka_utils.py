"""
kafka_utils.py — Producer / consumer factory helpers.

Usage
-----
  from fl.shared.kafka_utils import make_producer, make_consumer, publish

  prod = make_producer()
  publish(prod, TOPICS["client_weights"], msg.to_bytes())

  cons = make_consumer(group_id="worker", topics=[TOPICS["client_weights"]])
  while True:
      msg = cons.poll(1.0)
      if msg: process(msg.value())
"""

import logging
import os
from typing import List, Optional

from confluent_kafka import Producer, Consumer, KafkaError, Message

from .schemas import TOPICS  # noqa: F401 — re-exported for convenience

log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")


# ── Producer ───────────────────────────────────────────────────────────────────

def make_producer(bootstrap: str = KAFKA_BOOTSTRAP) -> Producer:
    return Producer({
        "bootstrap.servers": bootstrap,
        "acks":              "all",        # wait for broker ack
        "retries":           5,
        "retry.backoff.ms":  500,
    })


def publish(
    producer: Producer,
    topic:    str,
    value:    bytes,
    key:      Optional[bytes] = None,
) -> None:
    """Fire-and-forget publish with delivery logging."""
    def _on_delivery(err: Optional[KafkaError], msg: Message) -> None:
        if err:
            log.error("Kafka delivery failed [%s]: %s", topic, err)
        else:
            log.debug("Delivered to %s [part=%d off=%d]",
                      msg.topic(), msg.partition(), msg.offset())

    producer.produce(topic, value=value, key=key, on_delivery=_on_delivery)
    producer.poll(0)   # trigger callbacks without blocking


def flush(producer: Producer, timeout: float = 10.0) -> None:
    """Wait for all queued messages to be delivered."""
    remaining = producer.flush(timeout)
    if remaining:
        log.warning("%d message(s) were NOT delivered before timeout", remaining)


# ── Consumer ───────────────────────────────────────────────────────────────────

def make_consumer(
    group_id:  str,
    topics:    List[str],
    bootstrap: str = KAFKA_BOOTSTRAP,
    auto_offset_reset: str = "latest",
) -> Consumer:
    cons = Consumer({
        "bootstrap.servers":  bootstrap,
        "group.id":           group_id,
        "auto.offset.reset":  auto_offset_reset,
        "enable.auto.commit": True,
    })
    cons.subscribe(topics)
    log.info("Consumer [%s] subscribed to: %s", group_id, topics)
    return cons


def poll_loop(consumer: Consumer, handler, poll_timeout: float = 1.0) -> None:
    """
    Blocking poll loop — calls handler(raw_bytes) for each message.
    Handles UNKNOWN_TOPIC_OR_PART and EOF gracefully.
    Exits on KeyboardInterrupt.
    """
    try:
        while True:
            msg = consumer.poll(poll_timeout)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                log.error("Consumer error: %s", msg.error())
                continue
            try:
                handler(msg.value())
            except Exception as exc:
                log.exception("Handler raised for msg on %s: %s", msg.topic(), exc)
    except KeyboardInterrupt:
        log.info("Consumer loop interrupted.")
    finally:
        consumer.close()
