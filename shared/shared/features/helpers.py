"""Low-level text helpers shared across feature extractors."""

import re
from .vocabulary import SPAM_KEYWORDS


def domain(email: str) -> str:
    """Extract domain from an email address string."""
    match = re.search(r"@([\w.\-]+)", email)
    return match.group(1).lower() if match else ""


def keyword_hits(text: str, vocab: set) -> int:
    text_lower = text.lower()
    return sum(1 for w in vocab if w in text_lower)


def url_count(text: str) -> int:
    return len(re.findall(r"https?://|www\.", text, re.IGNORECASE))


def html_ratio(text: str) -> float:
    html_chars = len(re.findall(r"<[^>]+>", text))
    return html_chars / max(len(text), 1)
