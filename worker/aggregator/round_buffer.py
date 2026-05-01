"""Thread-safe round buffer — collects submissions, runs FedAvg when complete."""

import logging
import threading
from typing import Dict

from worker.domain.fedavg import weighted_average_weights
from worker.domain.scalar_agg import weighted_average_scalars
from worker.domain.confusion import micro_confusion, clean_float

from .models import ClientSubmission, AggregationResult

log = logging.getLogger(__name__)


class RoundBuffer:
    """Collects submissions for one training round."""

    def __init__(self, round_num: int, expected_clients: int) -> None:
        self.round_num        = round_num
        self.expected_clients = expected_clients
        self._submissions: Dict[str, ClientSubmission] = {}
        self._lock = threading.Lock()

    def add(self, client_id: str, sub: ClientSubmission) -> bool:
        """Add a submission. Returns True when all expected clients have submitted."""
        with self._lock:
            self._submissions[client_id] = sub
            count = len(self._submissions)
        log.info("Round %d: received %d/%d client submissions",
                 self.round_num, count, self.expected_clients)
        return count >= self.expected_clients

    def fedavg(self) -> AggregationResult:
        """Run FedAvg using domain functions."""
        with self._lock:
            items = list(self._submissions.items())

        total = sum(s.num_samples for _, s in items)
        if total == 0:
            raise ValueError("Cannot aggregate — total_samples is 0")

        agg_weights = weighted_average_weights(items, total)
        avg_loss, avg_acc = weighted_average_scalars(items, total)
        precision, recall, f1, tp, fp, tn, fn = micro_confusion(items)

        per_client = {
            cid: {
                "loss":        clean_float(round(s.loss,      4)),
                "accuracy":    clean_float(round(s.accuracy,  4)),
                "spam_rate":   clean_float(round(s.spam_rate, 4)),
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
            avg_loss      = clean_float(round(avg_loss,  4)),
            avg_accuracy  = clean_float(round(avg_acc,   4)),
            precision     = clean_float(round(precision, 4)),
            recall        = clean_float(round(recall,    4)),
            f1            = clean_float(round(f1,        4)),
            tp=tp, fp=fp, tn=tn, fn=fn,
            per_client    = per_client,
        )
