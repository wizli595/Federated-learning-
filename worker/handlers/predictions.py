"""
handlers/predictions.py — Handle inference result messages (future use).

Stub handler for a 'predictions' message type that clients could publish
after running local inference — useful for audit trails, A/B comparisons,
or federated evaluation without sending raw emails.

To activate:
  1. Add a 'predictions' type to fl/shared/schemas.py
  2. Have FL clients publish PredictionMessage after classify()
  3. Implement the storage/forwarding logic below
"""

from __future__ import annotations

import logging

from fl.shared.schemas import BaseMessage

from worker.router import register

log = logging.getLogger(__name__)


@register("predictions")
def handle_predictions(msg: BaseMessage) -> None:
    # Stub — log and discard until the schema + storage are defined
    log.debug("predictions | received (not yet implemented): %s", vars(msg))
