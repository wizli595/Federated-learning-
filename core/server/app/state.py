import asyncio
from enum import Enum
from typing import Dict, List, Optional  # noqa: F401

import numpy as np
import torch.nn as nn


class ServerState(str, Enum):
    WAITING     = "waiting"
    ROUND_OPEN  = "round_open"
    AGGREGATING = "aggregating"
    FINISHED    = "finished"


class FLState:
    def __init__(self) -> None:
        self.state: ServerState          = ServerState.WAITING
        self.current_round: int          = 0
        self.total_rounds: int           = 0
        self.model: Optional[nn.Module]  = None
        self.global_weights: List[np.ndarray] = []
        self.clients: Dict[str, dict]    = {}   # client_id → metadata
        self.submissions: Dict[str, dict] = {}  # client_id → {weights, num_samples, loss, accuracy}
        self.metrics: List[dict]         = []
        self.training_config: Optional[dict] = None
        self.lock = asyncio.Lock()

    def reset(self) -> None:
        """Hard reset — wipes all state including weights and metrics."""
        self.state           = ServerState.WAITING
        self.current_round   = 0
        self.total_rounds    = 0
        self.model           = None
        self.global_weights  = []
        self.clients         = {}
        self.submissions     = {}
        self.metrics         = []
        self.training_config = None

    def soft_reset(self) -> None:
        """Pause — preserves global weights, metrics, and round info so training can resume."""
        self.state       = ServerState.WAITING
        self.clients     = {}
        self.submissions = {}


# Single shared instance
fl_state = FLState()
