from typing import Dict, List, Optional

from pydantic import BaseModel

from .state import ServerState


class StartRequest(BaseModel):
    input_dim: int
    num_classes: int = 2
    rounds: int = 10
    local_epochs: int = 5
    learning_rate: float = 0.01
    algorithm: str = "fedavg"
    mu: float = 0.1


class RegisterResponse(BaseModel):
    client_id: str
    message: str


class SubmitRequest(BaseModel):
    client_id: str
    num_samples: int
    weights: List[List[float]]
    shapes: List[List[int]]
    loss: Optional[float] = None
    accuracy: Optional[float] = None


class StatusResponse(BaseModel):
    state: ServerState
    current_round: int
    total_rounds: int
    registered_clients: int
    submissions_this_round: int
    submitted_client_ids: List[str]
    metrics: List[dict]
    client_ids: List[str]
    training_config: Optional[Dict] = None
    client_submissions: Dict[str, Dict] = {}
    stop_reason: str = "completed"
