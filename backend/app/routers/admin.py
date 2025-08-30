from __future__ import annotations

from typing import List, Optional, Dict, Any
import subprocess
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..db import get_db
from ..auth import require_admin
from .. import models
from ..schemas import (
    UserRead,
    UserRoleUpdate,
    ModelsResponse,
    ModelInfo,
    PullModelRequest,
    PullModelResponse,
    DeleteModelResponse,
    LLMProviderCreate,
    LLMProviderRead,
    LLMProviderUpdate,
    AgentCreate,
    AgentRead,
    AgentUpdate,
)
from ..config import settings
import httpx
from ..services.provider_clients import list_provider_models


class MaintenanceRequest(BaseModel):
    scope: str  # "chat" | "all" | "demo"


class MaintenanceResponse(BaseModel):
    ok: bool
    counts: Optional[Dict[str, int]] = None


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserRead], dependencies=[Depends(require_admin)])
def list_users(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.User)
    if q:
        term = f"%{q.lower()}%"
        # Simple case-insensitive search on email or name
        from sqlalchemy import func, or_

        query = query.filter(
            or_(
                func.lower(models.User.email).like(term),
                func.lower(models.User.name).like(term),
            )
        )
    return query.order_by(models.User.created_at.desc()).limit(100).all()


@router.patch("/users/{user_id}/role", response_model=UserRead, dependencies=[Depends(require_admin)])
def update_user_role(user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/maintenance/cleanup", response_model=MaintenanceResponse, dependencies=[Depends(require_admin)])
def admin_cleanup_db(payload: MaintenanceRequest, db: Session = Depends(get_db)):
    """Admin-only maintenance endpoint to clean DB tables."""
    scope = payload.scope
    
    if scope not in ["chat", "all", "demo"]:
        raise HTTPException(status_code=400, detail="Invalid scope. Must be 'chat', 'all', or 'demo'")
    
    counts = {}
    
    try:
        # Start transaction
        db.begin()
        
        if scope in ["chat", "all", "demo"]:
            # Delete in dependency-safe order: activity_logs, messages, conversations
            activity_count = db.query(models.ActivityLog).count()
            db.query(models.ActivityLog).delete()
            counts["activity_logs"] = activity_count
            
            message_count = db.query(models.Message).count()
            db.query(models.Message).delete()
            counts["messages"] = message_count
            
            conversation_count = db.query(models.Conversation).count()
            db.query(models.Conversation).delete()
            counts["conversations"] = conversation_count
        
        if scope in ["all", "demo"]:
            # Also delete project_members and projects, but keep users
            member_count = db.query(models.ProjectMember).count()
            db.query(models.ProjectMember).delete()
            counts["project_members"] = member_count
            
            project_count = db.query(models.Project).count()
            db.query(models.Project).delete()
            counts["projects"] = project_count
        
        # Commit the deletions
        db.commit()
        
        # For demo scope, try to reseed if seed script exists
        if scope == "demo":
            try:
                # Look for seed script in the expected location
                repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
                seed_script = os.path.join(repo_root, "backend", "scripts", "seed.py")
                
                if os.path.exists(seed_script):
                    # Run the seed script
                    result = subprocess.run(
                        ["python", seed_script],
                        cwd=repo_root,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        counts["demo_seeded"] = 1
                    else:
                        counts["demo_seed_failed"] = 1
                else:
                    counts["demo_seed_not_found"] = 1
            except Exception:
                counts["demo_seed_error"] = 1
        
        return MaintenanceResponse(ok=True, counts=counts)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/models", response_model=ModelsResponse, dependencies=[Depends(require_admin)])
async def list_models() -> ModelsResponse:
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
                    model_names = await list_provider_models(
                        provider=p.provider,
                        api_key=p.api_key or "",
                        base_url=p.base_url,
                        organization=p.organization,
                        project=p.project,
                        config=p.config_json or {},
                    )
                    for mn in model_names:
                        # Prefix with provider for uniqueness and routing, e.g., "openai:gpt-4o"
                        display = f"{p.provider}:{mn}"
                        models.append(ModelInfo(
                            name=display,
                            format=p.provider,
                            source="provider",
                            provider=p.provider,
                        ))
                except Exception:
                    # Ignore provider failures to avoid breaking admin
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


@router.post("/models/pull", response_model=PullModelResponse, dependencies=[Depends(require_admin)])
async def pull_model(req: PullModelRequest) -> PullModelResponse:
    if settings.model_backend.lower() != "ollama":
        raise HTTPException(status_code=400, detail="Model pulling is only supported for Ollama backend")
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{settings.ollama_url}/api/pull", json={"name": req.name}) as resp:
                async for _ in resp.aiter_lines():
                    pass
        return PullModelResponse(ok=True, status="completed", name=req.name)
    except Exception as e:
        return PullModelResponse(ok=False, status=f"error: {e}")


@router.delete("/models/{name}", response_model=DeleteModelResponse, dependencies=[Depends(require_admin)])
async def delete_model(name: str) -> DeleteModelResponse:
    if settings.model_backend.lower() != "ollama":
        raise HTTPException(status_code=400, detail="Model deletion is only supported for Ollama backend")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.delete(f"{settings.ollama_url}/api/delete", json={"name": name})
            if r.status_code == 200:
                return DeleteModelResponse(ok=True)
            raise HTTPException(status_code=r.status_code, detail=r.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# LLM Providers CRUD
@router.get("/llm/providers", response_model=list[LLMProviderRead], dependencies=[Depends(require_admin)])
def list_llm_providers(db: Session = Depends(get_db)):
    items = db.query(models.LLMProvider).order_by(models.LLMProvider.created_at.desc()).all()
    # Do not expose api_key in read model
    results = []
    for p in items:
        results.append(
            LLMProviderRead(
                id=p.id,
                provider=p.provider,
                name=p.name,
                base_url=p.base_url,
                organization=p.organization,
                project=p.project,
                config=p.config_json,
                enabled=bool(p.enabled),
            )
        )
    return results


@router.post("/llm/providers", response_model=LLMProviderRead, dependencies=[Depends(require_admin)])
def create_llm_provider(payload: LLMProviderCreate, db: Session = Depends(get_db)):
    # upsert by provider type to keep one per provider for now
    existing = db.query(models.LLMProvider).filter(models.LLMProvider.provider == payload.provider).first()
    if existing:
        # Update existing
        existing.name = payload.name or existing.name
        if payload.api_key is not None:
            existing.api_key = payload.api_key
        existing.base_url = payload.base_url or existing.base_url
        existing.organization = payload.organization or existing.organization
        existing.project = payload.project or existing.project
        existing.config_json = payload.config or existing.config_json
        if payload.enabled is not None:
            existing.enabled = 1 if payload.enabled else 0
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return LLMProviderRead(
            id=existing.id,
            provider=existing.provider,
            name=existing.name,
            base_url=existing.base_url,
            organization=existing.organization,
            project=existing.project,
            config=existing.config_json,
            enabled=bool(existing.enabled),
        )

    item = models.LLMProvider(
        provider=payload.provider,
        name=payload.name,
        api_key=payload.api_key,
        base_url=payload.base_url,
        organization=payload.organization,
        project=payload.project,
        config_json=payload.config,
        enabled=1 if (payload.enabled is None or payload.enabled) else 0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return LLMProviderRead(
        id=item.id,
        provider=item.provider,
        name=item.name,
        base_url=item.base_url,
        organization=item.organization,
        project=item.project,
        config=item.config_json,
        enabled=bool(item.enabled),
    )


@router.patch("/llm/providers/{provider_id}", response_model=LLMProviderRead, dependencies=[Depends(require_admin)])
def update_llm_provider(provider_id: int, payload: LLMProviderUpdate, db: Session = Depends(get_db)):
    item = db.query(models.LLMProvider).get(provider_id)
    if not item:
        raise HTTPException(status_code=404, detail="Provider not found")
    if payload.name is not None:
        item.name = payload.name
    if payload.api_key is not None:
        item.api_key = payload.api_key
    if payload.base_url is not None:
        item.base_url = payload.base_url
    if payload.organization is not None:
        item.organization = payload.organization
    if payload.project is not None:
        item.project = payload.project
    if payload.config is not None:
        item.config_json = payload.config
    if payload.enabled is not None:
        item.enabled = 1 if payload.enabled else 0
    db.add(item)
    db.commit()
    db.refresh(item)
    return LLMProviderRead(
        id=item.id,
        provider=item.provider,
        name=item.name,
        base_url=item.base_url,
        organization=item.organization,
        project=item.project,
        config=item.config_json,
        enabled=bool(item.enabled),
    )


@router.delete("/llm/providers/{provider_id}", response_model=DeleteModelResponse, dependencies=[Depends(require_admin)])
def delete_llm_provider(provider_id: int, db: Session = Depends(get_db)):
    item = db.query(models.LLMProvider).get(provider_id)
    if not item:
        raise HTTPException(status_code=404, detail="Provider not found")
    db.delete(item)
    db.commit()
    return DeleteModelResponse(ok=True)


# Agents CRUD
@router.get("/agents", response_model=list[AgentRead], dependencies=[Depends(require_admin)])
def admin_list_agents(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Agent)
    if q:
        from sqlalchemy import func, or_
        term = f"%{q.lower()}%"
        query = query.filter(or_(func.lower(models.Agent.name).like(term), func.lower(models.Agent.description).like(term)))
    return query.order_by(models.Agent.updated_at.desc()).limit(200).all()


@router.post("/agents", response_model=AgentRead, dependencies=[Depends(require_admin)])
def admin_create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    item = models.Agent(
        name=payload.name,
        product=payload.product,
        description=payload.description,
        categories_json=payload.categories,
        tags_json=payload.tags,
        system_instructions=payload.system_instructions,
        knowledge_urls_json=payload.knowledge_urls,
        defaults_json=payload.defaults,
        starters_json=getattr(payload, "starters", None),
        is_enabled=1 if (payload.is_enabled is None or payload.is_enabled) else 0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/agents/{agent_id}", response_model=AgentRead, dependencies=[Depends(require_admin)])
def admin_update_agent(agent_id: int, payload: AgentUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Agent).get(agent_id)
    if not item:
        raise HTTPException(status_code=404, detail="Agent not found")
    if payload.name is not None:
        item.name = payload.name
    if payload.product is not None:
        item.product = payload.product
    if payload.description is not None:
        item.description = payload.description
    if payload.categories is not None:
        item.categories_json = payload.categories
    if payload.tags is not None:
        item.tags_json = payload.tags
    if payload.system_instructions is not None:
        item.system_instructions = payload.system_instructions
    if payload.knowledge_urls is not None:
        item.knowledge_urls_json = payload.knowledge_urls
    if payload.defaults is not None:
        item.defaults_json = payload.defaults
    if getattr(payload, "starters", None) is not None:
        item.starters_json = payload.starters
    if payload.is_enabled is not None:
        item.is_enabled = 1 if payload.is_enabled else 0
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/agents/{agent_id}", response_model=DeleteModelResponse, dependencies=[Depends(require_admin)])
def admin_delete_agent(agent_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Agent).get(agent_id)
    if not item:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(item)
    db.commit()
    return DeleteModelResponse(ok=True)
