"""
startup.py — One-time startup tasks for the controller.
"""

import json

from .services.flower import METRICS


def reset_stale_training() -> None:
    """If metrics.json says 'training' from a previous crash, reset to 'idle'."""
    if not METRICS.exists():
        return
    try:
        with open(METRICS) as f:
            m = json.load(f)
        if m.get("status") in ("training", "waiting"):
            m["status"] = "idle"
            with open(METRICS, "w") as f:
                json.dump(m, f, indent=2)
            print("[controller] reset stale training state -> idle", flush=True)
    except Exception:
        pass
