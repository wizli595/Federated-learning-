"""
Client profile definitions — maps profile name to spam/ham generator mix.

Each profile describes:
  spam_ratio  — fraction of samples that are spam
  spam_mix    — weighted dict of spam generator names
  ham_mix     — weighted dict of ham generator names
"""

import numpy as np

PROFILES = {
    # ── Client 1: Marketing environment ─────────────────────────────────────────
    # Mostly bulk-promo spam but also some phishing (real orgs get both types).
    # Primary spam discriminators: url_count, html_ratio, spam_keywords, exclamation.
    # 30% phishing mix ensures global FedAvg model learns phishing signals from this client.
    "marketing": {
        "spam_ratio": 0.70,
        "spam_mix": {"marketing": 0.70, "phishing": 0.30},
        "ham_mix":  {"transactional": 1.00},
    },

    # ── Client 2: Phishing-target (bank / corporate user) ───────────────────────
    # Exclusively credential-phishing spam vs casual personal emails.
    # Primary discriminators: caps_ratio (spam 0.25–0.80 vs ham 0.01–0.05),
    #   reply_mismatch (spam 90% vs ham 2%), urgency (spam 0.30–0.80 vs ham 0.00–0.10).
    "balanced": {
        "spam_ratio": 0.65,
        "spam_mix": {"phishing": 1.00},
        "ham_mix":  {"personal": 1.00},
    },

    # ── Client 3: Social-engineering target ─────────────────────────────────────
    # Mostly advance-fee / money-scam spam but also some phishing.
    # Primary spam discriminators: money_word_count (spam 0.40–0.80 vs ham 0.00–0.30),
    #   reply_mismatch (spam 65% vs ham 10%).
    # 30% phishing mix ensures all three clients contribute phishing signal to FedAvg.
    "phishing": {
        "spam_ratio": 0.55,
        "spam_mix": {"social_engineering": 0.70, "phishing": 0.30},
        "ham_mix":  {"work": 1.00},
    },
}


def pick(mix: dict, rng: np.random.Generator) -> str:
    """Sample a generator name from a weighted mix dict."""
    keys  = list(mix.keys())
    probs = list(mix.values())
    return rng.choice(keys, p=probs)
