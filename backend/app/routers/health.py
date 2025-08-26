from __future__ import annotations

import httpx
from fastapi import APIRouter
from ..config import settings


router = APIRouter()


@router.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/meta")
async def meta() -> dict[str, str | bool]:
    tgi_ok = False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{settings.model_server_url}/health")
            tgi_ok = r.status_code == 200
    except Exception:
        tgi_ok = False
    return {
        "backend_version": "0.1.0",
        "model_server_ok": tgi_ok,
        "model_id": settings.default_model_id,
    }


