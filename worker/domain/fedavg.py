"""Pure FedAvg weighted averaging — no I/O, no state."""

from typing import List, Tuple

import numpy as np


def weighted_average_weights(
    items: List[Tuple[str, "ClientSubmission"]],  # noqa: F821
    total_samples: int,
) -> List[np.ndarray]:
    """Compute FedAvg weighted average of model weights."""
    n_layers = len(items[0][1].weights)
    agg: List[np.ndarray] = []
    for layer_i in range(n_layers):
        layer_agg = sum(
            s.weights[layer_i] * (s.num_samples / total_samples)
            for _, s in items
        )
        agg.append(layer_agg)
    return agg
