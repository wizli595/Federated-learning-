"""Aggregator package — re-exports the public API."""

from .models import ClientSubmission, AggregationResult
from .aggregator import Aggregator

# Module-level singleton
aggregator = Aggregator()

__all__ = ["ClientSubmission", "AggregationResult", "Aggregator", "aggregator"]
