"""
classifier.py — Email classification using the trained FL model.

Extracts 20 features from raw email fields, runs inference, returns
a result dict with label, confidence, and feature breakdown.
"""

from typing import Dict, List, Optional

import numpy as np
import torch

from shared.features import extract_features, features_to_dict, FEATURE_NAMES
from shared.model import INPUT_DIM

from .model_loader import load_model

# Using 0.4 (not 0.5) to catch moderate spam patterns that have fewer explicit
# keywords than the generated training data but are clearly non-legitimate.
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
    Raises FileNotFoundError if no model is trained yet.
    """
    features           = extract_features(subject, body, sender, has_attachment, reply_to)
    model, model_type  = load_model(client_id=client_id)

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


def classify_batch_features(
    features_matrix: np.ndarray,
    client_id: Optional[str] = None,
) -> List[Dict]:
    """Batch inference on pre-extracted feature vectors (shape N x INPUT_DIM)."""
    model, model_type = load_model(client_id=client_id)
    arr = np.asarray(features_matrix, dtype=np.float32)
    x   = torch.tensor(arr)

    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)

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


def export_onnx(client_id: Optional[str] = None) -> tuple:
    """Export the model to ONNX format. Returns (raw_bytes, model_type)."""
    import io
    model, model_type = load_model(client_id=client_id)
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
