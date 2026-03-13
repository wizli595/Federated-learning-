from typing import Tuple

import torch
import torch.nn as nn

from .config import BATCH_SIZE, LOCAL_EPOCHS, LR


def train(model: nn.Module, X_train: torch.Tensor, y_train: torch.Tensor) -> float:
    """Run LOCAL_EPOCHS of local training. Returns average training loss."""
    model.train()
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.CrossEntropyLoss()
    loader = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(X_train, y_train),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )

    total_loss = 0.0
    for _ in range(LOCAL_EPOCHS):
        epoch_loss = 0.0
        for X_batch, y_batch in loader:
            optimizer.zero_grad()
            loss = criterion(model(X_batch), y_batch)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        total_loss += epoch_loss / len(loader)

    return total_loss / LOCAL_EPOCHS


def evaluate(model: nn.Module, X_test: torch.Tensor, y_test: torch.Tensor) -> Tuple[float, float]:
    """Returns (loss, accuracy) on the test split."""
    model.eval()
    criterion = nn.CrossEntropyLoss()

    with torch.no_grad():
        logits = model(X_test)
        loss = criterion(logits, y_test).item()
        accuracy = (logits.argmax(dim=1) == y_test).float().mean().item()

    return loss, accuracy
