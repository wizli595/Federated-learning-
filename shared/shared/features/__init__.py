"""Feature extraction package — re-exports the public API."""

from .vocabulary import (
    FEATURE_NAMES,
    INPUT_DIM,
    SPAM_KEYWORDS,
    URGENCY_WORDS,
    MONEY_WORDS,
)
from .extract import extract_features, features_to_dict
from .helpers import domain, keyword_hits, url_count, html_ratio

__all__ = [
    "FEATURE_NAMES",
    "INPUT_DIM",
    "SPAM_KEYWORDS",
    "URGENCY_WORDS",
    "MONEY_WORDS",
    "extract_features",
    "features_to_dict",
    "domain",
    "keyword_hits",
    "url_count",
    "html_ratio",
]
