"""
generate_email_data.py — CLI entry point for per-client dataset generation.

Reads client configs from --clients-dir, writes dataset.csv files to --output-dir.

Usage:
    python scripts/generate_email_data.py --clients-dir controller/app/clients \
                                          --output-dir fl/data \
                                          --samples 800 --seed 42

Generation logic lives in scripts/datagen/:
    ham.py       — ham email feature generators
    spam.py      — spam email feature generators
    profiles.py  — client profile definitions (spam/ham mix + ratio)
    dataset.py   — generate_client_dataset()
"""

import argparse
import json
import sys
from pathlib import Path

# Allow running from repo root: python scripts/generate_email_data.py
sys.path.insert(0, str(Path(__file__).parent))

from datagen.dataset  import generate_client_dataset
from datagen.profiles import PROFILES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clients-dir", default="controller/app/clients")
    parser.add_argument("--output-dir",  default="fl/data")
    parser.add_argument("--samples",     type=int, default=600)
    parser.add_argument("--seed",        type=int, default=42)
    args = parser.parse_args()

    clients_dir = Path(args.clients_dir)
    output_dir  = Path(args.output_dir)

    if not clients_dir.exists():
        print(f"ERROR: clients directory not found: {clients_dir}")
        sys.exit(1)

    config_files = sorted(clients_dir.glob("*.json"))
    if not config_files:
        print(f"ERROR: no client JSON configs found in {clients_dir}")
        sys.exit(1)

    print(f"Generating data for {len(config_files)} client(s) ({args.samples} samples each)...")

    for i, cfg_path in enumerate(config_files):
        with open(cfg_path) as f:
            cfg = json.load(f)

        client_id = cfg["id"]
        profile   = cfg.get("profile", "balanced")

        if profile not in PROFILES:
            print(f"  [{client_id}] unknown profile '{profile}', using 'balanced'")
            profile = "balanced"

        out_dir  = output_dir / client_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "dataset.csv"

        df = generate_client_dataset(profile, args.samples, seed=args.seed + i)
        df.to_csv(out_path, index=False)

        spam_pct = df["label"].mean() * 100
        print(f"  [{client_id}] profile={profile} samples={len(df)} spam={spam_pct:.1f}% -> {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
