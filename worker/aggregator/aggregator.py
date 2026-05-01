"""Aggregator — manages round buffers across concurrent rounds."""

from __future__ import annotations

import logging
import threading
from typing import Dict, Optional

from .models import ClientSubmission, AggregationResult
from .round_buffer import RoundBuffer

log = logging.getLogger(__name__)


class Aggregator:
    """
    Manages round buffers across multiple concurrent rounds.

    The Controller publishes a StatusMessage(status='training', num_clients=N)
    before training starts; the fl_status handler calls configure(N).
    """

    def __init__(self) -> None:
        self._expected_clients: int = 0
        self._rounds: Dict[int, RoundBuffer] = {}
        self._lock = threading.Lock()

    def configure(self, num_clients: int) -> None:
        """Called when a new training session starts."""
        self._expected_clients = num_clients
        with self._lock:
            self._rounds.clear()
        log.info("Aggregator configured: expecting %d clients per round", num_clients)

    def add(
        self,
        round_num:  int,
        client_id:  str,
        submission: ClientSubmission,
    ) -> Optional[AggregationResult]:
        """Add a submission. Returns AggregationResult when round is complete."""
        if self._expected_clients == 0:
            log.warning(
                "Aggregator not configured — dropping submission from '%s' round %d.",
                client_id, round_num,
            )
            return None

        with self._lock:
            if round_num not in self._rounds:
                self._rounds[round_num] = RoundBuffer(round_num, self._expected_clients)
            buf = self._rounds[round_num]

        complete = buf.add(client_id, submission)
        if not complete:
            return None

        log.info("Round %d complete — running FedAvg over %d clients",
                 round_num, self._expected_clients)
        result = buf.fedavg()
        self.clear_round(round_num)
        return result

    def clear_round(self, round_num: int) -> None:
        with self._lock:
            self._rounds.pop(round_num, None)

    @property
    def expected_clients(self) -> int:
        return self._expected_clients
