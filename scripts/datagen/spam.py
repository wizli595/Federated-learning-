"""
Spam email feature generators.

Each function returns a float32 ndarray of shape (20,) matching the
feature order defined in fl/shared/features.py (FEATURE_NAMES).
"""

import numpy as np


def marketing_spam(rng: np.random.Generator) -> np.ndarray:
    """Bulk promo email — many URLs, spam keywords, HTML, exclamations.
    Calibrated: 5–15 URLs → 0.25–0.75; 5–12 spam keywords → 0.33–0.80."""
    return np.array([
        rng.uniform(0.20, 0.60),   # 0  word_count      100–300 words / 500
        rng.uniform(0.17, 0.67),   # 1  char_count      500–2000 chars / 3000
        rng.uniform(0.03, 0.10),   # 2  caps_ratio      ~3–10% (headers, brand)
        rng.uniform(0.15, 0.50),   # 3  exclamation     3–10 / 20
        rng.uniform(0.00, 0.15),   # 4  question        0–3 / 20
        rng.uniform(0.25, 0.75),   # 5  url_count       5–15 links / 20  ← key signal
        rng.uniform(0.33, 0.80),   # 6  spam_keywords   5–12 hits / 15   ← key signal
        rng.uniform(0.02, 0.08),   # 7  digit_ratio     ~2–8%
        rng.uniform(0.03, 0.10),   # 8  special_chars   ~3–10% ($, %)
        rng.uniform(0.27, 0.67),   # 9  subject_length  40–100 chars / 150
        rng.uniform(0.05, 0.20),   # 10 subject_caps    ~5–20%
        rng.uniform(0.40, 0.80),   # 11 subj_spam_kw    2–4 hits / 5     ← key signal
        rng.choice([0.0, 1.0], p=[0.90, 0.10]),   # 12 has_attachment
        rng.choice([0.0, 1.0], p=[0.55, 0.45]),   # 13 reply_mismatch
        rng.uniform(0.20, 0.40),   # 14 sender_domain   10–20 chars / 50
        rng.uniform(0.30, 0.70),   # 15 html_ratio      heavy HTML
        rng.uniform(0.10, 0.30),   # 16 urgency         1–3 hits / 10
        rng.uniform(0.20, 0.50),   # 17 money_words     2–5 hits / 10
        rng.choice([0.0, 1.0], p=[0.90, 0.10]),   # 18 personal_greeting (generic)
        rng.uniform(0.01, 0.10),   # 19 line_break_ratio
    ], dtype=np.float32)


def newsletter_spam(rng: np.random.Generator) -> np.ndarray:
    """Borderline spam newsletter — moderate keywords, looks like legit newsletter."""
    return np.array([
        rng.uniform(0.15, 0.50),   # 0  word_count      75–250 words / 500
        rng.uniform(0.13, 0.50),   # 1  char_count      400–1500 chars / 3000
        rng.uniform(0.01, 0.06),   # 2  caps_ratio      low — looks legit
        rng.uniform(0.05, 0.25),   # 3  exclamation     1–5 / 20
        rng.uniform(0.00, 0.10),   # 4  question        0–2 / 20
        rng.uniform(0.15, 0.45),   # 5  url_count       3–9 links / 20
        rng.uniform(0.13, 0.40),   # 6  spam_keywords   2–6 hits / 15
        rng.uniform(0.01, 0.08),   # 7  digit_ratio
        rng.uniform(0.02, 0.08),   # 8  special_chars
        rng.uniform(0.20, 0.60),   # 9  subject_length  30–90 chars / 150
        rng.uniform(0.01, 0.08),   # 10 subject_caps    low
        rng.uniform(0.20, 0.60),   # 11 subj_spam_kw    1–3 hits / 5
        rng.choice([0.0, 1.0], p=[0.90, 0.10]),   # 12 has_attachment
        rng.choice([0.0, 1.0], p=[0.60, 0.40]),   # 13 reply_mismatch
        rng.uniform(0.20, 0.50),   # 14 sender_domain
        rng.uniform(0.25, 0.65),   # 15 html_ratio
        rng.uniform(0.05, 0.20),   # 16 urgency         1–2 hits / 10
        rng.uniform(0.10, 0.30),   # 17 money_words     1–3 hits / 10
        rng.choice([0.0, 1.0], p=[0.70, 0.30]),   # 18 personal_greeting
        rng.uniform(0.02, 0.12),   # 19 line_break_ratio
    ], dtype=np.float32)


