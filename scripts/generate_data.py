"""
generate_data.py — Generate synthetic tabular classification data for FL testing.

Creates one CSV partition per client under clients/data/client-{i}/.

Usage:
    python scripts/generate_data.py [--clients 3] [--samples 1000] [--features 20] [--classes 2]

Each partition has a slightly different class distribution to simulate
realistic non-IID federated data (heterogeneous clients).
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
parser.add_argument("--clients",  type=int, default=3,    help="Number of client partitions")
parser.add_argument("--samples",  type=int, default=1000, help="Total samples (split across clients)")
parser.add_argument("--features", type=int, default=20,   help="Number of input features")
parser.add_argument("--classes",  type=int, default=2,    help="Number of output classes")
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
    n_informative=max(2, args.features // 2),
    n_redundant=max(1, args.features // 5),
    n_classes=args.classes,
    class_sep=0.3,   # harder: closer class boundaries
    flip_y=0.08,     # 8% label noise
    random_state=args.seed,
)

columns = [f"feature_{i}" for i in range(args.features)] + ["label"]
df = pd.DataFrame(np.column_stack([X, y]), columns=columns)
df["label"] = df["label"].astype(int)

log.info("Dataset created — total rows=%d  class balance=%s",
         len(df), df["label"].value_counts().sort_index().to_dict())

# ---------------------------------------------------------------------------
# Non-IID split
# ---------------------------------------------------------------------------
log.info("Splitting into %d non-IID partitions (sorted by label before split)", args.clients)

df_sorted   = df.sort_values("label").reset_index(drop=True)
partitions  = np.array_split(df_sorted, args.clients)

for i, partition in enumerate(partitions):
    client_id = f"client-{i + 1}"
    out_dir   = DATA_ROOT / client_id
    out_dir.mkdir(parents=True, exist_ok=True)

    partition  = partition.sample(frac=1, random_state=args.seed + i).reset_index(drop=True)
    out_path   = out_dir / "dataset.csv"
    partition.to_csv(out_path, index=False)

    class_dist = partition["label"].value_counts().sort_index().to_dict()
    log.info("%-10s  rows=%-4d  classes=%s  →  %s", client_id, len(partition), class_dist, out_path)

log.info("Done. Data written to %s", DATA_ROOT)
