"""
generate_email_data.py — Generate strongly non-IID email datasets per client.

Each client sees ONLY ONE spam type and ONE ham type — zero overlap between clients.
This maximises the benefit of federated learning: each client has knowledge the others lack.

Client profiles:
  marketing  — bulk promo spam  vs  transactional receipts
               Key signals: url_count (very high), html_ratio, spam_keywords, exclamation
  balanced   — phishing spam    vs  casual personal emails
               Key signals: caps_ratio (extreme), reply_mismatch (always 1), urgency
  phishing   — social-eng spam  vs  professional work emails
               Key signals: money_word_count (very high), low URL count, reply_mismatch

Email generators (spam):
  marketing_spam    — bulk promos, lots of links, offer keywords
  newsletter_spam   — borderline: looks like legitimate newsletter but is spam
  phishing_spam     — credential harvesting, urgent, ALL CAPS, reply mismatch
  social_eng_spam   — personal-looking spam, low URL count, money requests

Email generators (ham):
  personal_ham      — casual personal emails
  work_ham          — professional emails, can contain urgency / money words
  transactional_ham — receipts, confirmations: URLs + structured layout

Usage:
    python scripts/generate_email_data.py --clients-dir controller/app/clients \
                                          --output-dir fl/data \
                                          --samples 800 --seed 42
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "fl"))

from shared.features import FEATURE_NAMES, INPUT_DIM  # noqa: E402


# ── Ham generators ─────────────────────────────────────────────────────────────
# All ranges are calibrated to match extract_features() output from real email text.
# e.g. url_count = min(actual_urls, 20)/20  →  5 URLs = 0.25, 10 URLs = 0.50

def _personal_ham(rng: np.random.Generator) -> np.ndarray:
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


def _work_ham(rng: np.random.Generator) -> np.ndarray:
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


def _transactional_ham(rng: np.random.Generator) -> np.ndarray:
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


# ── Spam generators ────────────────────────────────────────────────────────────

def _marketing_spam(rng: np.random.Generator) -> np.ndarray:
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


def _newsletter_spam(rng: np.random.Generator) -> np.ndarray:
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


def _phishing_spam(rng: np.random.Generator) -> np.ndarray:
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
        rng.uniform(0.00, 0.33),   # 6  spam_keywords   0–5 hits / 15 (real phishing avoids kw filters)
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


def _social_engineering_spam(rng: np.random.Generator) -> np.ndarray:
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


# ── Profile definitions ────────────────────────────────────────────────────────

SPAM_FNS = {
    "marketing":         _marketing_spam,
    "newsletter":        _newsletter_spam,
    "phishing":          _phishing_spam,
    "social_engineering": _social_engineering_spam,
}

HAM_FNS = {
    "personal":      _personal_ham,
    "work":          _work_ham,
    "transactional": _transactional_ham,
}

PROFILES = {
    # ── Client 1: Marketing environment ─────────────────────────────────────────
    # Mostly bulk-promo spam but also some phishing (real orgs get both types).
    # Primary spam discriminators: url_count, html_ratio, spam_keywords, exclamation.
    # 30% phishing mix ensures global FedAvg model learns phishing signals from this client.
    "marketing": {
        "spam_ratio": 0.70,
        "spam_mix": {"marketing": 0.70, "phishing": 0.30},  # 70% promo + 30% phishing
        "ham_mix":  {"transactional": 1.00},                # receipts / confirmations
    },

    # ── Client 2: Phishing-target (bank / corporate user) ───────────────────────
    # Exclusively credential-phishing spam vs casual personal emails.
    # Primary discriminators: caps_ratio (spam 0.25–0.80 vs ham 0.01–0.05),
    #   reply_mismatch (spam 90% vs ham 2%), urgency (spam 0.30–0.80 vs ham 0.00–0.10).
    "balanced": {
        "spam_ratio": 0.65,
        "spam_mix": {"phishing": 1.00},        # exclusively credential phishing
        "ham_mix":  {"personal": 1.00},        # exclusively casual personal emails
    },

    # ── Client 3: Social-engineering target ─────────────────────────────────────
    # Mostly advance-fee / money-scam spam but also some phishing.
    # Primary spam discriminators: money_word_count (spam 0.40–0.80 vs ham 0.00–0.30),
    #   reply_mismatch (spam 65% vs ham 10%).
    # 30% phishing mix ensures all three clients contribute phishing signal to FedAvg.
    "phishing": {
        "spam_ratio": 0.55,
        "spam_mix": {"social_engineering": 0.70, "phishing": 0.30},  # 70% scam + 30% phishing
        "ham_mix":  {"work": 1.00},                                   # professional work emails
    },
}


def _pick(mix: dict, rng: np.random.Generator) -> str:
    keys = list(mix.keys())
    probs = list(mix.values())
    return rng.choice(keys, p=probs)


def generate_client_dataset(profile: str, n_samples: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    cfg = PROFILES[profile]

    n_spam = int(n_samples * cfg["spam_ratio"])
    n_ham  = n_samples - n_spam

    rows, labels = [], []

    for _ in range(n_spam):
        t = _pick(cfg["spam_mix"], rng)
        rows.append(SPAM_FNS[t](rng))
        labels.append(1)

    for _ in range(n_ham):
        t = _pick(cfg["ham_mix"], rng)
        rows.append(HAM_FNS[t](rng))
        labels.append(0)

    X = np.vstack(rows)
    # Per-feature noise to blur decision boundaries
    X += rng.normal(0, 0.06, X.shape).astype(np.float32)
    X  = np.clip(X, 0.0, 1.0)

    labels = np.array(labels)
    # Label noise: 6% of samples are mislabeled (irreducible error floor ~6%)
    noise_mask = rng.random(len(labels)) < 0.06
    labels[noise_mask] = 1 - labels[noise_mask]

    df = pd.DataFrame(X, columns=FEATURE_NAMES)
    df["label"] = labels
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clients-dir", default="controller/app/clients")
    parser.add_argument("--output-dir",  default="fl/data")
    parser.add_argument("--samples",     type=int, default=600)
    parser.add_argument("--seed",        type=int, default=42)
    args = parser.parse_args()

    clients_dir = Path(args.clients_dir)
    output_dir  = Path(args.output_dir)

    if not clients_dir.exists():
        print(f"ERROR: clients directory not found: {clients_dir}")
        sys.exit(1)

    config_files = sorted(clients_dir.glob("*.json"))
    if not config_files:
        print(f"ERROR: no client JSON configs found in {clients_dir}")
        sys.exit(1)

    print(f"Generating data for {len(config_files)} client(s) ({args.samples} samples each)...")

    for i, cfg_path in enumerate(config_files):
        with open(cfg_path) as f:
            cfg = json.load(f)

        client_id = cfg["id"]
        profile   = cfg.get("profile", "balanced")
        n_samples = args.samples  # CLI --samples always controls count

        if profile not in PROFILES:
            print(f"  [{client_id}] unknown profile '{profile}', using 'balanced'")
            profile = "balanced"

        out_dir  = output_dir / client_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "dataset.csv"

        df = generate_client_dataset(profile, n_samples, seed=args.seed + i)
        df.to_csv(out_path, index=False)

        spam_pct = df["label"].mean() * 100
        print(f"  [{client_id}] profile={profile} samples={len(df)} spam={spam_pct:.1f}% → {out_path}")

    print("Done.")


if __name__ == "__main__":
    main()
