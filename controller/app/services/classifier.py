"""
classifier.py — Load the trained global model and classify email feature vectors.
The feature extraction mirrors what would happen on-device in a real FL deployment.
"""

import sys
from pathlib import Path
from typing import Dict, Optional

import torch

ROOT   = Path(__file__).parent.parent.parent.parent
FL_DIR = ROOT / "fl"
sys.path.insert(0, str(FL_DIR))

from shared.features import extract_features, features_to_dict   # noqa: E402
from shared.model    import build_model, INPUT_DIM, NUM_CLASSES   # noqa: E402

BEST_MODEL_PATH   = FL_DIR / "output" / "best_model.pt"
GLOBAL_MODEL_PATH = FL_DIR / "output" / "global_model.pt"

_cache: Optional[torch.nn.Module] = None
_cache_mtime: float = 0.0


def _model_path() -> Path:
    """Prefer best_model.pt (peak accuracy) over global_model.pt (last round)."""
    return BEST_MODEL_PATH if BEST_MODEL_PATH.exists() else GLOBAL_MODEL_PATH


def _load_model() -> torch.nn.Module:
    """Load model from disk; reload when file changes between runs."""
    global _cache, _cache_mtime

    path = _model_path()
    if not path.exists():
        raise FileNotFoundError(
            "No trained model found. "
            "Complete at least one training run before classifying."
        )

    mtime = path.stat().st_mtime
    if _cache is None or mtime != _cache_mtime:
        model = build_model(INPUT_DIM, NUM_CLASSES)
        sd = torch.load(path, map_location="cpu", weights_only=True)
        # Guard: DP noise can flip running_var negative → NaN in LayerNorm/BN eval
        for key in sd:
            if "running_var" in key:
                sd[key] = sd[key].clamp(min=1e-5)
        model.load_state_dict(sd)
        model.eval()
        _cache       = model
        _cache_mtime = mtime

    return _cache


# Spam classification threshold.
# Using 0.4 (not 0.5) to catch moderate spam patterns that have fewer explicit
# keywords than the generated training data but are clearly non-legitimate.
# Ham emails score P(spam) ≈ 0.05-0.10; real spam scores P(spam) ≈ 0.40-0.99.
SPAM_THRESHOLD = 0.4


def classify(
    subject: str,
    body: str,
    sender: str,
    reply_to: str,
    has_attachment: bool,
) -> Dict:
    """
    Extract 20 features from raw email fields, run inference, return result dict.
    Raises FileNotFoundError if model is not trained yet.
    """
    features = extract_features(subject, body, sender, has_attachment, reply_to)
    model    = _load_model()

    x = torch.tensor(features).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0]

    spam_score = float(probs[1].item())
    label      = "spam" if spam_score >= SPAM_THRESHOLD else "ham"
    confidence = spam_score if label == "spam" else float(probs[0].item())

    return {
        "label":             label,
        "confidence":        round(confidence, 4),
        "spam_score":        round(spam_score, 4),
        "feature_breakdown": features_to_dict(features),
    }
