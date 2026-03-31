"""Tests for fl/shared/features.py — feature extraction logic."""

import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.features import (
    extract_features,
    features_to_dict,
    FEATURE_NAMES,
    INPUT_DIM,
    _domain,
    _keyword_hits,
    _url_count,
    _html_ratio,
    SPAM_KEYWORDS,
    URGENCY_WORDS,
    MONEY_WORDS,
)


# ── Constants ──────────────────────────────────────────────────────────────────

class TestConstants:
    def test_input_dim_matches_feature_names(self):
        assert INPUT_DIM == len(FEATURE_NAMES)

    def test_input_dim_is_20(self):
        assert INPUT_DIM == 20

    def test_feature_names_unique(self):
        assert len(FEATURE_NAMES) == len(set(FEATURE_NAMES))


# ── Helpers ────────────────────────────────────────────────────────────────────

class TestHelpers:
    def test_domain_normal(self):
        assert _domain("user@example.com") == "example.com"

    def test_domain_no_at(self):
        assert _domain("not_an_email") == ""

    def test_domain_empty(self):
        assert _domain("") == ""

    def test_domain_lowercase(self):
        assert _domain("USER@EXAMPLE.COM") == "example.com"

    def test_keyword_hits_single(self):
        assert _keyword_hits("win a free prize today", SPAM_KEYWORDS) >= 2

    def test_keyword_hits_none(self):
        assert _keyword_hits("hello how are you", SPAM_KEYWORDS) == 0

    def test_keyword_hits_case_insensitive(self):
        assert _keyword_hits("WIN A FREE PRIZE", SPAM_KEYWORDS) == _keyword_hits("win a free prize", SPAM_KEYWORDS)

    def test_url_count_http(self):
        assert _url_count("visit http://example.com and https://other.com") == 2

    def test_url_count_www(self):
        assert _url_count("go to www.example.com now") == 1

    def test_url_count_none(self):
        assert _url_count("no links here") == 0

    def test_html_ratio_with_tags(self):
        text = "<b>bold</b>"
        ratio = _html_ratio(text)
        assert 0 < ratio < 1

    def test_html_ratio_no_tags(self):
        assert _html_ratio("plain text") == 0.0

    def test_html_ratio_empty(self):
        # max(len(""), 1) = 1, so no division by zero
        assert _html_ratio("") == 0.0


# ── extract_features ──────────────────────────────────────────────────────────

