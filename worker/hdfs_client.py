"""
hdfs_client.py — WebHDFS wrapper for storing FL weight arrays.

Stores weights as numpy .npz files under:
  /fl/weights/round_{N}/{client_id}.npz    — raw client submissions
  /fl/global/round_{N}_global.npz          — aggregated global weights

Uses the `hdfs` Python library (WebHDFS REST — no Java required).
If HDFS is unavailable (e.g. during local dev), all calls are no-ops
and warnings are logged instead of raising.
"""

from __future__ import annotations

import io
import logging
import os
from typing import List, Optional

import numpy as np

log = logging.getLogger(__name__)

HDFS_URL  = os.getenv("HDFS_URL", "http://hdfs-namenode:9870")
HDFS_USER = os.getenv("HDFS_USER", "root")

_client = None   # lazy singleton


# ── Client factory ─────────────────────────────────────────────────────────────

def get_hdfs_client():
    """Return (or create) the singleton HDFS client."""
    global _client
    if _client is None:
        from hdfs import InsecureClient
        _client = InsecureClient(HDFS_URL, user=HDFS_USER)
    return _client


def init_directories() -> None:
    """Create base HDFS directories on Worker startup."""
    client = get_hdfs_client()
    for path in ["/fl", "/fl/weights", "/fl/global"]:
        try:
            client.makedirs(path)
        except Exception as exc:
            # makedirs is idempotent-ish but may raise if dir exists in some versions
            log.debug("makedirs(%s): %s", path, exc)
    log.info("HDFS directories ready under /fl/")


# ── Weight I/O ─────────────────────────────────────────────────────────────────

def store_client_weights(
    round_num:  int,
    client_id:  str,
    weights:    List[np.ndarray],
) -> Optional[str]:
    """
    Persist a client's weight arrays to HDFS.
    Returns the HDFS path on success, None on failure.
    """
    path = f"/fl/weights/round_{round_num}/{client_id}.npz"
    return _write_weights(path, weights)


def store_global_weights(
    round_num: int,
    weights:   List[np.ndarray],
) -> Optional[str]:
    """
    Persist the aggregated global weight arrays to HDFS.
    Returns the HDFS path on success, None on failure.
    """
    path = f"/fl/global/round_{round_num}_global.npz"
    return _write_weights(path, weights)


def load_global_weights(round_num: int) -> Optional[List[np.ndarray]]:
    """Load a previously stored global model from HDFS."""
    path = f"/fl/global/round_{round_num}_global.npz"
    try:
        client = get_hdfs_client()
        with client.read(path) as reader:
            buf = io.BytesIO(reader.read())
        npz = np.load(buf)
        return [npz[k] for k in sorted(npz.files)]
    except Exception as exc:
        log.warning("Could not load global weights from HDFS %s: %s", path, exc)
        return None


# ── Internal ───────────────────────────────────────────────────────────────────

def _write_weights(path: str, weights: List[np.ndarray]) -> Optional[str]:
    buf = io.BytesIO()
    np.savez(buf, *weights)
    buf.seek(0)
    try:
        client = get_hdfs_client()
        # Ensure parent directory exists
        parent = "/".join(path.split("/")[:-1])
        client.makedirs(parent)
        client.write(path, buf, overwrite=True)
        log.debug("Stored weights → HDFS %s (%d bytes)", path, buf.tell())
        return path
    except Exception as exc:
        log.warning("HDFS write failed for %s: %s (continuing without HDFS)", path, exc)
        return None
