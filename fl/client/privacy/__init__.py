"""Differential privacy package — re-exports privatize_weights."""

from .privatize import privatize_weights
from .deltas import compute_deltas
from .clipping import clip_global_norm
from .noise import add_noise

__all__ = ["privatize_weights", "compute_deltas", "clip_global_norm", "add_noise"]
