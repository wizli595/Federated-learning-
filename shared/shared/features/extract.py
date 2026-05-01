"""Main feature extractor — assembles the 4 feature groups into one vector."""

import numpy as np
from typing import Dict

from .vocabulary import FEATURE_NAMES
from .body import body_features
from .subject import subject_features
from .sender import sender_features
from .content import content_features


def extract_features(
    subject: str,
    body: str,
    sender: str,
    has_attachment: bool = False,
    reply_to: str = "",
) -> np.ndarray:
    """
    Convert raw email fields into a 20-dimensional feature vector.
    Returns np.ndarray of shape (20,) with dtype float32.
    Raw text is never stored or transmitted — only this vector is used.
    """
    body = body or ""
    subject = subject or ""
    sender = sender or ""
    reply_to = reply_to or ""

    features = (
        body_features(body)                              # 0-8
        + subject_features(subject)                      # 9-11
        + sender_features(sender, reply_to, has_attachment)  # 12-14
        + content_features(body)                         # 15-19
    )

    return np.array(features, dtype=np.float32)


def features_to_dict(vec: np.ndarray) -> Dict[str, float]:
    """Map feature vector back to named dict for dashboard display."""
    return {name: round(float(val), 4) for name, val in zip(FEATURE_NAMES, vec)}
