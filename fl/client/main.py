"""
main.py — Flower client CLI entry point.
Usage: python fl/client/main.py --client-id alice --data-path fl/data/alice/dataset.csv
"""

import argparse
import sys
from pathlib import Path

import flwr as fl

sys.path.insert(0, str(Path(__file__).parent.parent))
from client.flower_client import EmailSpamClient


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
