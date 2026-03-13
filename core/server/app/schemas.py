from typing import Dict, List, Optional

from pydantic import BaseModel

from .state import ServerState


class StartRequest(BaseModel):
    input_dim: int
    num_classes: int = 2


class RegisterResponse(BaseModel):
    client_id: str
    message: str


class SubmitRequest(BaseModel):
    client_id: str
    num_samples: int
    weights: List[List[float]]  # flattened parameter arrays
    shapes: List[List[int]]     # original shape of each parameter
    loss: Optional[float] = None
    accuracy: Optional[float] = None


class StatusResponse(BaseModel):
    state: ServerState
    current_round: int
    total_rounds: int
    registered_clients: int
    submissions_this_round: int
    metrics: List[dict]
