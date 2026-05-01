"""
model_loader.py — Load and cache trained .pt models for inference.

Lookup order per client:
  1. fl/data/{client_id}/model.pt  — personalized after fine-tuning
  2. fl/output/best_model.pt       — global best checkpoint
  3. fl/output/global_model.pt     — global last round

Models are cached by path + mtime so reloads happen automatically
when a new training run finishes.
"""

from pathlib import Path
from typing import Optional

import torch

from shared.model import build_model, INPUT_DIM, NUM_CLASSES

ROOT   = Path(__file__).parent.parent.parent.parent
FL_DIR = ROOT / "fl"

BEST_MODEL_PATH   = FL_DIR / "output" / "best_model.pt"
GLOBAL_MODEL_PATH = FL_DIR / "output" / "global_model.pt"

# Per-path cache: key = str(path), value = (model, mtime)
_cache: dict = {}


def _global_model_path() -> Path:
    """Prefer best_model.pt (peak accuracy) over global_model.pt (last round)."""
    return BEST_MODEL_PATH if BEST_MODEL_PATH.exists() else GLOBAL_MODEL_PATH


def load_model(client_id: Optional[str] = None) -> tuple:
    """
    Load model from disk; return (model, model_type).
    Raises FileNotFoundError if no model has been trained yet.
    """
    if client_id:
        client_path = FL_DIR / "data" / client_id / "model.pt"
        if client_path.exists():
            path       = client_path
            model_type = "personalized"
        else:
            path       = _global_model_path()
            model_type = "global"
    else:
        path       = _global_model_path()
        model_type = "global"

    if not path.exists():
        raise FileNotFoundError(
            "No trained model found. "
            "Complete at least one training run before classifying."
        )

    cache_key = str(path)
    mtime     = path.stat().st_mtime
    cached    = _cache.get(cache_key)
    if cached is None or cached[1] != mtime:
        model = build_model(INPUT_DIM, NUM_CLASSES)
        sd    = torch.load(path, map_location="cpu", weights_only=True)
        model.load_state_dict(sd)
        model.eval()
        _cache[cache_key] = (model, mtime)

    return _cache[cache_key][0], model_type
