import logging
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from ..config import MIN_CLIENTS
from ..schemas import StartRequest, StatusResponse
from ..state import ServerState, fl_state

sys.path.insert(0, str(Path(__file__).parents[3]))
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
        total_rounds=fl_state.total_rounds,
        registered_clients=len(fl_state.clients),
        submissions_this_round=len(fl_state.submissions),
        submitted_client_ids=list(fl_state.submissions.keys()),
        metrics=fl_state.metrics,
        client_ids=list(fl_state.clients.keys()),
        training_config=fl_state.training_config,
        client_submissions={
            cid: {
                "loss":        s.get("loss"),
                "accuracy":    s.get("accuracy"),
                "num_samples": s.get("num_samples"),
            }
            for cid, s in fl_state.submissions.items()
        },
    )


@router.get("/training-config", tags=["control"])
def get_training_config():
    """Clients call this after registering to get server-side training hyperparameters."""
    if fl_state.training_config is None:
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail="Training not started yet.",
        )
    return fl_state.training_config


@router.post("/start", tags=["control"])
async def start_training(req: StartRequest):
    """Hard reset + initialise a fresh global model and open round 1."""
    async with fl_state.lock:
        if fl_state.state not in (ServerState.WAITING, ServerState.FINISHED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot start: training is active (state={fl_state.state})",
            )
        fl_state.reset()
        fl_state.model          = build_model(input_dim=req.input_dim, num_classes=req.num_classes)
        fl_state.global_weights = get_weights(fl_state.model)
        fl_state.total_rounds   = req.rounds
        fl_state.current_round  = 1
        fl_state.training_config = {
            "local_epochs":   req.local_epochs,
            "learning_rate":  req.learning_rate,
            "total_rounds":   req.rounds,
            "input_dim":      req.input_dim,
            "num_classes":    req.num_classes,
        }
        fl_state.state = ServerState.ROUND_OPEN

    log.info(
        "Training started — input_dim=%d  num_classes=%d  rounds=%d  "
        "local_epochs=%d  lr=%s  min_clients=%d",
        req.input_dim, req.num_classes, req.rounds,
        req.local_epochs, req.learning_rate, MIN_CLIENTS,
    )
    return {"message": "Training started", "round": fl_state.current_round}


@router.post("/stop", tags=["control"])
async def stop_training():
    """
    Soft-pause the session.
    Preserves global weights, metrics, and round counter so training can be resumed.
    Clients and pending submissions are cleared so clients must re-register on resume.
    """
    async with fl_state.lock:
        if fl_state.state == ServerState.WAITING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Server is already in WAITING state.",
            )
        stopped_at = fl_state.current_round
        fl_state.soft_reset()

    log.info("Training paused at round %d. Weights and metrics preserved.", stopped_at)
    return {"message": "Training paused", "stopped_at_round": stopped_at}


@router.post("/reset", tags=["control"])
async def reset_session():
    """Hard reset — wipes all state (weights, metrics, config) and returns to WAITING."""
    async with fl_state.lock:
        fl_state.reset()
    log.info("Session hard-reset. Server back to WAITING state.")
    return {"message": "Session reset"}


@router.post("/resume", tags=["control"])
async def resume_training():
    """
    Re-open the current round so clients can re-register and continue.
    Only valid after a soft-stop (state=WAITING with saved progress).
    """
    async with fl_state.lock:
        if fl_state.state != ServerState.WAITING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot resume: state is '{fl_state.state}' (must be 'waiting')",
            )
        if fl_state.current_round == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No saved session to resume. Use POST /start to begin a new session.",
            )
        fl_state.submissions.clear()
        fl_state.clients.clear()
        fl_state.state = ServerState.ROUND_OPEN

    log.info("Training resumed at round %d / %d.", fl_state.current_round, fl_state.total_rounds)
    return {"message": "Training resumed", "round": fl_state.current_round}
