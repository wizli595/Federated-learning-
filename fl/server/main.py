"""
main.py — Flower server entry point.
Usage: python fl/server/main.py --rounds 10 --min-clients 2 ...
"""

import argparse
import sys
from pathlib import Path

import flwr as fl

sys.path.insert(0, str(Path(__file__).parent.parent))
from server.metrics import MetricsWriter
from server.strategy import EmailFedAvg


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--rounds",         type=int,   default=10)
    p.add_argument("--min-clients",    type=int,   default=2)
    p.add_argument("--local-epochs",   type=int,   default=5)
    p.add_argument("--learning-rate",  type=float, default=0.01)
    p.add_argument("--algorithm",      type=str,   default="fedavg")
    p.add_argument("--mu",             type=float, default=0.1)
    p.add_argument("--clip-norm",      type=float, default=1.0)
    p.add_argument("--noise-mult",     type=float, default=0.01)
    p.add_argument("--port",           type=int,   default=8090)
    p.add_argument("--lr-schedule",    type=str,   default="none",
                   choices=["none", "cosine", "step"])
    args = p.parse_args()

    client_cfg = {
        "local_epochs":  args.local_epochs,
        "learning_rate": args.learning_rate,
        "algorithm":     args.algorithm,
        "mu":            args.mu,
        "clip_norm":     args.clip_norm,
        "noise_mult":    args.noise_mult,
        "lr_schedule":   args.lr_schedule,
    }

    metrics   = MetricsWriter(total_rounds=args.rounds)
    strategy  = EmailFedAvg(
        cfg=client_cfg,
        metrics=metrics,
        min_fit_clients=args.min_clients,
        min_evaluate_clients=args.min_clients,
        min_available_clients=args.min_clients,
        fit_metrics_aggregation_fn=lambda m: {},
        evaluate_metrics_aggregation_fn=lambda m: {},
    )

    print(
        f"[server] starting | rounds={args.rounds} "
        f"min_clients={args.min_clients} port={args.port}",
        flush=True,
    )

    fl.server.start_server(
        server_address=f"0.0.0.0:{args.port}",
        config=fl.server.ServerConfig(num_rounds=args.rounds),
        strategy=strategy,
    )


if __name__ == "__main__":
    main()
