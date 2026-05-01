"""Body text features (indices 0-8): word/char counts, ratios, urls, spam keywords."""

from .helpers import keyword_hits, url_count
from .vocabulary import SPAM_KEYWORDS


def body_features(body: str) -> list:
    """Extract 9 normalised features from email body text."""
    total_chars = max(len(body), 1)
    words = body.split()
    word_count = len(words)

    caps_ratio = sum(1 for c in body if c.isupper()) / total_chars
    digit_ratio = sum(1 for c in body if c.isdigit()) / total_chars
    special_char_ratio = sum(1 for c in body if c in "$%*#@~^") / total_chars

    return [
        min(word_count, 500) / 500,                          # 0  word_count
        min(total_chars, 3000) / 3000,                       # 1  char_count
        caps_ratio,                                          # 2  caps_ratio
        min(body.count("!"), 20) / 20,                       # 3  exclamation_count
        min(body.count("?"), 20) / 20,                       # 4  question_count
        min(url_count(body), 20) / 20,                       # 5  url_count
        min(keyword_hits(body, SPAM_KEYWORDS), 15) / 15,     # 6  spam_keyword_count
        digit_ratio,                                         # 7  digit_ratio
        special_char_ratio,                                  # 8  special_char_ratio
    ]
