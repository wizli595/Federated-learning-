"""
flower/ — Flower training lifecycle package.

Facade: re-exports the public API so callers use `flower.start()`,
`flower.LOGS`, etc. without knowing the internal module structure.
"""

from .lifecycle import start, stop, read_metrics
from .logs import LOGS, METRICS

__all__ = ["start", "stop", "read_metrics", "LOGS", "METRICS"]
