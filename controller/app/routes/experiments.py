"""
experiments.py — Retrieve stored experiment runs from SQLite.
"""

import json
import math
from typing import Any

from fastapi import APIRouter, HTTPException

from .. import db

router = APIRouter(prefix="/experiments", tags=["experiments"])


def _sanitize(obj: Any) -> Any:
    """Recursively replace NaN/Inf floats so FastAPI can JSON-serialize them."""
    if isinstance(obj, float):
        return 0.0 if not math.isfinite(obj) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


@router.get("")
def list_experiments():
    """Return all training runs newest-first, with parsed metrics."""
    runs = db.list_runs()
    for r in runs:
        raw = r.pop("metrics_json", None)
        r["metrics"] = _sanitize(json.loads(raw)) if raw else {}
        # also sanitize top-level float columns
        r["final_accuracy"] = _sanitize(r.get("final_accuracy", 0.0))
        r["final_loss"]     = _sanitize(r.get("final_loss", 0.0))
    return runs


@router.delete("/{run_id}", status_code=204)
def delete_experiment(run_id: int):
    if not db.delete_run(run_id):
        raise HTTPException(404, f"run {run_id} not found")
