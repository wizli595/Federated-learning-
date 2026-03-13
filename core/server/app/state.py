import asyncio
from enum import Enum
from typing import Dict, List, Optional

import numpy as np
import torch.nn as nn


class ServerState(str, Enum):
    WAITING = "waiting"
    ROUND_OPEN = "round_open"
    AGGREGATING = "aggregating"
    FINISHED = "finished"


class FLState:
    def __init__(self) -> None:
        self.state: ServerState = ServerState.WAITING
        self.current_round: int = 0
        self.model: Optional[nn.Module] = None
        self.global_weights: List[np.ndarray] = []
        self.clients: Dict[str, dict] = {}      # client_id → metadata
        self.submissions: Dict[str, dict] = {}  # client_id → {weights, num_samples, loss, accuracy}
        self.metrics: List[dict] = []           # one entry per completed round
        self.lock = asyncio.Lock()


# Single shared instance — imported by routes and aggregation
fl_state = FLState()
