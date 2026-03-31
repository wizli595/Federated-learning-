"""
data.py — Load a client's local email dataset.
Features are already normalised 0-1 by the data generator, so no further scaling is needed.
"""

import sys
from pathlib import Path
from typing import Tuple

import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.features import FEATURE_NAMES


def load_data(
    data_path: Path,
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
    """Return (X_train, y_train, X_test, y_test) as float32 torch tensors.

    Features are generated in the 0-1 range and extract_features() also
    returns 0-1 values, so StandardScaler is intentionally omitted — applying
    it would create a train/inference distribution mismatch.
    """
    df = pd.read_csv(data_path)
    X  = df[FEATURE_NAMES].values.astype(np.float32)
    y  = df["label"].values.astype(np.int64)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    return (
        torch.tensor(X_train), torch.tensor(y_train),
        torch.tensor(X_test),  torch.tensor(y_test),
    )
