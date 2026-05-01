"""Pure confusion matrix math — no I/O, no state."""

import math
from typing import Tuple


def compute_confusion(
    tp: int, fp: int, tn: int, fn: int,
) -> Tuple[float, float, float]:
    """Return (precision, recall, f1) from raw counts."""
    precision = tp / max(tp + fp, 1)
    recall    = tp / max(tp + fn, 1)
    f1        = 2 * precision * recall / max(precision + recall, 1e-9)
    return precision, recall, f1


def clean_float(v: float) -> float:
    """Replace NaN/Inf with 0.0 so json.dump never raises."""
    return 0.0 if (isinstance(v, float) and not math.isfinite(v)) else v
