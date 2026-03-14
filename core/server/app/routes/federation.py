import logging
import sys
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from ..aggregation import aggregate_and_advance
from ..config import MIN_CLIENTS
from ..schemas import RegisterResponse, SubmitRequest
from ..state import ServerState, fl_state

sys.path.insert(0, str(Path(__file__).parents[3]))
from shared.model import build_model, get_weights as get_model_weights  # noqa: E402

log = logging.getLogger("fl-server.federation")
router = APIRouter()


@router.post("/register", response_model=RegisterResponse, tags=["federation"])
async def register(client_id: str):
    """Client announces itself to the server. Allowed in WAITING and ROUND_OPEN states."""
    async with fl_state.lock:
        if fl_state.state == ServerState.FINISHED:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Training is already finished.",
            )
        fl_state.clients[client_id] = {"registered_at_round": fl_state.current_round}

    log.info("Client registered: %s  (total=%d)", client_id, len(fl_state.clients))
    return RegisterResponse(client_id=client_id, message="Registered successfully")


@router.get("/weights", tags=["federation"])
def get_weights():
    """Client downloads current global weights."""
    if fl_state.state != ServerState.ROUND_OPEN:
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail=f"Weights not available in state '{fl_state.state}'",
        )
    return JSONResponse(content={
        "round":   fl_state.current_round,
        "weights": [w.flatten().tolist() for w in fl_state.global_weights],
        "shapes":  [list(w.shape) for w in fl_state.global_weights],
    })


@router.post("/submit", tags=["federation"])
async def submit_weights(req: SubmitRequest):
    """Client submits locally trained weights after local training."""
    async with fl_state.lock:
        if fl_state.state != ServerState.ROUND_OPEN:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Not accepting submissions in state '{fl_state.state}'",
            )
        if req.client_id not in fl_state.clients:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unknown client. Call POST /register first.",
            )
        if req.client_id in fl_state.submissions:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already submitted for this round.",
            )

        fl_state.submissions[req.client_id] = {
            "weights": [
                np.array(w, dtype=np.float32).reshape(s)
                for w, s in zip(req.weights, req.shapes)
            ],
            "num_samples": req.num_samples,
            "loss":        req.loss,
            "accuracy":    req.accuracy,
        }

        log.info(
            "Round %d — submission from %s (%d/%d)",
            fl_state.current_round, req.client_id,
            len(fl_state.submissions), len(fl_state.clients),
        )

        all_submitted = len(fl_state.submissions) >= max(MIN_CLIENTS, len(fl_state.clients))

    if all_submitted:
        await aggregate_and_advance(fl_state)

    return {"message": "Submission received", "round": fl_state.current_round}


@router.post("/clients/{client_id}/kick", tags=["federation"])
async def kick_client(client_id: str):
    """
    Remove a client from the active session.
    Simulates a dropout / stragglers scenario.
    If all remaining clients have now submitted, triggers aggregation.
    """
    async with fl_state.lock:
        if fl_state.state not in (ServerState.ROUND_OPEN, ServerState.AGGREGATING):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot kick in state '{fl_state.state}'",
            )
        if client_id not in fl_state.clients:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client '{client_id}' not found.",
            )

        fl_state.clients.pop(client_id)
        fl_state.submissions.pop(client_id, None)  # drop their submission if it existed

        remaining = len(fl_state.clients)
        submitted = len(fl_state.submissions)
        all_submitted = remaining > 0 and submitted >= max(MIN_CLIENTS, remaining)

    log.warning("Client '%s' kicked. Remaining=%d  Submitted=%d", client_id, remaining, submitted)

    if all_submitted:
        await aggregate_and_advance(fl_state)

    return {"message": f"Client '{client_id}' kicked", "remaining_clients": remaining}


@router.post("/clients/{client_id}/kick-and-restart", tags=["federation"])
async def kick_and_restart(client_id: str):
    """
    Remove a client permanently and immediately restart training with the same config.
    Works in any state that has an active or completed session.
    Remaining clients will detect the new session and re-register automatically.
    """
    async with fl_state.lock:
        if fl_state.state == ServerState.WAITING and fl_state.current_round == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No active session to restart.",
            )
        if client_id not in fl_state.clients:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client '{client_id}' not found.",
            )
        if fl_state.training_config is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No training config saved — cannot restart.",
            )

        config = fl_state.training_config.copy()
        fl_state.reset()
        fl_state.model          = build_model(input_dim=config["input_dim"], num_classes=config["num_classes"])
        fl_state.global_weights = get_model_weights(fl_state.model)
        fl_state.total_rounds   = config["total_rounds"]
        fl_state.current_round  = 1
        fl_state.training_config = config
        fl_state.state          = ServerState.ROUND_OPEN

    log.warning(
        "Client '%s' kicked and training restarted — round 1 / %d open.",
        client_id, config["total_rounds"],
    )
    return {"message": f"Client '{client_id}' kicked. Training restarted.", "round": 1}
