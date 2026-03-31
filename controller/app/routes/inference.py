"""
inference.py — HTTP handlers for per-client email classification.
All logic lives in services/classifier.py.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..services import classifier

router = APIRouter(prefix="/clients", tags=["inference"])

CLIENTS_DIR = Path(__file__).parent.parent / "clients"
MODEL_PATH  = Path(__file__).parent.parent.parent.parent / "fl" / "output" / "global_model.pt"


class ClassifyRequest(BaseModel):
    subject: str         = ""
    body: str            = ""
    sender: str          = ""
    reply_to: str        = ""
    has_attachment: bool = False


@router.post("/{client_id}/classify")
def classify_email(client_id: str, req: ClassifyRequest):
    if not (CLIENTS_DIR / f"{client_id}.json").exists():
        raise HTTPException(404, f"client '{client_id}' not found")
    try:
        return classifier.classify(
            req.subject, req.body, req.sender, req.reply_to, req.has_attachment
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.get("/{client_id}/model/download")
def download_model(client_id: str):
    if not MODEL_PATH.exists():
        raise HTTPException(404, "model not found — training not complete")
    return FileResponse(str(MODEL_PATH), filename="global_model.pt")
