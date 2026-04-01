"""
schemas.py — Kafka message schemas for the FL pipeline.

Every message is a plain dict with a mandatory "type" field.
The Worker routes on that field (type-router pattern).

Serialisation: JSON over Kafka.
Weights (numpy arrays) are base64-encoded float32 bytes for compactness.

Topics
------
client.weights  — FL client → Worker  (type: fl_weights)
global.weights  — Worker  → clients   (type: global_weights)
fl.metrics      — Worker  → controller (type: fl_metrics)
fl.status       — controller → all    (type: fl_status)
"""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Optional

import numpy as np


# ── Topic registry ─────────────────────────────────────────────────────────────

TOPICS = {
    "client_weights": "client.weights",
    "global_weights": "global.weights",
    "metrics":        "fl.metrics",
    "status":         "fl.status",
}

# ── Weight serialisation helpers ───────────────────────────────────────────────

def weights_to_payload(weights: List[np.ndarray]) -> Dict[str, Any]:
    """Encode a list of numpy arrays → JSON-safe dict."""
    return {
        "arrays": [
            base64.b64encode(w.astype(np.float32).tobytes()).decode()
            for w in weights
        ],
        "shapes": [list(w.shape) for w in weights],
        "dtype": "float32",
    }


def payload_to_weights(payload: Dict[str, Any]) -> List[np.ndarray]:
    """Decode a payload dict → list of numpy arrays."""
    arrays = payload["arrays"]
    shapes = payload["shapes"]
    return [
        np.frombuffer(base64.b64decode(a), dtype=np.float32).reshape(s)
        for a, s in zip(arrays, shapes)
    ]


# ── Base ───────────────────────────────────────────────────────────────────────

def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@dataclass
class BaseMessage:
    type: str

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    def to_bytes(self) -> bytes:
        return self.to_json().encode()

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "BaseMessage":
        # exclude init=False fields (e.g. `type`) — they are set by the class, not __init__
        init_fields = {k for k, f in cls.__dataclass_fields__.items() if f.init}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in d.items() if k in init_fields})


# ── client.weights ─────────────────────────────────────────────────────────────

@dataclass
class ClientWeightsMessage(BaseMessage):
    """Published by each FL client after local training."""

    type: str = field(default="fl_weights", init=False)

    client_id:   str
    round:       int
    num_samples: int

    # serialised weight arrays (use weights_to_payload / payload_to_weights)
    weights_payload: Dict[str, Any] = field(default_factory=dict)

    # per-round local eval metrics (optional but useful for Worker aggregation)
    loss:      float = 0.0
    accuracy:  float = 0.0
    spam_rate: float = 0.0
    tp:        int   = 0
    fp:        int   = 0
    tn:        int   = 0
    fn:        int   = 0

    timestamp: str = field(default_factory=_now)

    @classmethod
    def build(
        cls,
        client_id:   str,
        round:       int,
        num_samples: int,
        weights:     List[np.ndarray],
        loss:        float = 0.0,
        accuracy:    float = 0.0,
        spam_rate:   float = 0.0,
        tp: int = 0, fp: int = 0, tn: int = 0, fn: int = 0,
    ) -> "ClientWeightsMessage":
        return cls(
            client_id=client_id,
            round=round,
            num_samples=num_samples,
            weights_payload=weights_to_payload(weights),
            loss=loss,
            accuracy=accuracy,
            spam_rate=spam_rate,
            tp=tp, fp=fp, tn=tn, fn=fn,
        )

    def decode_weights(self) -> List[np.ndarray]:
        return payload_to_weights(self.weights_payload)


# ── global.weights ─────────────────────────────────────────────────────────────

@dataclass
class GlobalWeightsMessage(BaseMessage):
    """Published by Worker after FedAvg aggregation over all client submissions."""

    type: str = field(default="global_weights", init=False)

    round:           int
    num_clients:     int
    total_samples:   int

    weights_payload: Dict[str, Any] = field(default_factory=dict)

    timestamp: str = field(default_factory=_now)

    @classmethod
    def build(
        cls,
        round:         int,
        num_clients:   int,
        total_samples: int,
        weights:       List[np.ndarray],
    ) -> "GlobalWeightsMessage":
        return cls(
            round=round,
            num_clients=num_clients,
            total_samples=total_samples,
            weights_payload=weights_to_payload(weights),
        )

    def decode_weights(self) -> List[np.ndarray]:
        return payload_to_weights(self.weights_payload)


# ── fl.metrics ─────────────────────────────────────────────────────────────────

@dataclass
class PerClientMetric:
    loss:        float
    accuracy:    float
    spam_rate:   float
    num_samples: int
    tp: int = 0
    fp: int = 0
    tn: int = 0
    fn: int = 0


@dataclass
class MetricsMessage(BaseMessage):
    """Published by Worker after aggregating client metrics for a round."""

    type: str = field(default="fl_metrics", init=False)

    round:        int
    avg_loss:     float
    avg_accuracy: float
    precision:    float = 0.0
    recall:       float = 0.0
    f1:           float = 0.0
    tp:           int   = 0
    fp:           int   = 0
    tn:           int   = 0
    fn:           int   = 0

    # {client_id: PerClientMetric-as-dict}
    clients: Dict[str, Any] = field(default_factory=dict)

    timestamp: str = field(default_factory=_now)


# ── fl.status ──────────────────────────────────────────────────────────────────

@dataclass
class StatusMessage(BaseMessage):
    """Published by Controller to broadcast training lifecycle events."""

    type: str = field(default="fl_status", init=False)

    status:        str   # idle | waiting | training | finished
    current_round: int   = 0
    total_rounds:  int   = 0
    num_clients:   int   = 0   # expected clients per round — Worker uses this to know when to aggregate
    message:       str   = ""

    timestamp: str = field(default_factory=_now)


# ── Router helper ──────────────────────────────────────────────────────────────

_TYPE_MAP: Dict[str, type] = {
    "fl_weights":    ClientWeightsMessage,
    "global_weights": GlobalWeightsMessage,
    "fl_metrics":    MetricsMessage,
    "fl_status":     StatusMessage,
}


def parse_message(raw: bytes) -> Optional[BaseMessage]:
    """Deserialise a raw Kafka message value into a typed dataclass."""
    try:
        d = json.loads(raw)
        cls = _TYPE_MAP.get(d.get("type", ""))
        if cls is None:
            return None
        return cls.from_dict(d)
    except Exception:
        return None
