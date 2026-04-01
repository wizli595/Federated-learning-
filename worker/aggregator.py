"""
aggregator.py — Thread-safe round buffer + FedAvg aggregation.

Each round collects ClientSubmission objects from all expected clients.
When the last client submits, fedavg() runs and returns the aggregated
weights plus micro-averaged metrics (precision/recall/F1).
"""

from __future__ import annotations

import logging
import math
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

log = logging.getLogger(__name__)


# ── Per-client submission ──────────────────────────────────────────────────────

@dataclass
class ClientSubmission:
    weights:     List[np.ndarray]
    num_samples: int
    loss:        float = 0.0
    accuracy:    float = 0.0
    spam_rate:   float = 0.0
    tp:          int   = 0
    fp:          int   = 0
    tn:          int   = 0
    fn:          int   = 0


# ── Aggregation result ─────────────────────────────────────────────────────────

@dataclass
class AggregationResult:
    round_num:     int
    num_clients:   int
    total_samples: int
    weights:       List[np.ndarray]
    avg_loss:      float
    avg_accuracy:  float
    precision:     float
    recall:        float
    f1:            float
    tp:            int
    fp:            int
    tn:            int
    fn:            int
    per_client:    Dict[str, dict]


# ── Round buffer ───────────────────────────────────────────────────────────────

class RoundBuffer:
    """Collects submissions for one training round."""

    def __init__(self, round_num: int, expected_clients: int) -> None:
        self.round_num        = round_num
        self.expected_clients = expected_clients
        self._submissions: Dict[str, ClientSubmission] = {}
        self._lock = threading.Lock()

    # ── public ────────────────────────────────────────────────────────────────

    def add(self, client_id: str, sub: ClientSubmission) -> bool:
        """Add a submission. Returns True when all expected clients have submitted."""
        with self._lock:
            self._submissions[client_id] = sub
            count = len(self._submissions)
        log.info("Round %d: received %d/%d client submissions",
                 self.round_num, count, self.expected_clients)
        return count >= self.expected_clients

    def fedavg(self) -> AggregationResult:
        """
        Weighted-average weights by num_samples (FedAvg).
        Micro-average TP/FP/TN/FN across clients for precision/recall/F1.
        """
        with self._lock:
            items = list(self._submissions.items())

        total = sum(s.num_samples for _, s in items)
        if total == 0:
            raise ValueError("Cannot aggregate — total_samples is 0")

        # ── FedAvg weights ────────────────────────────────────────────────────
        n_layers = len(items[0][1].weights)
        agg_weights: List[np.ndarray] = []
        for layer_i in range(n_layers):
            layer_agg = sum(
                s.weights[layer_i] * (s.num_samples / total)
                for _, s in items
            )
            agg_weights.append(layer_agg)

        # ── Weighted scalar metrics ───────────────────────────────────────────
        avg_loss = sum(s.loss     * s.num_samples for _, s in items) / total
        avg_acc  = sum(s.accuracy * s.num_samples for _, s in items) / total

        # ── Micro-averaged confusion matrix ───────────────────────────────────
        tp = sum(s.tp for _, s in items)
        fp = sum(s.fp for _, s in items)
        tn = sum(s.tn for _, s in items)
        fn = sum(s.fn for _, s in items)

        precision = tp / max(tp + fp, 1)
        recall    = tp / max(tp + fn, 1)
        f1        = (2 * precision * recall) / max(precision + recall, 1e-9)

        per_client = {
            cid: {
                "loss":        _clean(round(s.loss,      4)),
                "accuracy":    _clean(round(s.accuracy,  4)),
                "spam_rate":   _clean(round(s.spam_rate, 4)),
                "num_samples": s.num_samples,
                "tp": s.tp, "fp": s.fp, "tn": s.tn, "fn": s.fn,
            }
            for cid, s in items
        }

        return AggregationResult(
            round_num     = self.round_num,
            num_clients   = len(items),
            total_samples = total,
            weights       = agg_weights,
            avg_loss      = _clean(round(avg_loss,  4)),
            avg_accuracy  = _clean(round(avg_acc,   4)),
            precision     = _clean(round(precision, 4)),
            recall        = _clean(round(recall,    4)),
            f1            = _clean(round(f1,        4)),
            tp=tp, fp=fp, tn=tn, fn=fn,
            per_client    = per_client,
        )


# ── Aggregator (singleton state) ───────────────────────────────────────────────

class Aggregator:
    """
    Manages round buffers across multiple concurrent rounds.

    The Controller publishes a StatusMessage(status='training', num_clients=N)
    before training starts; the fl_status handler calls configure(N).
    """

    def __init__(self) -> None:
        self._expected_clients: int = 0
        self._rounds: Dict[int, RoundBuffer] = {}
        self._lock   = threading.Lock()

    def configure(self, num_clients: int) -> None:
        """Called when a new training session starts."""
        self._expected_clients = num_clients
        with self._lock:
            self._rounds.clear()
        log.info("Aggregator configured: expecting %d clients per round", num_clients)

    def add(
        self,
        round_num:   int,
        client_id:   str,
        submission:  ClientSubmission,
    ) -> Optional[AggregationResult]:
        """
        Add a submission for the given round.
        Returns an AggregationResult if this was the last expected submission,
        otherwise returns None.
        """
        if self._expected_clients == 0:
            log.warning(
                "Aggregator not configured — dropping submission from '%s' round %d. "
                "Wait for a StatusMessage(status='training', num_clients=N).",
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


# ── Module-level singleton ─────────────────────────────────────────────────────

aggregator = Aggregator()


# ── Helper ─────────────────────────────────────────────────────────────────────

def _clean(v: float) -> float:
    return 0.0 if (isinstance(v, float) and not math.isfinite(v)) else v
