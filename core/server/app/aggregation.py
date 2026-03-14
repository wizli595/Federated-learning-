import logging
from typing import Dict, List, Optional

import numpy as np
import torch

from .config import OUTPUT_PATH
from .state import FLState, ServerState

log = logging.getLogger("fl-server.aggregation")


def fedavg(submissions: Dict[str, dict]) -> List[np.ndarray]:
    """
    Weighted average of client weights by number of local samples.

        w_global = Σ (n_i / n_total) * w_i
    """
    total_samples = sum(s["num_samples"] for s in submissions.values())
    aggregated: Optional[List[np.ndarray]] = None

    for sub in submissions.values():
        scale = sub["num_samples"] / total_samples
        scaled = [w * scale for w in sub["weights"]]
        aggregated = scaled if aggregated is None else [a + s for a, s in zip(aggregated, scaled)]

    return aggregated


def _compute_round_metrics(round_num: int, submissions: Dict[str, dict]) -> dict:
    losses = [s["loss"] for s in submissions.values() if s["loss"] is not None]
    accs = [s["accuracy"] for s in submissions.values() if s["accuracy"] is not None]
    per_client = {
        cid: {
            "loss":        s.get("loss"),
            "accuracy":    s.get("accuracy"),
            "num_samples": s.get("num_samples"),
        }
        for cid, s in submissions.items()
    }
    return {
        "round":        round_num,
        "num_clients":  len(submissions),
        "avg_loss":     float(np.mean(losses)) if losses else None,
        "avg_accuracy": float(np.mean(accs)) if accs else None,
        "per_client":   per_client,
    }


async def aggregate_and_advance(state: FLState) -> None:
    """FedAvg → save checkpoint → advance to next round or finish."""
    async with state.lock:
        if state.state != ServerState.ROUND_OPEN:
            return  # another coroutine already handled it
        state.state = ServerState.AGGREGATING

    log.info("Round %d — aggregating %d submissions", state.current_round, len(state.submissions))

    new_weights = fedavg(state.submissions)
    metrics = _compute_round_metrics(state.current_round, state.submissions)

    async with state.lock:
        # Update model weights
        from shared.model import set_weights  # imported here to avoid circular deps
        state.global_weights = new_weights
        set_weights(state.model, new_weights)
        state.metrics.append(metrics)

        log.info(
            "Round %d complete — loss=%s  acc=%s",
            state.current_round,
            f"{metrics['avg_loss']:.4f}" if metrics["avg_loss"] is not None else "N/A",
            f"{metrics['avg_accuracy']:.4f}" if metrics["avg_accuracy"] is not None else "N/A",
        )

        # Save checkpoint
        torch.save(state.model.state_dict(), OUTPUT_PATH)
        log.info("Checkpoint saved → %s", OUTPUT_PATH)

        # Advance or finish
        if state.current_round >= state.total_rounds:
            state.state = ServerState.FINISHED
            log.info("All %d rounds complete. Training finished.", state.total_rounds)
        else:
            state.current_round += 1
            state.submissions.clear()
            state.state = ServerState.ROUND_OPEN
            log.info("Round %d opened.", state.current_round)
