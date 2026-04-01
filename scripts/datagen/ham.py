"""
Ham email feature generators.

Each function returns a float32 ndarray of shape (20,) matching the
feature order defined in fl/shared/features.py (FEATURE_NAMES).

All ranges are calibrated to match extract_features() output from real email text.
e.g. url_count = min(actual_urls, 20)/20  →  5 URLs = 0.25, 10 URLs = 0.50
"""

import numpy as np


def personal_ham(rng: np.random.Generator) -> np.ndarray:
    """Casual personal email — 20-150 words, almost no spam signals."""
    return np.array([
        rng.uniform(0.04, 0.30),   # 0  word_count      20–150 words / 500
        rng.uniform(0.03, 0.30),   # 1  char_count      100–900 chars / 3000
        rng.uniform(0.01, 0.05),   # 2  caps_ratio      ~1–5%
        rng.uniform(0.00, 0.10),   # 3  exclamation     0–2 / 20
        rng.uniform(0.00, 0.20),   # 4  question        0–4 / 20
        rng.uniform(0.00, 0.05),   # 5  url_count       0–1 link / 20
        rng.uniform(0.00, 0.07),   # 6  spam_keywords   0–1 hits / 15
        rng.uniform(0.00, 0.03),   # 7  digit_ratio     ~0–3%
        rng.uniform(0.00, 0.01),   # 8  special_chars   ~0–1%
        rng.uniform(0.03, 0.27),   # 9  subject_length  5–40 chars / 150
        rng.uniform(0.00, 0.08),   # 10 subject_caps    ~0–8%
        rng.uniform(0.00, 0.00),   # 11 subj_spam_kw    0 hits (personal subject)
        rng.choice([0.0, 1.0], p=[0.70, 0.30]),   # 12 has_attachment (photos)
        rng.choice([0.0, 1.0], p=[0.98, 0.02]),   # 13 reply_mismatch — almost never
        rng.uniform(0.10, 0.30),   # 14 sender_domain   5–15 chars / 50
        rng.uniform(0.00, 0.05),   # 15 html_ratio      plain text
        rng.uniform(0.00, 0.10),   # 16 urgency         0–1 hits / 10
        rng.uniform(0.00, 0.10),   # 17 money_words     0–1 hits / 10
        rng.choice([0.0, 1.0], p=[0.15, 0.85]),   # 18 personal_greeting (named, 85%)
        rng.uniform(0.05, 0.30),   # 19 line_break_ratio
    ], dtype=np.float32)


def work_ham(rng: np.random.Generator) -> np.ndarray:
    """Professional email — 50–300 words, may contain urgency/money in legitimate context."""
    return np.array([
        rng.uniform(0.10, 0.60),   # 0  word_count      50–300 words / 500
        rng.uniform(0.10, 0.60),   # 1  char_count      300–1800 chars / 3000
        rng.uniform(0.01, 0.08),   # 2  caps_ratio      ~1–8% (abbreviations, names)
        rng.uniform(0.00, 0.10),   # 3  exclamation     0–2 / 20
        rng.uniform(0.00, 0.25),   # 4  question        0–5 / 20
        rng.uniform(0.00, 0.15),   # 5  url_count       0–3 links / 20
        rng.uniform(0.00, 0.20),   # 6  spam_keywords   0–3 hits / 15
        rng.uniform(0.01, 0.08),   # 7  digit_ratio     ~1–8% (dates, ref numbers)
        rng.uniform(0.00, 0.03),   # 8  special_chars   ~0–3%
        rng.uniform(0.13, 0.53),   # 9  subject_length  20–80 chars / 150
        rng.uniform(0.00, 0.08),   # 10 subject_caps    ~0–8%
        rng.uniform(0.00, 0.20),   # 11 subj_spam_kw    0–1 hits / 5
        rng.choice([0.0, 1.0], p=[0.40, 0.60]),   # 12 has_attachment (reports, decks)
        rng.choice([0.0, 1.0], p=[0.90, 0.10]),   # 13 reply_mismatch — max 10%
        rng.uniform(0.20, 0.50),   # 14 sender_domain   10–25 chars / 50
        rng.uniform(0.05, 0.30),   # 15 html_ratio
        rng.uniform(0.00, 0.30),   # 16 urgency         0–3 hits / 10 (legit urgency)
        rng.uniform(0.00, 0.30),   # 17 money_words     0–3 hits / 10 (invoices, budget)
        rng.choice([0.0, 1.0], p=[0.30, 0.70]),   # 18 personal_greeting
        rng.uniform(0.03, 0.20),   # 19 line_break_ratio
    ], dtype=np.float32)


def transactional_ham(rng: np.random.Generator) -> np.ndarray:
    """Receipts, order confirmations — HTML-heavy, many URLs, digits, some offer keywords."""
    return np.array([
        rng.uniform(0.10, 0.40),   # 0  word_count      50–200 words / 500
        rng.uniform(0.10, 0.50),   # 1  char_count      300–1500 chars / 3000
        rng.uniform(0.01, 0.04),   # 2  caps_ratio      ~1–4% (brand names)
        rng.uniform(0.00, 0.10),   # 3  exclamation     0–2 / 20
        rng.uniform(0.00, 0.05),   # 4  question        0–1 / 20
        rng.uniform(0.15, 0.50),   # 5  url_count       3–10 links / 20 (unsubscribe, view)
        rng.uniform(0.07, 0.27),   # 6  spam_keywords   1–4 hits / 15 (offer, selected)
        rng.uniform(0.05, 0.15),   # 7  digit_ratio     ~5–15% (order#, prices)
        rng.uniform(0.02, 0.08),   # 8  special_chars   ~2–8% ($, %)
        rng.uniform(0.27, 0.80),   # 9  subject_length  40–120 chars / 150
        rng.uniform(0.00, 0.05),   # 10 subject_caps    ~0–5%
        rng.uniform(0.00, 0.20),   # 11 subj_spam_kw    0–1 hits / 5
        rng.choice([0.0, 1.0], p=[0.80, 0.20]),   # 12 has_attachment (PDF receipts)
        rng.choice([0.0, 1.0], p=[0.90, 0.10]),   # 13 reply_mismatch (no-reply sender)
        rng.uniform(0.20, 0.40),   # 14 sender_domain   10–20 chars / 50
        rng.uniform(0.30, 0.70),   # 15 html_ratio      heavy HTML template
        rng.uniform(0.00, 0.10),   # 16 urgency         0–1 hits / 10
        rng.uniform(0.10, 0.40),   # 17 money_words     1–4 hits / 10 (payment, invoice)
        rng.choice([0.0, 1.0], p=[0.50, 0.50]),   # 18 personal_greeting
        rng.uniform(0.02, 0.15),   # 19 line_break_ratio
    ], dtype=np.float32)


HAM_FNS = {
    "personal":      personal_ham,
    "work":          work_ham,
    "transactional": transactional_ham,
}
