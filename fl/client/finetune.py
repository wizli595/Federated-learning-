"""
finetune.py — Personalize the global model on a single client's local data.

Run after federation: a few local epochs adapt the model to the client's
specific spam profile (marketing / balanced / phishing) without DP noise
and without the proximal term — pure local adaptation from the global starting point.

Usage:
    python fl/client/finetune.py \
        --client-id  client-1 \
        --data-path  fl/data/client-1/dataset.csv \
        --model-path fl/data/client-1/model.pt \
        --epochs     3 \
        --lr         0.001
"""

import argparse
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.model    import build_model, INPUT_DIM, NUM_CLASSES  # noqa: E402
from client.data     import load_data                             # noqa: E402
from client.trainer  import train, evaluate                       # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--client-id",   required=True)
    p.add_argument("--data-path",   required=True)
    p.add_argument("--model-path",  required=True)
    p.add_argument("--epochs",      type=int,   default=3)
    p.add_argument("--lr",          type=float, default=0.001)
    args = p.parse_args()

    data_path  = Path(args.data_path)
    model_path = Path(args.model_path)

    if not data_path.exists():
        print(f"[{args.client_id}] ERROR: dataset not found: {data_path}", flush=True)
        sys.exit(1)
    if not model_path.exists():
        print(f"[{args.client_id}] ERROR: model not found: {model_path}", flush=True)
        sys.exit(1)

    # Load distributed global model
    model = build_model(INPUT_DIM, NUM_CLASSES)
    sd = torch.load(model_path, map_location="cpu", weights_only=True)
    model.load_state_dict(sd)

    X_train, y_train, X_test, y_test = load_data(data_path)
    print(
        f"[{args.client_id}] personalizing | "
        f"train={len(X_train)} test={len(X_test)} epochs={args.epochs} lr={args.lr}",
        flush=True,
    )

    # Baseline: evaluate global model on local test set
    loss_before, acc_before, spam_before, *_ = evaluate(model, X_test, y_test)

    # Fine-tune: no DP noise, no FedProx — pure local adaptation
    train(model, X_train, y_train, epochs=args.epochs, lr=args.lr)

    # Evaluate personalized model
    loss_after, acc_after, spam_after, *_ = evaluate(model, X_test, y_test)
    delta_acc  = (acc_after  - acc_before)  * 100
    delta_loss = loss_after  - loss_before

    print(
        f"[{args.client_id}] personalization done | "
        f"acc {acc_before:.4f} → {acc_after:.4f} ({delta_acc:+.1f} pp) | "
        f"loss {loss_before:.4f} → {loss_after:.4f} ({delta_loss:+.4f}) | "
        f"spam_recall {spam_before:.4f} → {spam_after:.4f}",
        flush=True,
    )

    torch.save(model.state_dict(), model_path)
    print(f"[{args.client_id}] personalized model saved → {model_path}", flush=True)


if __name__ == "__main__":
    main()
