from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from ..config import settings
from ..db import get_db
from .. import models
from ..auth import require_admin


router = APIRouter()


@router.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/meta")
async def meta() -> dict[str, str | bool]:
    backend = settings.model_backend.lower()
    ok = False
    model_id = settings.default_model_id
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            if backend == "ollama":
                # Ollama health: version endpoint
                r = await client.get(f"{settings.ollama_url}/api/version")
                ok = r.status_code == 200
                model_id = settings.ollama_model
            else:
                r = await client.get(f"{settings.model_server_url}/health")
                ok = r.status_code == 200
    except Exception:
        ok = False
    return {
        "backend_version": "0.1.0",
        "backend": backend,
        "model_server_ok": ok,
        "model_id": model_id,
    }


@router.get("/admin/activity", dependencies=[Depends(require_admin)])
def recent_activity(limit: int = 50, db: Session = Depends(get_db)) -> list[dict[str, str | int | None]]:
    rows = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(min(limit, 200))
        .all()
    )
    return [
        {
            "id": r.id,
            "actor_id": r.actor_id,
            "action": r.action,
            "object_type": r.object_type,
            "object_id": r.object_id,
            "project_id": r.project_id,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


