"""
data.py — Trigger email dataset generation per client.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/data", tags=["data"])

ROOT        = Path(__file__).parent.parent.parent.parent   # repo root
SCRIPT      = ROOT / "scripts" / "generate_email_data.py"
CLIENTS_DIR = Path(__file__).parent.parent / "clients"
DATA_DIR    = ROOT / "fl" / "data"


def _dataset_exists(client_id: str) -> bool:
    return (DATA_DIR / client_id / "dataset.csv").exists()


@router.post("/generate")
async def generate_all(samples: int = 800, seed: int = 42):
    """Generate datasets for all configured clients."""
    configs = list(CLIENTS_DIR.glob("*.json"))
    if not configs:
        raise HTTPException(400, "no clients configured — create clients first")

    result = subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--clients-dir", str(CLIENTS_DIR),
            "--output-dir",  str(DATA_DIR),
            "--samples",     str(samples),
            "--seed",        str(seed),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise HTTPException(500, f"data generation failed:\n{result.stderr}")

    return {"message": "data generated", "output": result.stdout}


@router.post("/generate/{client_id}")
async def generate_one(client_id: str, samples: int = 800, seed: int = 42):
    """Generate dataset for a single client."""
    cfg_path = CLIENTS_DIR / f"{client_id}.json"
    if not cfg_path.exists():
        raise HTTPException(404, f"client '{client_id}' not found")

    result = subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--clients-dir", str(CLIENTS_DIR),
            "--output-dir",  str(DATA_DIR),
            "--samples",     str(samples),
            "--seed",        str(seed),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise HTTPException(500, f"data generation failed:\n{result.stderr}")

    return {"message": f"data generated for {client_id}", "output": result.stdout}


@router.get("/stats")
def data_stats() -> Dict:
    """Return per-client dataset statistics (total, spam/ham counts, feature means)."""
    import csv as _csv

    result: Dict = {}
    for path in sorted(CLIENTS_DIR.glob("*.json")):
        with open(path) as f:
            cfg = json.load(f)
        cid      = cfg["id"]
        csv_path = DATA_DIR / cid / "dataset.csv"
        if not csv_path.exists():
            continue

        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = _csv.DictReader(f)
            rows   = list(reader)

        if not rows:
            continue

        feature_names = [k for k in rows[0] if k != "label"]
        spam_rows = [r for r in rows if int(r["label"]) == 1]
        ham_rows  = [r for r in rows if int(r["label"]) == 0]
        total = len(rows)
        spam  = len(spam_rows)
        ham   = len(ham_rows)

        features: Dict[str, Dict[str, float]] = {}
        for feat in feature_names:
            features[feat] = {
                "spam_mean": round(sum(float(r[feat]) for r in spam_rows) / max(spam, 1), 4),
                "ham_mean":  round(sum(float(r[feat]) for r in ham_rows)  / max(ham,  1), 4),
            }

        result[cid] = {
            "total":      total,
            "spam":       spam,
            "ham":        ham,
            "spam_ratio": round(spam / max(total, 1), 4),
            "features":   features,
        }
    return result


@router.get("/status")
def data_status() -> Dict[str, bool]:
    """Return whether a dataset exists for each configured client."""
    status = {}
    for path in sorted(CLIENTS_DIR.glob("*.json")):
        with open(path) as f:
            cfg = json.load(f)
        status[cfg["id"]] = _dataset_exists(cfg["id"])
    return status
