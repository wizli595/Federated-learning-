import logging
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from ..config import FL_ROUNDS, MIN_CLIENTS
from ..schemas import StartRequest, StatusResponse
from ..state import ServerState, fl_state

sys.path.insert(0, str(Path(__file__).parents[3]))  # server/ root → shared/ accessible
from shared.model import build_model, get_weights  # noqa: E402

log = logging.getLogger("fl-server.control")
router = APIRouter()


@router.get("/health", tags=["control"])
def health():
    return {"status": "ok"}


@router.get("/status", response_model=StatusResponse, tags=["control"])
def get_status():
    return StatusResponse(
        state=fl_state.state,
        current_round=fl_state.current_round,
        total_rounds=FL_ROUNDS,
        registered_clients=len(fl_state.clients),
        submissions_this_round=len(fl_state.submissions),
        metrics=fl_state.metrics,
    )


@router.post("/start", tags=["control"])
async def start_training(req: StartRequest):
    """Initialise the global model and open round 1."""
    async with fl_state.lock:
        if fl_state.state != ServerState.WAITING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Training already started (state={fl_state.state})",
            )
        fl_state.model = build_model(input_dim=req.input_dim, num_classes=req.num_classes)
        fl_state.global_weights = get_weights(fl_state.model)
        fl_state.current_round = 1
        fl_state.state = ServerState.ROUND_OPEN

    log.info(
        "Training started — input_dim=%d  num_classes=%d  rounds=%d  min_clients=%d",
        req.input_dim, req.num_classes, FL_ROUNDS, MIN_CLIENTS,
    )
    return {"message": "Training started", "round": fl_state.current_round}
