"""Pure text slugification — no I/O."""

import re


def slugify(name: str) -> str:
    """Convert a display name into a URL-safe client ID slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return slug.strip("-")[:32] or "client"
