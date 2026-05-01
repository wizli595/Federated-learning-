"""Data structures for aggregation input and output."""

from dataclasses import dataclass
from typing import Dict, List

import numpy as np


@dataclass
class ClientSubmission:
    """What each FL client sends after local training."""
    weights:     List[np.ndarray]
    num_samples: int
    loss:        float = 0.0
    accuracy:    float = 0.0
    spam_rate:   float = 0.0
    tp:          int   = 0
    fp:          int   = 0
    tn:          int   = 0
    fn:          int   = 0


@dataclass
class AggregationResult:
    """What comes out after FedAvg over all client submissions."""
    round_num:     int
    num_clients:   int
    total_samples: int
    weights:       List[np.ndarray]
    avg_loss:      float
    avg_accuracy:  float
    precision:     float
    recall:        float
    f1:            float
    tp:            int
    fp:            int
    tn:            int
    fn:            int
    per_client:    Dict[str, dict]
