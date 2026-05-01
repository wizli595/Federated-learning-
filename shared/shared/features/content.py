"""Content analysis features (indices 15-19): html, urgency, money, greeting, linebreaks."""

import re

from .helpers import keyword_hits, html_ratio
from .vocabulary import URGENCY_WORDS, MONEY_WORDS

_GENERIC_GREETINGS = {"customer", "sir", "madam", "user", "friend", "member", "valued"}


def content_features(body: str) -> list:
    """Extract 5 normalised content-analysis features from body text."""
    # personal greeting detection
    greeting_match = re.match(r"dear\s+(\w+)", body.strip(), re.IGNORECASE)
    if greeting_match:
        first_word = greeting_match.group(1).lower()
        personal_greeting = 0.0 if first_word in _GENERIC_GREETINGS else 1.0
    else:
        personal_greeting = 0.0

    return [
        html_ratio(body),                                        # 15 html_ratio
        min(keyword_hits(body, URGENCY_WORDS), 10) / 10,         # 16 urgency_word_count
        min(keyword_hits(body, MONEY_WORDS), 10) / 10,           # 17 money_word_count
        personal_greeting,                                       # 18 personal_greeting
        min(body.count("\n"), 50) / 50,                          # 19 line_break_ratio
    ]
