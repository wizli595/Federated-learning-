"""Global L2 norm clipping across all delta tensors jointly."""

from typing import List
import numpy as np


def clip_global_norm(
    deltas: List[np.ndarray],
    clip_norm: float,
) -> List[np.ndarray]:
    """Scale all deltas jointly so their combined L2 norm <= clip_norm."""
    global_norm = np.sqrt(sum(np.linalg.norm(d.flatten()) ** 2 for d in deltas))
    scale = min(1.0, clip_norm / max(global_norm, 1e-8))
    return [d * scale for d in deltas]
