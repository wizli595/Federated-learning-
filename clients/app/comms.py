import logging
import time
from typing import List, Tuple

import numpy as np
import requests

from .config import CLIENT_ID, POLL_INTERVAL, SERVER_URL

log = logging.getLogger("fl-client.comms")


def _get(path: str, **kwargs) -> requests.Response:
    return requests.get(f"{SERVER_URL}{path}", **kwargs)


def _post(path: str, **kwargs) -> requests.Response:
    return requests.post(f"{SERVER_URL}{path}", **kwargs)


def wait_for_server_reachable() -> None:
    """Block indefinitely until the server responds (any state)."""
    log.info("Waiting for FL server to be reachable...")
    attempt = 0
    while True:
        try:
            resp = _get("/status", timeout=5)
            resp.raise_for_status()
            log.info("Server reachable — state: %s", resp.json().get("state"))
            return
        except Exception:
            pass
        attempt += 1
        log.info("Server unreachable — attempt %d (will keep retrying)", attempt)
        time.sleep(POLL_INTERVAL)


def wait_for_round_open() -> None:
    """Block indefinitely until the server enters round_open state."""
    log.info("Waiting for training to start (round_open)...")
    while True:
        try:
            resp = _get("/status", timeout=5)
            resp.raise_for_status()
            if resp.json()["state"] == "round_open":
                return
        except Exception:
            pass
        time.sleep(POLL_INTERVAL)


def register() -> None:
    """Register this client with the FL server."""
    attempt = 0
    while True:
        try:
            resp = _post(f"/register?client_id={CLIENT_ID}", timeout=5)
            resp.raise_for_status()
            log.info("Registered as '%s'", CLIENT_ID)
            return
        except Exception as e:
            attempt += 1
            log.warning("Register attempt %d failed: %s", attempt, e)
            time.sleep(POLL_INTERVAL)


def fetch_weights() -> Tuple[List[np.ndarray], int, str, float]:
    """Download current global weights. Returns (weights, round_number, algorithm, mu)."""
    resp = _get("/weights", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    weights = [
        np.array(w, dtype=np.float32).reshape(s)
        for w, s in zip(data["weights"], data["shapes"])
    ]
    return weights, data["round"], data.get("algorithm", "fedavg"), data.get("mu", 0.0)


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


def fetch_training_config() -> dict:
    """
    Fetch server-side training hyperparameters (epochs, lr).
    Falls back to local config values if the endpoint is unavailable.
    """
    try:
        resp = _get("/training-config", timeout=5)
        resp.raise_for_status()
        cfg = resp.json()
        log.info(
            "Training config from server — local_epochs=%d  lr=%s",
            cfg["local_epochs"], cfg["learning_rate"],
        )
        return cfg
    except Exception as e:
        log.warning("Could not fetch training config from server (%s). Using local defaults.", e)
        return {}


def wait_for_next_round(current_round: int) -> str:
    """
    Poll /status until the next round opens, training finishes, or the server is paused.
    Returns 'next_round', 'finished', or 'server_reset' (paused / restarted).
    """
    log.info("Waiting for round %d to open...", current_round + 1)
    while True:
        try:
            resp = _get("/status", timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if data["state"] == "finished":
                return "finished"
            if data["state"] == "waiting":
                log.warning("Server entered WAITING state — training was paused or reset.")
                return "server_reset"
            if data["state"] == "round_open" and data["current_round"] > current_round:
                return "next_round"
        except Exception as e:
            log.warning("Status poll failed: %s", e)
        time.sleep(POLL_INTERVAL)