class TestExtractFeatures:
    def test_output_shape(self):
        vec = extract_features("hello", "world", "a@b.com")
        assert vec.shape == (20,)

    def test_output_dtype(self):
        vec = extract_features("hello", "world", "a@b.com")
        assert vec.dtype == np.float32

    def test_all_values_in_0_1_range(self):
        vec = extract_features(
            "WIN FREE PRIZE NOW!!!",
            "Click http://spam.com to earn free cash $$ URGENT!! win prize bonus",
            "scammer@dodgy.xyz",
            has_attachment=True,
            reply_to="other@evil.com",
        )
        assert np.all(vec >= 0.0), f"values below 0: {vec[vec < 0]}"
        assert np.all(vec <= 1.0), f"values above 1: {vec[vec > 1]}"

    def test_empty_inputs_no_crash(self):
        vec = extract_features("", "", "")
        assert vec.shape == (20,)
        assert not np.any(np.isnan(vec))
        assert not np.any(np.isinf(vec))

    def test_none_like_defaults(self):
        """None-coerced-to-empty-string inputs must not crash."""
        vec = extract_features(None, None, None)  # type: ignore
        assert vec.shape == (20,)

    def test_caps_ratio_feature(self):
        low  = extract_features("", "all lower case text", "a@b.com")
        high = extract_features("", "ALL UPPER CASE TEXT", "a@b.com")
        assert high[2] > low[2]   # feature 2 = caps_ratio

    def test_exclamation_feature(self):
        no_excl = extract_features("", "calm email here", "a@b.com")
        excl    = extract_features("", "act now!!!!!!!!!!", "a@b.com")
        assert excl[3] > no_excl[3]  # feature 3 = exclamation_count

    def test_url_feature(self):
        no_url  = extract_features("", "no links", "a@b.com")
        has_url = extract_features("", "click http://a.com or http://b.com", "a@b.com")
        assert has_url[5] > no_url[5]  # feature 5 = url_count

    def test_has_attachment_flag(self):
        no_attach  = extract_features("s", "b", "a@b.com", has_attachment=False)
        has_attach = extract_features("s", "b", "a@b.com", has_attachment=True)
        assert no_attach[12] == 0.0   # feature 12 = has_attachment
        assert has_attach[12] == 1.0

    def test_reply_to_mismatch(self):
        same    = extract_features("s", "b", "a@x.com", reply_to="other@x.com")
        differ  = extract_features("s", "b", "a@x.com", reply_to="other@y.com")
        assert same[13] == 0.0    # feature 13 = reply_to_mismatch
        assert differ[13] == 1.0

    def test_reply_to_empty_no_mismatch(self):
        vec = extract_features("s", "b", "a@x.com", reply_to="")
        assert vec[13] == 0.0

    def test_personal_greeting_named(self):
        vec = extract_features("", "Dear Alice, please read this", "a@b.com")
        assert vec[18] == 1.0   # feature 18 = personal_greeting

    def test_personal_greeting_generic(self):
        vec = extract_features("", "Dear customer, please read this", "a@b.com")
        assert vec[18] == 0.0

    def test_no_greeting(self):
        vec = extract_features("", "Hello there, how are you?", "a@b.com")
        assert vec[18] == 0.0

    def test_spam_higher_than_ham(self):
        """A classic spam email should score higher on spam-related features than a ham email."""
        spam_vec = extract_features(
            "WIN FREE PRIZE NOW",
            "Congratulations! You won! Click http://spam.com to claim FREE cash bonus!!! URGENT!!!",
            "promo@dodgy.xyz",
        )
        ham_vec = extract_features(
            "Meeting tomorrow",
            "Hi Alice, can we meet at 3pm to discuss the project update? Thanks.",
            "bob@company.com",
        )
        spam_features = [spam_vec[3], spam_vec[5], spam_vec[6]]   # exclamation, url, spam_kw
        ham_features  = [ham_vec[3],  ham_vec[5],  ham_vec[6]]
        assert sum(spam_features) > sum(ham_features)

    def test_subject_length_feature(self):
        short = extract_features("Hi",              "body", "a@b.com")
        long  = extract_features("A" * 150,         "body", "a@b.com")
        assert long[9] > short[9]   # feature 9 = subject_length

    def test_normalisation_caps_at_1(self):
        """Very long/high-count values should clamp to 1.0 not exceed it."""
        vec = extract_features(
            "!" * 200,
            "http://a.com " * 30 + "free win prize " * 20 + "!" * 50,
            "a@b.com",
        )
        assert np.all(vec <= 1.0)


# ── features_to_dict ──────────────────────────────────────────────────────────

class TestFeaturesToDict:
    def test_returns_dict(self):
        vec = extract_features("sub", "body text", "a@b.com")
        d = features_to_dict(vec)
        assert isinstance(d, dict)

    def test_keys_match_feature_names(self):
        vec = extract_features("sub", "body text", "a@b.com")
        d = features_to_dict(vec)
        assert list(d.keys()) == FEATURE_NAMES

    def test_values_are_floats(self):
        vec = extract_features("sub", "body text", "a@b.com")
        d = features_to_dict(vec)
        assert all(isinstance(v, float) for v in d.values())

    def test_values_rounded_to_4dp(self):
        vec = extract_features("sub", "body text", "a@b.com")
        d = features_to_dict(vec)
        for k, v in d.items():
            assert round(v, 4) == v, f"{k}={v} not rounded to 4dp"
