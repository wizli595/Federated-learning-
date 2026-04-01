"""
trainer.py — Local training and evaluation for email spam detection.
"""

from typing import List, Optional, Tuple

import torch
import torch.nn as nn


def train(
    model: nn.Module,
    X_train: torch.Tensor,
    y_train: torch.Tensor,
    epochs: int,
    lr: float,
    algorithm: str = "fedavg",
    mu: float = 0.0,
    global_params: Optional[List[torch.Tensor]] = None,
) -> None:
    """Train model in-place. Adds FedProx proximal term when algorithm='fedprox'.
    Gradient clipping (max_norm=1.0) is always applied to stabilise training."""
    model.train()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    # Weight class 1 (spam) 2x higher: forces model to care more about spam signals
    # even after FedAvg dilutes non-universal features across non-IID clients
    criterion = nn.CrossEntropyLoss(weight=torch.tensor([1.0, 2.0]))
    loader    = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(X_train, y_train),
        batch_size=32, shuffle=True,
    )
    use_prox = algorithm == "fedprox" and global_params is not None and mu > 0

    for _ in range(epochs):
        for X_batch, y_batch in loader:
            optimizer.zero_grad()
            loss = criterion(model(X_batch), y_batch)
            if use_prox:
                loss = loss + sum(
                    (mu / 2) * torch.norm(p - g) ** 2
                    for p, g in zip(model.parameters(), global_params)
                )
            loss.backward()
            # Clip gradient norms to prevent exploding gradients
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()


def evaluate(
    model: nn.Module,
    X_test: torch.Tensor,
    y_test: torch.Tensor,
) -> Tuple[float, float, float, int, int, int, int]:
    """Return (loss, accuracy, spam_detection_rate, tp, fp, tn, fn)."""
    model.eval()
    criterion = nn.CrossEntropyLoss()  # unweighted: gives true, comparable loss
    with torch.no_grad():
        logits = model(X_test)
        loss   = criterion(logits, y_test).item()
        preds  = logits.argmax(dim=1)
        acc    = (preds == y_test).float().mean().item()
        spam_mask = y_test == 1
        spam_rate = (
            (preds[spam_mask] == 1).float().mean().item()
            if spam_mask.any() else 0.0
        )
        tp = int(((preds == 1) & (y_test == 1)).sum())
        fp = int(((preds == 1) & (y_test == 0)).sum())
        tn = int(((preds == 0) & (y_test == 0)).sum())
        fn = int(((preds == 0) & (y_test == 1)).sum())
    return loss, acc, spam_rate, tp, fp, tn, fn
