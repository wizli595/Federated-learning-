"""
metrics.py — Write and read fl/output/metrics.json.
The controller polls this file to stream live training progress.
"""

import json
import time
from pathlib import Path
from typing import Dict, List

OUTPUT_DIR   = Path(__file__).parent.parent / "output"
METRICS_FILE = OUTPUT_DIR / "metrics.json"


class MetricsWriter:
    def __init__(self, total_rounds: int):
        self.total_rounds = total_rounds
        self._history: List[Dict] = []
        self._started_at = time.strftime("%Y-%m-%dT%H:%M:%S")
        OUTPUT_DIR.mkdir(exist_ok=True)
        self._save("waiting", 0)

    def record(self, server_round: int, results) -> None:
        """Compute weighted averages from client results and append to history."""
        total, w_loss, w_acc = 0, 0.0, 0.0
        clients_data: Dict[str, Dict] = {}

        for client_proxy, fit_res in results:
            cid  = fit_res.metrics.get("client_id", client_proxy.cid)
            n    = fit_res.num_examples
            loss = float(fit_res.metrics.get("loss", 0.0))
            acc  = float(fit_res.metrics.get("accuracy", 0.0))
            spam = float(fit_res.metrics.get("spam_rate", 0.0))

            clients_data[cid] = {
                "loss":        self._clean(round(loss, 4)),
                "accuracy":    self._clean(round(acc,  4)),
                "spam_rate":   self._clean(round(spam, 4)),
                "num_samples": n,
            }
            total  += n
            w_loss += loss * n
            w_acc  += acc  * n

        self._history.append({
            "round":        server_round,
            "timestamp":    time.strftime("%Y-%m-%dT%H:%M:%S"),
            "avg_loss":     self._clean(round(w_loss / max(total, 1), 4)),
            "avg_accuracy": self._clean(round(w_acc  / max(total, 1), 4)),
            "clients":      clients_data,
        })

        status = "finished" if server_round >= self.total_rounds else "training"
        self._save(status, server_round)

    @staticmethod
    def _clean(v):
        """Replace NaN/Inf with 0 so json.dump never raises."""
        import math
        return 0.0 if (isinstance(v, float) and not math.isfinite(v)) else v

    def _save(self, status: str, current_round: int) -> None:
        with open(METRICS_FILE, "w") as f:
            json.dump({
                "status":           status,
                "current_round":    current_round,
                "total_rounds":     self.total_rounds,
                "rounds":           self._history,
                "started_at":       self._started_at,
                "model_distributed": False,
            }, f, indent=2)
