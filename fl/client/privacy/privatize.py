"""
privatize.py — Orchestrate delta-based differential privacy.

DP noise is applied to the DELTA (local - global weights), not to
absolute weights. This gives ~10x better SNR because:
  - Absolute weight norm  ~ 15-20  (dominated by initialisation)
  - Weight delta norm     ~ 1-3    (only the change this round)
"""

from typing import List
import numpy as np

from .deltas import compute_deltas
from .clipping import clip_global_norm
from .noise import add_noise


def privatize_weights(
    local_weights: List[np.ndarray],
    global_weights: List[np.ndarray],
    clip_norm: float = 1.0,
    noise_mult: float = 0.01,
) -> List[np.ndarray]:
    """
    Apply DP noise to the weight update (delta), not absolute weights.

    Steps:
    1. Compute delta = local - global
    2. Global L2 clip so combined norm <= clip_norm
    3. Add Gaussian noise with std = noise_mult * clip_norm
    4. Return global + noised_delta
    """
    deltas = compute_deltas(local_weights, global_weights)
    clipped = clip_global_norm(deltas, clip_norm)
    noised = add_noise(clipped, noise_mult * clip_norm)

    return [
        (gw.astype(np.float32) + nd).astype(np.float32)
        for gw, nd in zip(global_weights, noised)
    ]
