"""
strategy.py — EmailFedAvg Flower strategy.
Handles aggregation, per-round LR scheduling, and checkpoints the global model
after every round. Also tracks and saves the BEST round model separately so a
late-round collapse (cosine LR → near-zero) never overwrites a good checkpoint.
"""

import math
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
from flwr.common import FitIns, FitRes, Parameters, Scalar, parameters_to_ndarrays
from flwr.server.client_proxy import ClientProxy
from flwr.server.strategy import FedAvg

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.model import build_model, set_weights, INPUT_DIM, NUM_CLASSES
from server.metrics import MetricsWriter

MODEL_FILE      = Path(__file__).parent.parent / "output" / "global_model.pt"
BEST_MODEL_FILE = Path(__file__).parent.parent / "output" / "best_model.pt"


class EmailFedAvg(FedAvg):
    def __init__(self, cfg: Dict, metrics: MetricsWriter, **kwargs):
        super().__init__(**kwargs)
        self.cfg        = cfg
        self.metrics    = metrics
        self._best_acc  = -1.0   # best avg_accuracy seen across all rounds
        self._best_round = 0

    # ── LR scheduling ──────────────────────────────────────────────────────────

    def _effective_lr(self, server_round: int) -> float:
        """Return the learning rate for this round based on the chosen schedule."""
        base_lr  = self.cfg["learning_rate"]
        schedule = self.cfg.get("lr_schedule", "none")
        total    = max(self.metrics.total_rounds, 1)

        if schedule == "cosine" and total > 1:
            # Cosine annealing: base_lr → base_lr * 0.10 (floor raised to 10 %)
            # A 1 % floor caused near-zero LR in the final rounds, destabilising
            # the last aggregation and collapsing accuracy back to ~75 %.
            progress = (server_round - 1) / (total - 1)
            return base_lr * (0.10 + 0.90 * 0.5 * (1.0 + math.cos(math.pi * progress)))

        if schedule == "step":
            # Halve every ⌊total/3⌋ rounds; floor at 10 % of base
            step = (server_round - 1) // max(1, total // 3)
            return max(base_lr * (0.5 ** step), base_lr * 0.1)

        return base_lr  # "none" — constant LR

    # ── pass config (with adjusted LR) to every client each round ──────────────

    def configure_fit(self, server_round, parameters, client_manager):
        pairs  = super().configure_fit(server_round, parameters, client_manager)
        lr     = self._effective_lr(server_round)
        config = {**self.cfg, "server_round": server_round, "learning_rate": lr}
        print(
            f"[server] round {server_round}/{self.metrics.total_rounds} "
            f"lr={lr:.6f} schedule={self.cfg.get('lr_schedule', 'none')}",
            flush=True,
        )
        return [
            (proxy, FitIns(parameters=fit_ins.parameters, config=config))
            for proxy, fit_ins in pairs
        ]

    # ── aggregate weights + record metrics ─────────────────────────────────────

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures,
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        aggregated, agg_metrics = super().aggregate_fit(server_round, results, failures)
        if aggregated is not None:
            self.metrics.record(server_round, results)
            self._save_model(aggregated, server_round)
        return aggregated, agg_metrics

    # ── checkpoint: latest round + best round ──────────────────────────────────

    def _save_model(self, parameters: Parameters, server_round: int) -> None:
        """Save global_model.pt every round, and best_model.pt whenever a new
        accuracy peak is reached. The controller distributes best_model.pt so a
        late-round collapse never reaches inference."""
        weights = parameters_to_ndarrays(parameters)
        model   = build_model(INPUT_DIM, NUM_CLASSES)
        set_weights(model, weights)
        MODEL_FILE.parent.mkdir(exist_ok=True)

        # Always overwrite the latest checkpoint
        torch.save(model.state_dict(), MODEL_FILE)
        is_final = server_round >= self.metrics.total_rounds
        print(
            f"[server] model saved ({'final' if is_final else f'ckpt r{server_round}'}) "
            f"→ {MODEL_FILE.name}",
            flush=True,
        )

        # Update best checkpoint when this round beats the previous peak
        current_acc = (
            self.metrics._history[-1]["avg_accuracy"]
            if self.metrics._history else 0.0
        )
        if current_acc > self._best_acc:
            self._best_acc   = current_acc
            self._best_round = server_round
            torch.save(model.state_dict(), BEST_MODEL_FILE)
            print(
                f"[server] best model updated → round {server_round} "
                f"acc={current_acc:.4f} → {BEST_MODEL_FILE.name}",
                flush=True,
            )
