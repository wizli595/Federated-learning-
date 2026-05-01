"""MetricsWriter — thin I/O shell that delegates aggregation to pure functions."""

import json
import time
from pathlib import Path
from typing import Dict, List

from .aggregation import aggregate_fit_results, aggregate_eval_results

OUTPUT_DIR   = Path(__file__).parent.parent.parent / "output"
METRICS_FILE = OUTPUT_DIR / "metrics.json"


class MetricsWriter:
    def __init__(self, total_rounds: int):
        self.total_rounds   = total_rounds
        self._history: List[Dict]      = []
        self._eval_history: List[Dict] = []
        self._started_at = time.strftime("%Y-%m-%dT%H:%M:%S")
        OUTPUT_DIR.mkdir(exist_ok=True)
        self._save("waiting", 0)

    def record(self, server_round: int, results) -> None:
        """Aggregate client fit results and append to history."""
        agg = aggregate_fit_results(results)
        agg["round"] = server_round
        agg["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._history.append(agg)

        status = "finished" if server_round >= self.total_rounds else "training"
        self._save(status, server_round)

    def record_eval(self, server_round: int, results) -> None:
        """Aggregate federated evaluation results and append to eval history."""
        agg = aggregate_eval_results(results)
        agg["round"] = server_round
        agg["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._eval_history.append(agg)

        status = "finished" if server_round >= self.total_rounds else "training"
        self._save(status, server_round)

    def _save(self, status: str, current_round: int) -> None:
        payload: Dict = {
            "status":            status,
            "current_round":     current_round,
            "total_rounds":      self.total_rounds,
            "rounds":            self._history,
            "started_at":        self._started_at,
            "model_distributed": False,
        }
        if self._eval_history:
            payload["federated_eval"] = self._eval_history
        with open(METRICS_FILE, "w") as f:
            json.dump(payload, f, indent=2)
