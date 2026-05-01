"""Pure CSV validation — no I/O, no HTTP."""

import io
from typing import List

import pandas as pd


def validate_csv(
    csv_content: str,
    required_features: List[str],
    min_rows: int = 10,
) -> pd.DataFrame:
    """
    Parse CSV content and validate structure.

    Raises ValueError with a human-readable message on any problem.
    Returns the validated DataFrame on success.
    """
    if not csv_content.strip():
        raise ValueError("csv_content is empty")

    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as exc:
        raise ValueError(f"invalid CSV: {exc}")

    missing = [f for f in required_features if f not in df.columns]
    if missing:
        raise ValueError(f"missing feature columns: {missing[:5]}")

    if "label" not in df.columns:
        raise ValueError("missing 'label' column")

    if len(df) < min_rows:
        raise ValueError(f"dataset must have at least {min_rows} rows")

    return df[required_features + ["label"]]
