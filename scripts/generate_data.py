"""
generate_data.py — Generate synthetic tabular classification data for FL testing.

Creates one CSV partition per client under clients/data/client-{i}/.

Usage:
    python scripts/generate_data.py [--clients 3] [--samples 300] [--features 20] [--classes 2]

Each partition has a heavily skewed class distribution to simulate
extreme non-IID federated data (heterogeneous clients).
"""

import argparse
import logging
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.datasets import make_classification

warnings.filterwarnings("ignore", category=FutureWarning)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("generate-data")

# ---------------------------------------------------------------------------
# CLI args
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser(description="Generate synthetic FL dataset partitions")
parser.add_argument("--clients",  type=int, default=3,   help="Number of client partitions")
parser.add_argument("--samples",  type=int, default=300, help="Total samples (split across clients)")
parser.add_argument("--features", type=int, default=20,  help="Number of input features")
parser.add_argument("--classes",  type=int, default=2,   help="Number of output classes")
parser.add_argument("--seed",     type=int, default=42)
args = parser.parse_args()

ROOT      = Path(__file__).parent.parent
DATA_ROOT = ROOT / "clients" / "data"

np.random.seed(args.seed)

# ---------------------------------------------------------------------------
# Generate full dataset
# ---------------------------------------------------------------------------
log.info("Generating dataset — samples=%d  features=%d  classes=%d  seed=%d",
         args.samples, args.features, args.classes, args.seed)

X, y = make_classification(
    n_samples=args.samples,
    n_features=args.features,
    n_informative=2,             # only 2 truly informative features; 18 are noise
    n_redundant=max(1, args.features // 5),
    n_classes=args.classes,
    class_sep=0.1,               # heavy class overlap — nearly indistinguishable
    flip_y=0.20,                 # 20% label noise — 1 in 5 labels is wrong
    random_state=args.seed,
)

columns = [f"feature_{i}" for i in range(args.features)] + ["label"]
df = pd.DataFrame(np.column_stack([X, y]), columns=columns)
df["label"] = df["label"].astype(int)

log.info("Dataset created — total rows=%d  class balance=%s",
         len(df), df["label"].value_counts().sort_index().to_dict())

# ---------------------------------------------------------------------------
# Extreme non-IID split
# ---------------------------------------------------------------------------
log.info("Splitting into %d non-IID partitions (extreme class skew per client)", args.clients)

per_client = args.samples // args.clients

class0 = df[df["label"] == 0].sample(frac=1, random_state=args.seed).reset_index(drop=True)
class1 = df[df["label"] == 1].sample(frac=1, random_state=args.seed).reset_index(drop=True)

# Ratios: client-1 90/10, client-2 50/50, client-3 10/90
# For >3 clients the remaining ones get 50/50
ratios = {1: (0.9, 0.1), 2: (0.5, 0.5), 3: (0.1, 0.9)}

c0_cursor = 0
c1_cursor = 0

for i in range(1, args.clients + 1):
    r0, r1 = ratios.get(i, (0.5, 0.5))
    n0 = round(per_client * r0)
    n1 = per_client - n0

    # Clamp to available rows
    n0 = min(n0, len(class0) - c0_cursor)
    n1 = min(n1, len(class1) - c1_cursor)

    chunk = pd.concat([
        class0.iloc[c0_cursor : c0_cursor + n0],
        class1.iloc[c1_cursor : c1_cursor + n1],
    ]).sample(frac=1, random_state=args.seed + i).reset_index(drop=True)

    c0_cursor += n0
    c1_cursor += n1

    client_id = f"client-{i}"
    out_dir   = DATA_ROOT / client_id
    out_dir.mkdir(parents=True, exist_ok=True)

    out_path = out_dir / "dataset.csv"
    chunk.to_csv(out_path, index=False)

    class_dist = chunk["label"].value_counts().sort_index().to_dict()
    log.info("%-10s  rows=%-4d  classes=%s  →  %s", client_id, len(chunk), class_dist, out_path)

log.info("Done. Data written to %s", DATA_ROOT)
