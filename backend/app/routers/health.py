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


