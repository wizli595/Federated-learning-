"""Pure scalar aggregation — weighted loss/accuracy averages."""

from typing import List, Tuple


def weighted_average_scalars(
    items: List[Tuple[str, object]],
    total_samples: int,
) -> Tuple[float, float]:
    """Return (avg_loss, avg_accuracy) weighted by num_samples."""
    avg_loss = sum(s.loss * s.num_samples for _, s in items) / total_samples
    avg_acc  = sum(s.accuracy * s.num_samples for _, s in items) / total_samples
    return avg_loss, avg_acc
