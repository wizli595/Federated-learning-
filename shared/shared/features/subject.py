"""Subject line features (indices 9-11): length, caps ratio, spam keywords."""

from .helpers import keyword_hits
from .vocabulary import SPAM_KEYWORDS


def subject_features(subject: str) -> list:
    """Extract 3 normalised features from email subject."""
    subj_len = len(subject)
    subj_caps_ratio = sum(1 for c in subject if c.isupper()) / max(subj_len, 1)
    subj_spam_kw = keyword_hits(subject, SPAM_KEYWORDS)

    return [
        min(subj_len, 150) / 150,         # 9  subject_length
        subj_caps_ratio,                   # 10 subject_caps_ratio
        min(subj_spam_kw, 5) / 5,         # 11 subject_spam_keywords
    ]
