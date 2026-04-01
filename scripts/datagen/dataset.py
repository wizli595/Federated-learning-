"""
Dataset builder — assembles per-client email feature DataFrames.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT / "fl"))

from shared.features import FEATURE_NAMES  # noqa: E402

from .ham      import HAM_FNS
from .spam     import SPAM_FNS
from .profiles import PROFILES, pick


def generate_client_dataset(profile: str, n_samples: int, seed: int) -> pd.DataFrame:
    """Generate a labelled feature DataFrame for one client.

    Args:
        profile:   One of the keys in PROFILES ('marketing', 'balanced', 'phishing').
        n_samples: Total number of rows to generate.
        seed:      RNG seed for reproducibility.

    Returns:
        DataFrame with columns = FEATURE_NAMES + ['label'], shuffled.
    """
    rng = np.random.default_rng(seed)
    cfg = PROFILES[profile]

    n_spam = int(n_samples * cfg["spam_ratio"])
    n_ham  = n_samples - n_spam

    rows, labels = [], []

    for _ in range(n_spam):
        t = pick(cfg["spam_mix"], rng)
        rows.append(SPAM_FNS[t](rng))
        labels.append(1)

    for _ in range(n_ham):
        t = pick(cfg["ham_mix"], rng)
        rows.append(HAM_FNS[t](rng))
        labels.append(0)

    X = np.vstack(rows)
    # Per-feature noise to blur decision boundaries
    X += rng.normal(0, 0.06, X.shape).astype(np.float32)
    X  = np.clip(X, 0.0, 1.0)

    labels = np.array(labels)
    # Label noise: 6% of samples are mislabeled (irreducible error floor ~6%)
    noise_mask = rng.random(len(labels)) < 0.06
    labels[noise_mask] = 1 - labels[noise_mask]

    df = pd.DataFrame(X, columns=FEATURE_NAMES)
    df["label"] = labels
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df