def phishing_spam(rng: np.random.Generator) -> np.ndarray:
    """Credential-harvesting email.
    Key signals: caps 25–80%, urgency 3–8 words, reply_mismatch almost always.
    Realistic range: some phishing has zero spam keywords (avoids filters),
    some has low money_words and very short bodies (high line_break_ratio).
    All ranges verified against extract_features() output from real phishing text."""
    return np.array([
        rng.uniform(0.04, 0.20),   # 0  word_count      20–100 words / 500 (short!)
        rng.uniform(0.03, 0.20),   # 1  char_count      90–600 chars / 3000
        rng.uniform(0.25, 0.80),   # 2  caps_ratio      25–80% CAPS  ← key signal
        rng.uniform(0.10, 0.60),   # 3  exclamation     2–12 / 20
        rng.uniform(0.00, 0.10),   # 4  question        0–2 / 20
        rng.uniform(0.00, 0.20),   # 5  url_count       0–4 links / 20 (bait link or none)
        rng.uniform(0.00, 0.33),   # 6  spam_keywords   0–5 hits / 15 (avoids kw filters)
        rng.uniform(0.00, 0.05),   # 7  digit_ratio
        rng.uniform(0.00, 0.05),   # 8  special_chars
        rng.uniform(0.13, 0.53),   # 9  subject_length  20–80 chars / 150
        rng.uniform(0.10, 0.95),   # 10 subject_caps    10–95% (covers "WARNING: ..." mixed case)
        rng.uniform(0.00, 0.40),   # 11 subj_spam_kw    0–2 hits / 5 (subject may have no kw)
        rng.choice([0.0, 1.0], p=[0.50, 0.50]),   # 12 has_attachment (fake invoice)
        rng.choice([0.0, 1.0], p=[0.10, 0.90]),   # 13 reply_mismatch — 90%  ← key signal
        rng.uniform(0.30, 0.70),   # 14 sender_domain   long suspicious domain
        rng.uniform(0.00, 0.30),   # 15 html_ratio      plain or lightly formatted
        rng.uniform(0.30, 0.80),   # 16 urgency         3–8 hits / 10  ← key signal
        rng.uniform(0.05, 0.60),   # 17 money_words     0.5–6 hits / 10 (account, bank)
        rng.choice([0.0, 1.0], p=[0.92, 0.08]),   # 18 personal_greeting (generic)
        rng.uniform(0.01, 0.45),   # 19 line_break_ratio short bodies have high ratio
    ], dtype=np.float32)


def social_engineering_spam(rng: np.random.Generator) -> np.ndarray:
    """Advance-fee / money scam — looks personal, low URLs, very high money words.
    Calibrated: 4–8 money words → 0.40–0.80; reply_mismatch 65% of the time."""
    return np.array([
        rng.uniform(0.16, 0.40),   # 0  word_count      80–200 words / 500
        rng.uniform(0.13, 0.40),   # 1  char_count      400–1200 chars / 3000
        rng.uniform(0.02, 0.10),   # 2  caps_ratio      ~2–10% (looks personal)
        rng.uniform(0.00, 0.15),   # 3  exclamation     0–3 / 20
        rng.uniform(0.05, 0.25),   # 4  question        1–5 / 20 ("can you help me?")
        rng.uniform(0.00, 0.10),   # 5  url_count       0–2 links / 20  ← key: LOW
        rng.uniform(0.07, 0.27),   # 6  spam_keywords   1–4 hits / 15
        rng.uniform(0.01, 0.05),   # 7  digit_ratio
        rng.uniform(0.01, 0.04),   # 8  special_chars
        rng.uniform(0.20, 0.53),   # 9  subject_length  30–80 chars / 150
        rng.uniform(0.02, 0.15),   # 10 subject_caps    ~2–15%
        rng.uniform(0.20, 0.60),   # 11 subj_spam_kw    1–3 hits / 5
        rng.choice([0.0, 1.0], p=[0.55, 0.45]),   # 12 has_attachment
        rng.choice([0.0, 1.0], p=[0.35, 0.65]),   # 13 reply_mismatch — 65%  ← key signal
        rng.uniform(0.25, 0.50),   # 14 sender_domain
        rng.uniform(0.00, 0.15),   # 15 html_ratio      plain text (looks personal)
        rng.uniform(0.20, 0.50),   # 16 urgency         2–5 hits / 10
        rng.uniform(0.40, 0.80),   # 17 money_words     4–8 hits / 10  ← key signal
        rng.choice([0.0, 1.0], p=[0.45, 0.55]),   # 18 personal_greeting
        rng.uniform(0.02, 0.18),   # 19 line_break_ratio
    ], dtype=np.float32)


SPAM_FNS = {
    "marketing":          marketing_spam,
    "newsletter":         newsletter_spam,
    "phishing":           phishing_spam,
    "social_engineering": social_engineering_spam,
}
