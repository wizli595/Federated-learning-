"""
inference.py — HTTP handlers for per-client email classification.
All logic lives in services/classifier.py.
"""

import io
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
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
            req.subject, req.body, req.sender, req.reply_to, req.has_attachment,
            client_id=client_id,
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/{client_id}/classify/batch")
async def classify_batch(client_id: str, file: UploadFile = File(...)):
    """Classify a CSV of pre-extracted feature vectors (20 columns = FEATURE_NAMES).
    Returns a list of {row, label, confidence, spam_score, model_type, feature_breakdown}.
    Maximum 1 000 rows per request.
    """
    if not (CLIENTS_DIR / f"{client_id}.json").exists():
        raise HTTPException(404, f"client '{client_id}' not found")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV: {e}")

    if len(df) == 0:
        raise HTTPException(400, "CSV has no data rows")
    if len(df) > 1_000:
        raise HTTPException(400, "Too many rows — maximum is 1 000 per request")

    missing = [f for f in classifier.FEATURE_NAMES if f not in df.columns]
    if missing:
        raise HTTPException(400, f"Missing columns: {missing}")

    try:
        matrix  = df[classifier.FEATURE_NAMES].values
        results = classifier.classify_batch_features(matrix, client_id=client_id)
        return [{"row": i + 1, **r} for i, r in enumerate(results)]
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Inference error: {e}")


@router.get("/{client_id}/model/export")
def export_model_onnx(client_id: str):
    """Export the client's model (personalized if available, else global) as an ONNX file.
    The ONNX model accepts a float32 tensor of shape (N, 20) named 'features'
    and returns logits of shape (N, 2) named 'logits'.
    """
    if not (CLIENTS_DIR / f"{client_id}.json").exists():
        raise HTTPException(404, f"client '{client_id}' not found")
    try:
        data, model_type = classifier.export_onnx(client_id=client_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"ONNX export failed: {e}")

    filename = f"{client_id}_{model_type}_model.onnx"
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{client_id}/model/download")
def download_model(client_id: str):
    if not MODEL_PATH.exists():
        raise HTTPException(404, "model not found — training not complete")
    return FileResponse(str(MODEL_PATH), filename="global_model.pt")
