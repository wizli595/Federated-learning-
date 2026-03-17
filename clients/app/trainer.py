from typing import List, Optional, Tuple

import torch
import torch.nn as nn

from .config import BATCH_SIZE, LOCAL_EPOCHS, LR


def train(
    model: nn.Module,
    X_train: torch.Tensor,
    y_train: torch.Tensor,
    epochs: int | None = None,
    lr: float | None = None,
    algorithm: str = "fedavg",
    mu: float = 0.0,
    global_weights: Optional[List[torch.Tensor]] = None,
) -> float:
    """Run local training. epochs/lr override config values if provided.

    When algorithm='fedprox' and global_weights is provided, adds a proximal
    term (mu/2) * ||w_local - w_global||² to penalise client drift.
    """
    effective_epochs = epochs if epochs is not None else LOCAL_EPOCHS
    effective_lr     = lr     if lr     is not None else LR

    model.train()
    optimizer = torch.optim.Adam(model.parameters(), lr=effective_lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    loader = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(X_train, y_train),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )

    use_prox = algorithm == "fedprox" and global_weights is not None and mu > 0.0

    total_loss = 0.0
    for _ in range(effective_epochs):
        epoch_loss = 0.0
        for X_batch, y_batch in loader:
            optimizer.zero_grad()
            loss = criterion(model(X_batch), y_batch)

            if use_prox:
                prox_term = 0.0
                for w_local, w_global in zip(model.parameters(), global_weights):
                    prox_term += (mu / 2) * torch.norm(w_local - w_global) ** 2
                loss = loss + prox_term

            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        total_loss += epoch_loss / len(loader)

    return total_loss / effective_epochs


def evaluate(model: nn.Module, X_test: torch.Tensor, y_test: torch.Tensor) -> Tuple[float, float]:
    """Returns (loss, accuracy) on the test split."""
    model.eval()
    criterion = nn.CrossEntropyLoss()

    with torch.no_grad():
        logits = model(X_test)
        loss = criterion(logits, y_test).item()
        accuracy = (logits.argmax(dim=1) == y_test).float().mean().item()

    return loss, accuracy
