"""
clients.py — CRUD for client configurations.
Each client is stored as a JSON file in controller/app/clients/{id}.json
"""

import json
import re
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

CLIENTS_DIR = Path(__file__).parent.parent / "clients"
CLIENTS_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/clients", tags=["clients"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ClientConfig(BaseModel):
    id: str
    name: str
    profile: str = "balanced"   # marketing | balanced | phishing
    num_emails: int = 800

    @field_validator("id")
    @classmethod
    def id_slug(cls, v):
        if not re.fullmatch(r"[a-z0-9\-]+", v):
            raise ValueError("id must be lowercase alphanumeric with hyphens only")
        return v

    @field_validator("profile")
    @classmethod
    def valid_profile(cls, v):
        if v not in ("marketing", "balanced", "phishing"):
            raise ValueError("profile must be marketing, balanced, or phishing")
        return v

    @field_validator("num_emails")
    @classmethod
    def sane_count(cls, v):
        if not (50 <= v <= 2000):
            raise ValueError("num_emails must be between 50 and 2000")
        return v


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ClientConfig])
def list_clients():
    configs = []
    for path in sorted(CLIENTS_DIR.glob("*.json")):
        with open(path) as f:
            configs.append(ClientConfig(**json.load(f)))
    return configs


@router.post("", response_model=ClientConfig, status_code=201)
def create_client(cfg: ClientConfig):
    path = CLIENTS_DIR / f"{cfg.id}.json"
    if path.exists():
        raise HTTPException(409, f"client '{cfg.id}' already exists")
    with open(path, "w") as f:
        json.dump(cfg.model_dump(), f, indent=2)
    return cfg


@router.put("/{client_id}", response_model=ClientConfig)
def update_client(client_id: str, cfg: ClientConfig):
    path = CLIENTS_DIR / f"{client_id}.json"
    if not path.exists():
        raise HTTPException(404, f"client '{client_id}' not found")
    if cfg.id != client_id:
        raise HTTPException(400, "cannot change client id")
    with open(path, "w") as f:
        json.dump(cfg.model_dump(), f, indent=2)
    return cfg


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: str):
    path = CLIENTS_DIR / f"{client_id}.json"
    if not path.exists():
        raise HTTPException(404, f"client '{client_id}' not found")
    path.unlink()

    # also remove data directory if it exists
    data_dir = Path(__file__).parent.parent.parent.parent / "fl" / "data" / client_id
    if data_dir.exists():
        import shutil
        shutil.rmtree(data_dir)
