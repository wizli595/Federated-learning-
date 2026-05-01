"""Compute weight deltas: what the model learned this round."""

from typing import List
import numpy as np


def compute_deltas(
    local_weights: List[np.ndarray],
    global_weights: List[np.ndarray],
) -> List[np.ndarray]:
    """Return per-tensor deltas: local - global."""
    return [
        lw.astype(np.float32) - gw.astype(np.float32)
        for lw, gw in zip(local_weights, global_weights)
    ]
