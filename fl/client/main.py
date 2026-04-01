"""
main.py — Flower client entry point.
Usage: python fl/client/main.py --client-id alice --data-path fl/data/alice/dataset.csv
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import flwr as fl
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.model import build_model, get_weights, set_weights, num_trainable, INPUT_DIM, NUM_CLASSES
from client.data             import load_data
from client.trainer          import train, evaluate
from client.privacy          import privatize_weights
from client.kafka_publisher  import publish_weights as kafka_publish


class EmailSpamClient(fl.client.NumPyClient):
    def __init__(self, client_id: str, data_path: Path):
        self.client_id = client_id
        self.model     = build_model(INPUT_DIM, NUM_CLASSES)

        print(f"[{client_id}] loading data from {data_path}", flush=True)
        self.X_train, self.y_train, self.X_test, self.y_test = load_data(data_path)
        print(
            f"[{client_id}] train={len(self.X_train)} "
            f"test={len(self.X_test)} "
            f"spam={self.y_train.float().mean():.1%}",
            flush=True,
        )

    def get_parameters(self, config: Dict) -> List[np.ndarray]:
        return get_weights(self.model)

    def fit(self, parameters: List[np.ndarray], config: Dict) -> Tuple:
        set_weights(self.model, parameters)

        # Snapshot global weights BEFORE training — needed for delta-based DP
        n_params = num_trainable(self.model)
        global_weights_snapshot = get_weights(self.model)[:n_params]

        global_params = (
            [p.clone() for p in self.model.parameters()]
            if config.get("algorithm") == "fedprox" else None
        )

        train(
            self.model, self.X_train, self.y_train,
            epochs    = int(config.get("local_epochs",  5)),
            lr        = float(config.get("learning_rate", 0.01)),
            algorithm = str(config.get("algorithm", "fedavg")),
            mu        = float(config.get("mu", 0.0)),
            global_params=global_params,
        )

        loss, acc, spam_rate, tp, fp, tn, fn = evaluate(self.model, self.X_test, self.y_test)
        all_weights = get_weights(self.model)
        # Delta-based DP: clip/noise the weight UPDATE, not absolute weights
        # This gives ~10x better SNR vs absolute-weight clipping (see privacy.py)
        noised = privatize_weights(
            local_weights  = all_weights[:n_params],
            global_weights = global_weights_snapshot,
            clip_norm  = float(config.get("clip_norm",  1.0)),
            noise_mult = float(config.get("noise_mult", 0.01)),
        )
        weights = noised + all_weights[n_params:]

        print(
            f"[{self.client_id}] round done | "
            f"loss={loss:.4f} acc={acc:.4f} spam_rate={spam_rate:.4f} "
            f"tp={tp} fp={fp} tn={tn} fn={fn}",
            flush=True,
        )

        # ── Kafka path (parallel to Flower gRPC, best-effort) ─────────────────
        round_num = int(config.get("server_round", 0))
        kafka_publish(
            client_id   = self.client_id,
            round_num   = round_num,
            num_samples = len(self.X_train),
            weights     = weights,
            loss        = loss,
            accuracy    = acc,
            spam_rate   = spam_rate,
            tp=tp, fp=fp, tn=tn, fn=fn,
        )

        # ── Flower gRPC path (unchanged) ──────────────────────────────────────
        return weights, len(self.X_train), {
            "client_id": self.client_id,
            "loss":      loss,
            "accuracy":  acc,
            "spam_rate": spam_rate,
            "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        }

    def evaluate(self, parameters: List[np.ndarray], config: Dict) -> Tuple:
        set_weights(self.model, parameters)
        loss, acc, spam_rate, tp, fp, tn, fn = evaluate(self.model, self.X_test, self.y_test)
        return loss, len(self.X_test), {
            "client_id": self.client_id,
            "accuracy":  acc,
            "spam_rate": spam_rate,
            "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--client-id",  required=True)
    p.add_argument("--data-path",  required=True)
    p.add_argument("--server",     default="127.0.0.1:8090")
    args = p.parse_args()

    path = Path(args.data_path)
    if not path.exists():
        print(f"[{args.client_id}] ERROR: dataset not found: {path}", flush=True)
        sys.exit(1)

    fl.client.start_numpy_client(
        server_address=args.server,
        client=EmailSpamClient(args.client_id, path),
    )


if __name__ == "__main__":
    main()
