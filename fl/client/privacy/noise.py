"""Add calibrated Gaussian noise for differential privacy."""

from typing import List
import numpy as np


def add_noise(
    tensors: List[np.ndarray],
    noise_std: float,
) -> List[np.ndarray]:
    """Add zero-mean Gaussian noise with the given std to each tensor element."""
    return [
        t + np.random.normal(0.0, noise_std, t.shape).astype(np.float32)
        for t in tensors
    ]
