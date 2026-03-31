"""
features.py — Extract 20 numerical features from raw email fields.
Raw email text never leaves this function — only the feature vector is used downstream.
"""

import re
import numpy as np
from typing import Dict

# ── Vocabulary sets ────────────────────────────────────────────────────────────

SPAM_KEYWORDS = {
    "free", "win", "winner", "prize", "click", "offer", "deal", "buy",
    "discount", "sale", "limited", "exclusive", "congratulations", "earn",
    "subscribe", "unsubscribe", "promotion", "guaranteed", "selected",
    "special", "bonus", "gift", "reward", "coupon", "cheap",
}

URGENCY_WORDS = {
    "urgent", "immediately", "asap", "expires", "deadline", "act now",
    "hurry", "last chance", "time sensitive", "respond now", "today only",
    "don't miss", "final notice", "warning", "alert",
}

MONEY_WORDS = {
    "money", "cash", "dollar", "bank", "account", "transfer", "payment",
    "invoice", "wire", "bitcoin", "crypto", "earn", "income", "profit",
    "revenue", "financial", "loan", "credit", "debt", "fund",
}

FEATURE_NAMES = [
    "word_count",           # 0  total words in body
    "char_count",           # 1  total characters in body
    "caps_ratio",           # 2  uppercase / total chars
    "exclamation_count",    # 3  number of !
    "question_count",       # 4  number of ?
    "url_count",            # 5  number of http/www links
    "spam_keyword_count",   # 6  hits from SPAM_KEYWORDS
    "digit_ratio",          # 7  digits / total chars
    "special_char_ratio",   # 8  $%*# / total chars
    "subject_length",       # 9  subject char length
    "subject_caps_ratio",   # 10 caps ratio in subject
    "subject_spam_keywords",# 11 spam keyword hits in subject
    "has_attachment",       # 12 binary 0/1
    "reply_to_mismatch",    # 13 sender domain != reply-to domain
    "sender_domain_len",    # 14 length of sender domain string
    "html_ratio",           # 15 html tag chars / total body chars
    "urgency_word_count",   # 16 hits from URGENCY_WORDS
    "money_word_count",     # 17 hits from MONEY_WORDS
    "personal_greeting",    # 18 1=named greeting, 0=generic
    "line_break_ratio",     # 19 newline count / word count
]

INPUT_DIM = len(FEATURE_NAMES)  # 20


# ── Helpers ────────────────────────────────────────────────────────────────────

def _domain(email: str) -> str:
    """Extract domain from an email address string."""
    match = re.search(r"@([\w.\-]+)", email)
    return match.group(1).lower() if match else ""


def _keyword_hits(text: str, vocab: set) -> int:
    text_lower = text.lower()
    return sum(1 for w in vocab if w in text_lower)


def _url_count(text: str) -> int:
    return len(re.findall(r"https?://|www\.", text, re.IGNORECASE))


def _html_ratio(text: str) -> float:
    html_chars = len(re.findall(r"<[^>]+>", text))
    return html_chars / max(len(text), 1)


# ── Main extractor ─────────────────────────────────────────────────────────────

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
    body    = body    or ""
    subject = subject or ""
    sender  = sender  or ""
    reply_to = reply_to or ""

    total_chars = max(len(body), 1)
    words       = body.split()
    word_count  = len(words)

    # body features
    caps_ratio        = sum(1 for c in body if c.isupper()) / total_chars
    digit_ratio       = sum(1 for c in body if c.isdigit()) / total_chars
    special_char_ratio = sum(1 for c in body if c in "$%*#@~^") / total_chars

    # subject features
    subj_len          = len(subject)
    subj_caps_ratio   = sum(1 for c in subject if c.isupper()) / max(len(subject), 1)
    subj_spam_kw      = _keyword_hits(subject, SPAM_KEYWORDS)

    # sender / routing
    sender_domain     = _domain(sender)
    reply_domain      = _domain(reply_to)
    reply_mismatch    = float(bool(reply_domain) and reply_domain != sender_domain)

    # personal greeting: check if body starts with "dear [name]" (not "dear customer/sir/user")
    generic_greetings = {"customer", "sir", "madam", "user", "friend", "member", "valued"}
    greeting_match    = re.match(r"dear\s+(\w+)", body.strip(), re.IGNORECASE)
    if greeting_match:
        first_word = greeting_match.group(1).lower()
        personal_greeting = 0.0 if first_word in generic_greetings else 1.0
    else:
        personal_greeting = 0.0

    features = np.array([
        min(word_count, 500) / 500,                          # 0  normalised word count
        min(total_chars, 3000) / 3000,                       # 1  normalised char count
        caps_ratio,                                          # 2
        min(body.count("!"), 20) / 20,                       # 3  normalised
        min(body.count("?"), 20) / 20,                       # 4
        min(_url_count(body), 20) / 20,                      # 5
        min(_keyword_hits(body, SPAM_KEYWORDS), 15) / 15,    # 6
        digit_ratio,                                         # 7
        special_char_ratio,                                  # 8
        min(subj_len, 150) / 150,                            # 9
        subj_caps_ratio,                                     # 10
        min(subj_spam_kw, 5) / 5,                            # 11
        float(has_attachment),                               # 12
        reply_mismatch,                                      # 13
        min(len(sender_domain), 50) / 50,                    # 14
        _html_ratio(body),                                   # 15
        min(_keyword_hits(body, URGENCY_WORDS), 10) / 10,    # 16
        min(_keyword_hits(body, MONEY_WORDS), 10) / 10,      # 17
        personal_greeting,                                   # 18
        min(body.count("\n"), 50) / 50,                      # 19 line break ratio
    ], dtype=np.float32)

    return features


def features_to_dict(vec: np.ndarray) -> Dict[str, float]:
    """Map feature vector back to named dict for dashboard display."""
    return {name: round(float(val), 4) for name, val in zip(FEATURE_NAMES, vec)}
