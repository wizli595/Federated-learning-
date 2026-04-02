"""
portal.py — Public self-service endpoints for FL clients.
No JWT required — entry point for the Client Portal (port 4000).
"""

import json
import re
import io
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import classifier

router = APIRouter(prefix="/portal", tags=["portal"])

# Mirrors FEATURE_NAMES in fl/shared/features.py (stable 20-column list)
_FEATURE_NAMES = [
    "word_count", "char_count", "caps_ratio", "exclamation_count", "question_count",
    "url_count", "spam_keyword_count", "digit_ratio", "special_char_ratio",
    "subject_length", "subject_caps_ratio", "subject_spam_keywords",
    "has_attachment", "reply_to_mismatch", "sender_domain_len",
    "html_ratio", "urgency_word_count", "money_word_count",
    "personal_greeting", "line_break_ratio",
]

CLIENTS_DIR = Path(__file__).parent.parent / "clients"


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return slug.strip("-")[:32] or "client"


class RegisterRequest(BaseModel):
    name: str
    profile: str = "balanced"
    num_emails: int = 500


@router.post("/register", status_code=201)
def register(req: RegisterRequest):
    if not req.name.strip():
        raise HTTPException(400, "name is required")

    base_id = _slugify(req.name)
    client_id = base_id
    counter = 2
    CLIENTS_DIR.mkdir(exist_ok=True)
    while (CLIENTS_DIR / f"{client_id}.json").exists():
        client_id = f"{base_id}-{counter}"
        counter += 1

    cfg = {
        "id": client_id,
        "name": req.name.strip(),
        "profile": req.profile,
        "num_emails": req.num_emails,
    }
    with open(CLIENTS_DIR / f"{client_id}.json", "w") as f:
        json.dump(cfg, f, indent=2)

    return {
        "client_id": client_id,
        "name": cfg["name"],
        "profile": req.profile,
        "num_emails": req.num_emails,
        "message": f"'{cfg['name']}' registered successfully.",
    }


@router.get("/status/{client_id}")
def client_status(client_id: str):
    path = CLIENTS_DIR / f"{client_id}.json"
    if not path.exists():
        raise HTTPException(404, "client not found")
    with open(path) as f:
        cfg = json.load(f)

    data_dir = Path(__file__).parent.parent.parent.parent / "fl" / "data" / client_id
    has_data  = (data_dir / "dataset.csv").exists()
    has_model = (data_dir / "model.pt").exists()

    return {
        **cfg,
        "client_id": cfg["id"],   # explicit alias so frontend doesn't rely on 'id'
        "has_data": has_data,
        "has_model": has_model,
    }


class UploadPayload(BaseModel):
    csv_content: str  # full CSV string: header row + feature rows


@router.post("/upload/{client_id}")
def upload_dataset(client_id: str, payload: UploadPayload):
    """Accept pre-extracted feature CSV from the client portal and save as dataset.csv."""
    cfg_path = CLIENTS_DIR / f"{client_id}.json"
    if not cfg_path.exists():
        raise HTTPException(404, "client not found")

    if not payload.csv_content.strip():
        raise HTTPException(400, "csv_content is empty")

    # Validate columns
    try:
        df = pd.read_csv(io.StringIO(payload.csv_content))
    except Exception as exc:
        raise HTTPException(400, f"invalid CSV: {exc}")

    missing = [f for f in _FEATURE_NAMES if f not in df.columns]
    if missing:
        raise HTTPException(400, f"missing feature columns: {missing[:5]}")
    if "label" not in df.columns:
        raise HTTPException(400, "missing 'label' column")

    row_count = len(df)
    if row_count < 10:
        raise HTTPException(400, "dataset must have at least 10 rows")

    data_dir = Path(__file__).parent.parent.parent.parent / "fl" / "data" / client_id
    data_dir.mkdir(parents=True, exist_ok=True)

    csv_path = data_dir / "dataset.csv"
    df[_FEATURE_NAMES + ["label"]].to_csv(csv_path, index=False)

    return {
        "client_id": client_id,
        "rows":      row_count,
        "message":   f"Dataset saved: {row_count} rows",
    }


_ROOT = Path(__file__).parent.parent.parent.parent


@router.get("/training-status")
def portal_training_status():
    """Public training status for portal clients — no JWT required."""
    data = flower.read_metrics()
    data = kafka_bridge.merge_kafka_into(data)

    rounds = data.get("rounds", [])
    latest = rounds[-1] if rounds else {}

    has_global_model = (_ROOT / "fl" / "output" / "global_model.pt").exists()

    return {
        "status":          data.get("status", "idle"),
        "current_round":   data.get("current_round", 0),
        "total_rounds":    data.get("total_rounds", 0),
        "avg_accuracy":    latest.get("avg_accuracy"),
        "avg_loss":        latest.get("avg_loss"),
        "f1":              latest.get("f1"),
        "has_global_model": has_global_model,
    }


class PortalClassifyRequest(BaseModel):
    subject:        str  = ""
    body:           str  = ""
    sender:         str  = ""
    reply_to:       str  = ""
    has_attachment: bool = False


@router.get("/clients")
def list_portal_clients():
    """List all portal-registered clients and whether they have uploaded data."""
    clients = []
    for p in sorted(CLIENTS_DIR.glob("*.json")):
        with open(p) as f:
            c = json.load(f)
        has_data = (_ROOT / "fl" / "data" / c["id"] / "dataset.csv").exists()
        clients.append({
            "client_id": c["id"],
            "name":      c["name"],
            "has_data":  has_data,
        })
    return clients


@router.post("/classify/{client_id}")
def portal_classify(client_id: str, req: PortalClassifyRequest):
    """Classify an email using the client's model — no JWT required."""
    if not (CLIENTS_DIR / f"{client_id}.json").exists():
        raise HTTPException(404, "client not found")
    try:
        return classifier.classify(
            req.subject, req.body, req.sender, req.reply_to, req.has_attachment,
            client_id=client_id,
        )
    except FileNotFoundError:
        raise HTTPException(404, "no model available yet — training must complete first")
