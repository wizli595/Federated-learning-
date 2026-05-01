"""Sender/routing features (indices 12-14): attachment, reply mismatch, domain length."""

from .helpers import domain


def sender_features(sender: str, reply_to: str, has_attachment: bool) -> list:
    """Extract 3 features from sender metadata."""
    sender_domain = domain(sender)
    reply_domain = domain(reply_to)
    reply_mismatch = float(bool(reply_domain) and reply_domain != sender_domain)

    return [
        float(has_attachment),                    # 12 has_attachment
        reply_mismatch,                           # 13 reply_to_mismatch
        min(len(sender_domain), 50) / 50,         # 14 sender_domain_len
    ]
