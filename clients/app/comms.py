import logging
import time
from typing import List, Tuple

import numpy as np
import requests

from .config import CLIENT_ID, MAX_RETRIES, POLL_INTERVAL, SERVER_URL

log = logging.getLogger("fl-client.comms")


def _get(path: str, **kwargs) -> requests.Response:
    return requests.get(f"{SERVER_URL}{path}", **kwargs)


def _post(path: str, **kwargs) -> requests.Response:
    return requests.post(f"{SERVER_URL}{path}", **kwargs)


def wait_for_server_ready() -> None:
    """Block until the server is in round_open state."""
    log.info("Waiting for server to start training...")
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = _get("/status", timeout=5)
            resp.raise_for_status()
            if resp.json()["state"] == "round_open":
                return
        except Exception:
            pass
        log.info("Server not ready — attempt %d/%d", attempt, MAX_RETRIES)
        time.sleep(POLL_INTERVAL)
    raise RuntimeError("Server did not start training in time.")


def register() -> None:
    """Register this client with the FL server."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = _post(f"/register?client_id={CLIENT_ID}", timeout=5)
            resp.raise_for_status()
            log.info("Registered as '%s'", CLIENT_ID)
            return
        except Exception as e:
            log.warning("Register attempt %d/%d failed: %s", attempt, MAX_RETRIES, e)
            time.sleep(POLL_INTERVAL)
    raise RuntimeError("Could not register with FL server after max retries.")


def fetch_weights() -> Tuple[List[np.ndarray], int]:
    """Download current global weights. Returns (weights, round_number)."""
    resp = _get("/weights", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    weights = [
        np.array(w, dtype=np.float32).reshape(s)
        for w, s in zip(data["weights"], data["shapes"])
    ]
    return weights, data["round"]


def submit(weights: List[np.ndarray], num_samples: int, loss: float, accuracy: float) -> None:
    """Upload locally trained weights + metrics to the server."""
    payload = {
        "client_id": CLIENT_ID,
        "num_samples": num_samples,
        "weights": [w.flatten().tolist() for w in weights],
        "shapes": [list(w.shape) for w in weights],
        "loss": loss,
        "accuracy": accuracy,
    }
    resp = _post("/submit", json=payload, timeout=30)
    resp.raise_for_status()


def wait_for_next_round(current_round: int) -> str:
    """
    Poll /status until next round opens or training finishes.
    Returns 'next_round' or 'finished'.
    """
    log.info("Waiting for round %d to open...", current_round + 1)
    while True:
        try:
            resp = _get("/status", timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if data["state"] == "finished":
                return "finished"
            if data["state"] == "round_open" and data["current_round"] > current_round:
                return "next_round"
        except Exception as e:
            log.warning("Status poll failed: %s", e)
        time.sleep(POLL_INTERVAL)
