"""Pure micro-averaged confusion matrix + float sanitization — no I/O, no state."""

import math
from typing import List, Tuple


def clean_float(v: float) -> float:
    """Replace NaN/Inf with 0.0 so json.dump never raises."""
    return 0.0 if (isinstance(v, float) and not math.isfinite(v)) else v


def micro_confusion(
    items: List[Tuple[str, object]],
) -> Tuple[float, float, float, int, int, int, int]:
    """
    Sum TP/FP/TN/FN across all clients, compute precision/recall/F1.
    Returns (precision, recall, f1, tp, fp, tn, fn).
    """
    tp = sum(s.tp for _, s in items)
    fp = sum(s.fp for _, s in items)
    tn = sum(s.tn for _, s in items)
    fn = sum(s.fn for _, s in items)

    precision = tp / max(tp + fp, 1)
    recall    = tp / max(tp + fn, 1)
    f1        = 2 * precision * recall / max(precision + recall, 1e-9)

    return precision, recall, f1, tp, fp, tn, fn
