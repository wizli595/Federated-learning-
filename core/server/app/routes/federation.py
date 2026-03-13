import logging

import numpy as np
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from ..aggregation import aggregate_and_advance
from ..config import MIN_CLIENTS
from ..schemas import RegisterResponse, SubmitRequest
from ..state import ServerState, fl_state

log = logging.getLogger("fl-server.federation")
router = APIRouter()


@router.post("/register", response_model=RegisterResponse, tags=["federation"])
async def register(client_id: str):
    """Client announces itself to the server."""
    async with fl_state.lock:
        if fl_state.state == ServerState.WAITING:
            raise HTTPException(
                status_code=status.HTTP_425_TOO_EARLY,
                detail="Server not started. Call POST /start first.",
            )
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
        "round": fl_state.current_round,
        "weights": [w.flatten().tolist() for w in fl_state.global_weights],
        "shapes": [list(w.shape) for w in fl_state.global_weights],
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
            "loss": req.loss,
            "accuracy": req.accuracy,
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
