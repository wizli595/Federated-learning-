"""
privacy.py — Differential privacy: clip weight UPDATE norm + add Gaussian noise.

Key design: DP noise is applied to the DELTA (local - global weights), not to
absolute weights. This gives a ~10x better signal-to-noise ratio because:
  - Absolute weight norm  ≈ 15-20  (large, dominated by initialisation)
  - Weight delta norm      ≈ 1-3   (small, only the change this round)

With per-tensor clipping on absolute weights (old approach), each tensor was
scaled to norm=1, making each element ~0.02. Then noise of std=0.05 (noise_mult
× clip_norm) was 2.5× larger than the signal — catastrophic.

With delta-based global-norm clipping (new approach):
  - Global delta norm ≈ 1-3 is clipped to clip_norm (usually stays under it)
  - Noise std = noise_mult × clip_norm = 0.01 × 1.0 = 0.01 per element
  - Typical delta element ≈ 0.02 → SNR ≈ 2 before averaging, ≈ 3.5 after 3-client FedAvg
"""

from typing import List

import numpy as np


def privatize_weights(
    local_weights: List[np.ndarray],
    global_weights: List[np.ndarray],
    clip_norm: float = 1.0,
    noise_mult: float = 0.01,
) -> List[np.ndarray]:
    """
    Apply DP noise to the weight update (delta), not absolute weights.

    Steps:
    1. Compute delta = local - global (what was learned this round)
    2. Global L2 clip: scale all delta tensors jointly so combined norm <= clip_norm
    3. Add zero-mean Gaussian noise with std = noise_mult * clip_norm to each element
    4. Return global + noised_delta  (absolute weights ready to submit to server)

    Args:
        local_weights:  weights after local training (learnable params only)
        global_weights: weights received from server before training
        clip_norm:      L2 norm budget for the combined weight update
        noise_mult:     noise = N(0, noise_mult * clip_norm); lower = less noise
    """
    # 1. Compute per-tensor deltas
    deltas = [lw.astype(np.float32) - gw.astype(np.float32)
              for lw, gw in zip(local_weights, global_weights)]

    # 2. Global L2 norm clipping across all deltas jointly
    global_norm = np.sqrt(sum(np.linalg.norm(d.flatten()) ** 2 for d in deltas))
    scale = min(1.0, clip_norm / max(global_norm, 1e-8))
    clipped = [d * scale for d in deltas]

    # 3. Gaussian noise calibrated to clip_norm (DP sensitivity)
    noise_std = noise_mult * clip_norm
    noised_deltas = [
        d + np.random.normal(0.0, noise_std, d.shape).astype(np.float32)
        for d in clipped
    ]

    # 4. Reconstruct absolute weights: global + noised delta
    return [
        (gw.astype(np.float32) + nd).astype(np.float32)
        for gw, nd in zip(global_weights, noised_deltas)
    ]
