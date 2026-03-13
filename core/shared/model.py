"""
model.py — Global model architecture
Single source of truth shared across the FL server and all clients.

Tabular binary/multi-class classification using a configurable MLP.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import List


class TabularMLP(nn.Module):
    """
    Multi-layer perceptron for tabular classification.

    Args:
        input_dim:   Number of input features.
        hidden_dims: List of hidden layer sizes. Default: [128, 64].
        num_classes: Number of output classes. Use 1 for binary classification
                     with BCEWithLogitsLoss, or N for CrossEntropyLoss.
        dropout:     Dropout probability applied after each hidden layer.
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dims: List[int] = [128, 64],
        num_classes: int = 2,
        dropout: float = 0.3,
    ):
        super().__init__()

        layers = []
        prev_dim = input_dim

        for hidden_dim in hidden_dims:
            layers += [
                nn.Linear(prev_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            ]
            prev_dim = hidden_dim

        layers.append(nn.Linear(prev_dim, num_classes))

        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


# ---------------------------------------------------------------------------
# Weight helpers — used by both server (aggregation) and clients (send/recv)
# ---------------------------------------------------------------------------

def get_weights(model: nn.Module) -> List[np.ndarray]:
    """Extract model parameters as a list of NumPy arrays."""
    return [param.detach().cpu().numpy() for param in model.parameters()]


def set_weights(model: nn.Module, weights: List[np.ndarray]) -> None:
    """Load a list of NumPy arrays back into model parameters in-place."""
    with torch.no_grad():
        for param, weight in zip(model.parameters(), weights):
            param.copy_(torch.tensor(weight))


def build_model(input_dim: int, num_classes: int = 2) -> TabularMLP:
    """
    Convenience factory used by both server and clients to ensure
    they always instantiate the model with the same architecture.
    """
    return TabularMLP(
        input_dim=input_dim,
        hidden_dims=[128, 64],
        num_classes=num_classes,
        dropout=0.3,
    )
