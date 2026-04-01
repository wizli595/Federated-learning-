"""
classifier.py — Load the trained global model and classify email feature vectors.
The feature extraction mirrors what would happen on-device in a real FL deployment.
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import torch

ROOT   = Path(__file__).parent.parent.parent.parent
FL_DIR = ROOT / "fl"
sys.path.insert(0, str(FL_DIR))

from shared.features import extract_features, features_to_dict, FEATURE_NAMES   # noqa: E402
from shared.model    import build_model, INPUT_DIM, NUM_CLASSES                 # noqa: E402

BEST_MODEL_PATH   = FL_DIR / "output" / "best_model.pt"
GLOBAL_MODEL_PATH = FL_DIR / "output" / "global_model.pt"

# Per-path cache: key = str(path), value = (model, mtime)
_cache: dict = {}


def _global_model_path() -> Path:
    """Prefer best_model.pt (peak accuracy) over global_model.pt (last round)."""
    return BEST_MODEL_PATH if BEST_MODEL_PATH.exists() else GLOBAL_MODEL_PATH


def _load_model(client_id: Optional[str] = None) -> tuple:
    """Load model from disk; return (model, model_type).

    Lookup order:
      1. fl/data/{client_id}/model.pt  — personalized after fine-tuning
      2. fl/output/best_model.pt       — global best checkpoint
      3. fl/output/global_model.pt     — global last round
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
    client_id: Optional[str] = None,
) -> Dict:
    """
    Extract 20 features from raw email fields, run inference, return result dict.
    Uses the client's personalized model if available, else the global model.
    Raises FileNotFoundError if no model is trained yet.
    """
    features           = extract_features(subject, body, sender, has_attachment, reply_to)
    model, model_type  = _load_model(client_id=client_id)

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
        "model_type":        model_type,
        "feature_breakdown": features_to_dict(features),
    }


def export_onnx(client_id: Optional[str] = None) -> tuple:
    """Export the model for *client_id* to ONNX format.
    Returns (raw_bytes: bytes, model_type: str).
    Raises FileNotFoundError if no model has been trained yet.
    """
    import io
    model, model_type = _load_model(client_id=client_id)
    buf   = io.BytesIO()
    dummy = torch.zeros(1, INPUT_DIM)
    torch.onnx.export(
        model, dummy, buf,
        input_names=["features"],
        output_names=["logits"],
        dynamic_axes={"features": {0: "batch_size"}},
        opset_version=17,
        verbose=False,
    )
    buf.seek(0)
    return buf.read(), model_type


def classify_batch_features(
    features_matrix: np.ndarray,
    client_id: Optional[str] = None,
) -> List[Dict]:
    """Batch inference on pre-extracted feature vectors (shape N×INPUT_DIM).
    Single forward pass for all rows — far more efficient than calling classify() N times.
    """
    model, model_type = _load_model(client_id=client_id)
    arr = np.asarray(features_matrix, dtype=np.float32)
    x   = torch.tensor(arr)

    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)  # (N, 2)

    results: List[Dict] = []
    for i in range(len(arr)):
        spam_score = float(probs[i, 1].item())
        label      = "spam" if spam_score >= SPAM_THRESHOLD else "ham"
        confidence = spam_score if label == "spam" else float(probs[i, 0].item())
        results.append({
            "label":             label,
            "confidence":        round(confidence, 4),
            "spam_score":        round(spam_score, 4),
            "model_type":        model_type,
            "feature_breakdown": {
                name: round(float(arr[i, j]), 4)
                for j, name in enumerate(FEATURE_NAMES)
            },
        })
    return results
