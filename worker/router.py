"""
router.py — Type-router registry for Worker message handlers.

Usage
-----
  # Define a handler:
  from worker.router import register

  @register("my_type")
  def handle_my_type(msg: MyMessage) -> None:
      ...

  # Dispatch a raw Kafka message:
  from worker.router import dispatch
  dispatch(raw_bytes)

Extensibility
-------------
Any file in worker/handlers/ that uses @register() is auto-loaded by
handlers/__init__.py.  To add support for a new message type:
  1. Create  worker/handlers/my_type.py
  2. Decorate your function with  @register("my_type")
  3. No other changes needed — the handler is discovered automatically.

To add a new Kafka topic:
  1. Add the topic to fl/shared/schemas.py  TOPICS dict
  2. Add it to SUBSCRIBED_TOPICS in worker/main.py
  3. Add a handler file as above
"""

from __future__ import annotations

import logging
from typing import Callable, Dict

from fl.shared.schemas import BaseMessage, parse_message

log = logging.getLogger(__name__)

# ── Registry ───────────────────────────────────────────────────────────────────

_HANDLERS: Dict[str, Callable[[BaseMessage], None]] = {}


def register(type_name: str) -> Callable:
    """
    Decorator — register a function as the handler for messages of the given type.

    Example::

        @register("fl_weights")
        def handle_fl_weights(msg: ClientWeightsMessage) -> None:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        if type_name in _HANDLERS:
            log.warning("Handler for '%s' already registered — overwriting with %s",
                        type_name, fn.__name__)
        _HANDLERS[type_name] = fn
        log.info("Registered handler: '%s' → %s()", type_name, fn.__name__)
        return fn
    return decorator


def registered_types() -> list[str]:
    """Return all currently registered message types."""
    return list(_HANDLERS.keys())


# ── Dispatch ───────────────────────────────────────────────────────────────────

def dispatch(raw: bytes) -> None:
    """
    Parse raw Kafka bytes into a typed message, then call the matching handler.
    Unknown types are logged at DEBUG level and silently dropped.
    Handler exceptions are caught and logged so the consumer loop never dies.
    """
    msg = parse_message(raw)

    if msg is None:
        log.debug("Could not parse message — bad JSON or unknown type")
        return

    handler = _HANDLERS.get(msg.type)
    if handler is None:
        log.debug("No handler registered for type '%s' — dropping", msg.type)
        return

    try:
        handler(msg)
    except Exception:
        log.exception("Handler for '%s' raised an exception", msg.type)
