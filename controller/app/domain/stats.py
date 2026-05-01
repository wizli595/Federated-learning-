"""Pure dataset statistics computation — no I/O."""

from typing import Dict, List


def compute_client_stats(
    rows: List[dict],
    feature_names: List[str],
) -> Dict:
    """
    Compute spam/ham counts and per-feature means from a list of row dicts.
    Returns a stats dict with total, spam, ham, spam_ratio, and features.
    """
    if not rows:
        return {}

    spam_rows = [r for r in rows if int(r["label"]) == 1]
    ham_rows  = [r for r in rows if int(r["label"]) == 0]
    total = len(rows)
    spam  = len(spam_rows)
    ham   = len(ham_rows)

    features: Dict[str, Dict[str, float]] = {}
    for feat in feature_names:
        features[feat] = {
            "spam_mean": round(sum(float(r[feat]) for r in spam_rows) / max(spam, 1), 4),
            "ham_mean":  round(sum(float(r[feat]) for r in ham_rows)  / max(ham,  1), 4),
        }

    return {
        "total":      total,
        "spam":       spam,
        "ham":        ham,
        "spam_ratio": round(spam / max(total, 1), 4),
        "features":   features,
    }
