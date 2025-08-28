from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from ..config import settings
from ..db import get_db
from .. import models
from ..auth import require_admin
from ..schemas import ModelsResponse, ModelInfo
import os


router = APIRouter()


@router.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/meta")
async def meta() -> dict[str, str | bool]:
    backend = settings.model_backend.lower()
    ok = False
    model_id = settings.default_model_id
    provider_ok = False
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
        "provider_ok": provider_ok,
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


@router.get("/models", response_model=ModelsResponse)
async def list_models_public() -> ModelsResponse:
    backend = settings.model_backend.lower()
    models: list[ModelInfo] = []
    default_model_id = settings.default_model_id
    current_ollama_model = settings.ollama_model if backend == "ollama" else None
    providers: list[str] = []

    if backend == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{settings.ollama_url}/api/tags")
                if r.status_code == 200:
                    data = r.json() or {}
                    for m in data.get("models", []) or []:
                        models.append(ModelInfo(
                            name=m.get("name"),
                            size_bytes=m.get("size"),
                            parameter_size=(m.get("details") or {}).get("parameter_size"),
                            quantization=(m.get("details") or {}).get("quantization"),
                            format="ollama",
                            source="ollama",
                        ))
        except Exception:
            pass

    # GGUF local model (if exists)
    try:
        from ...config import LLM_CONFIG  # type: ignore
        gguf_path = LLM_CONFIG.get("model_path")
        if gguf_path and os.path.exists(gguf_path):
            try:
                size_bytes = os.path.getsize(gguf_path)
            except Exception:
                size_bytes = None
            models.append(ModelInfo(
                name=os.path.basename(gguf_path),
                size_bytes=size_bytes,
                format="gguf",
                source="gguf",
            ))
    except Exception:
        pass

    # External providers (OpenAI, Gemini, etc.)
    try:
        from ..db import SessionLocal
        db = SessionLocal()
        try:
            q = db.query(models.LLMProvider).filter(models.LLMProvider.enabled == 1).all()
            for p in q:
                providers.append(p.provider)
                try:
                    from ..services.provider_clients import list_provider_models
                    model_names = await list_provider_models(
                        provider=p.provider,
                        api_key=p.api_key or "",
                        base_url=p.base_url,
                        organization=p.organization,
                        project=p.project,
                        config=p.config_json or {},
                    )
                    for mn in model_names:
                        display = f"{p.provider}:{mn}"
                        models.append(ModelInfo(
                            name=display,
                            format=p.provider,
                            source="provider",
                            provider=p.provider,
                        ))
                except Exception:
                    pass
        finally:
            db.close()
    except Exception:
        pass

    return ModelsResponse(
        backend=backend,
        models=models,
        default_model_id=default_model_id,
        current_ollama_model=current_ollama_model,
        providers=list(sorted(set(providers))) or None,
    )

