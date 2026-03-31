"""
model.py — TabularMLP for email spam detection.
Single source of truth for fl/server.py and fl/client.py.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import List

INPUT_DIM  = 20  # must match FEATURE_NAMES length in features.py
NUM_CLASSES = 2  # 0 = ham, 1 = spam


class TabularMLP(nn.Module):
    def __init__(
        self,
        input_dim: int = INPUT_DIM,
        hidden_dims: List[int] = [128, 64],
        num_classes: int = NUM_CLASSES,
        dropout: float = 0.3,
    ):
        super().__init__()
        layers = []
        prev = input_dim
        for h in hidden_dims:
            # LayerNorm instead of BatchNorm1d: no running stats to corrupt during FedAvg averaging
            layers += [nn.Linear(prev, h), nn.LayerNorm(h), nn.ReLU(), nn.Dropout(dropout)]
            prev = h
        layers.append(nn.Linear(prev, num_classes))
        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


def build_model(input_dim: int = INPUT_DIM, num_classes: int = NUM_CLASSES) -> TabularMLP:
    return TabularMLP(input_dim=input_dim, num_classes=num_classes)


def get_weights(model: nn.Module) -> List[np.ndarray]:
    """Return all floating-point state_dict tensors as numpy arrays.
    LayerNorm has only learnable weight+bias (no running buffers), so every
    entry here is a trainable parameter — all receive DP noise in privacy.py.
    """
    return [
        v.cpu().numpy()
        for v in model.state_dict().values()
        if v.is_floating_point()
    ]


def num_trainable(model: nn.Module) -> int:
    """Number of learnable parameter tensors.
    With LayerNorm this equals len(get_weights(model)); the split in client/main.py
    is a no-op (buffers slice is always empty) but kept for forward-compatibility.
    """
    return len(list(model.parameters()))


def set_weights(model: nn.Module, weights: List[np.ndarray]) -> None:
    """Restore floating-point state_dict tensors from numpy arrays."""
    state = model.state_dict()
    float_keys = [k for k, v in state.items() if v.is_floating_point()]
    for key, w in zip(float_keys, weights):
        state[key] = torch.tensor(w, dtype=state[key].dtype)
    model.load_state_dict(state, strict=True)
