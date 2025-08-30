from __future__ import annotations

import asyncio
import json
import time
from typing import AsyncGenerator, Dict, List, Tuple
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..auth import ensure_project_member, get_optional_user
from .. import models
from ..schemas import ChatStreamRequest
from ..config import settings
from ..services.tgi_client import client as tgi
from ..services.tgi_client import ollama_client
from ..services.provider_clients import stream_generate_with_provider

# Optional SQL tools import for Phase 2 (lint/format)
try:
    from tools.sql_tools import lint_sql  # type: ignore
except Exception:  # pragma: no cover - fallback for local/dev paths
    import os as _os
    import sys as _sys
    _repo_root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), "../../../.."))
    if _repo_root not in _sys.path:
        _sys.path.append(_repo_root)
    try:
        from tools.sql_tools import lint_sql  # type: ignore
    except Exception:
        # As a last resort, attempt direct import from tools dir
        _tools_dir = _os.path.join(_repo_root, "tools")
        if _tools_dir not in _sys.path:
            _sys.path.append(_tools_dir)
        from sql_tools import lint_sql  # type: ignore

router = APIRouter(prefix="/chat", tags=["chat"])


def build_prompt(system_prompt: str | None, history: List[models.Message], user_text: str) -> str:
    parts: List[str] = []
    if system_prompt:
        parts.append(f"<|system|>\n{system_prompt}")
    for m in history:
        role = "user" if m.role == "user" else "assistant"
        if m.role == "system":
            parts.append(f"<|system|>\n{m.content}")
        else:
            parts.append(f"<|{role}|>\n{m.content}")
    parts.append(f"<|user|>\n{user_text}\n<|assistant|>")
    return "\n".join(parts)


async def event_stream(request: ChatStreamRequest, http_request: Request, db: Session) -> AsyncGenerator[str, None]:
    project = db.query(models.Project).get(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    conversation = db.query(models.Conversation).get(request.conversation_id)
    if not conversation or conversation.project_id != project.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ensure_project_member(project.id, http_request, db)

    # Collect history by simple recency window (bounded by N messages)
    history = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation.id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    # Resolve agent (if provided) and build effective system prompt and defaults
    agent = None
    if request.agent_id is not None:
        try:
            agent = db.query(models.Agent).get(int(request.agent_id))
            if agent and not bool(agent.is_enabled):
                agent = None
        except Exception:
            agent = None

    system_prompt = request.system_override or (agent.system_instructions if agent and agent.system_instructions else project.system_instructions)

    # Apply defaults with precedence: explicit request > agent.defaults > project.defaults > settings
    agent_defaults = (agent.defaults_json or {}) if agent else {}
    project_defaults = project.defaults_json or {}
    temperature = request.temperature or agent_defaults.get("temperature") or project_defaults.get("temperature", settings.temperature)
    max_tokens = request.max_tokens or agent_defaults.get("max_tokens") or project_defaults.get("max_tokens", settings.max_tokens)
    # Determine effective model for this request (for display and for Ollama override)
    model_id = (
        request.model_id
        or agent_defaults.get("model_id")
        or project_defaults.get("model_id")
        or settings.default_model_id
    )

    # Note: We do not swap model on TGI at runtime; model_id is for display/storage
    rag_context = None
    citations: list[dict] = []
    confidence_score: float | None = None
    low_confidence: bool = False
    effective_use_rag = request.use_rag if request.use_rag is not None else (agent_defaults.get("use_rag") if agent_defaults else project_defaults.get("use_rag"))
    if effective_use_rag:
        try:
            import os
            import sys
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
            if repo_root not in sys.path:
                sys.path.append(repo_root)
            from core.retrieval.retriever import hybrid_search
            from core.retrieval.reranker import rerank

            candidates = hybrid_search(request.user_text, top_k=request.top_k or 12)
            final = rerank(request.user_text, candidates, k=min(5, request.top_k or 12))
            # Compute a simple confidence score based on query-term overlap
            def _q_terms(text: str) -> set[str]:
                return set(t.lower() for t in re.findall(r"[A-Za-z0-9_]+", text or ""))

            q_terms = _q_terms(request.user_text)
            def _overlap_ratio(chunk_text: str) -> float:
                if not q_terms:
                    return 0.0
                terms = _q_terms(chunk_text)
                overlap = len(q_terms & terms)
                denom = max(6, len(q_terms))  # avoid inflated scores for very short queries
                return min(1.0, overlap / denom)

            # Build context block and citations
            context_blocks = []
            per_chunk_scores: list[float] = []
            for c in final:
                text_for_score = f"{c.title or ''}\n{c.content_md or ''}"
                rscore = _overlap_ratio(text_for_score)
                per_chunk_scores.append(rscore)
                citations.append({
                    "id": c.id,
                    "title": c.title,
                    "url": c.url,
                    "product": c.product,
                    "score": getattr(c, "score", None),
                    "rerank_score": rscore,
                })
                context_blocks.append(f"Title: {c.title}\nURL: {c.url}\n---\n{c.content_md}\n")
            rag_context = "\n\n".join(context_blocks)
            confidence_score = (max(per_chunk_scores) if per_chunk_scores else 0.0)
            threshold = request.low_conf_threshold or 0.52
            low_confidence = (confidence_score or 0.0) < threshold
        except Exception as e:
            rag_context = None

    user_text = request.user_text
    if rag_context:
        if low_confidence:
            user_text = (
                "You are a Senior Architect for Snowflake/dbt/Tableau. Cite sources.\n"
                "Your retrieval confidence appears LOW.\n"
                "Do ONE of the following:\n"
                "- Ask ONE concise clarifying question that would let you answer precisely, OR\n"
                "- Present 2–3 likely interpretations, each with: short answer, a SQL/code snippet if relevant, and sources.\n\n"
                f"CONTEXT:\n{rag_context}\n\nQUESTION: {request.user_text}"
            )
        else:
            user_text = (
                "You are a Senior Architect for Snowflake/dbt/Tableau. Cite sources.\n"
                "Use the CONTEXT below to answer. If insufficient, say so and ask a clarifying question.\n\n"
                f"CONTEXT:\n{rag_context}\n\nQUESTION: {request.user_text}"
            )

    prompt = build_prompt(system_prompt, history, user_text)

    # Persist user message immediately
    user_msg = models.Message(
        conversation_id=conversation.id,
        role="user",
        content=request.user_text,
        meta_json=None,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    start_ts = time.perf_counter()
    num_tokens = 0
    collected_text: List[str] = []

    # Choose backend: support explicit provider prefix `provider:model`
    backend = "ollama" if settings.model_backend.lower() == "ollama" else "tgi"
    generator = None
    provider_name: str | None = None
    provider_model: str | None = None
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Model selection - model_id: {model_id}, backend: {backend}")
    
    if model_id and ":" in model_id:
        provider_name, provider_model = model_id.split(":", 1)
        provider_name = (provider_name or "").strip().lower()
        provider_model = (provider_model or "").strip()
        logger.info(f"Provider parsing - provider_name: {provider_name}, provider_model: {provider_model}")
        
        # Look up provider credentials (case-insensitive)
        try:
            from sqlalchemy import func
            provider_row = (
                db.query(models.LLMProvider)
                .filter(func.lower(models.LLMProvider.provider) == provider_name, models.LLMProvider.enabled == 1)
                .first()
            )
            logger.info(f"Provider lookup - found: {provider_row is not None}, provider: {provider_row.provider if provider_row else None}")
            
            if provider_row and provider_row.api_key:
                backend = provider_name
                generator = stream_generate_with_provider(
                    provider=provider_row.provider,
                    api_key=provider_row.api_key,
                    base_url=provider_row.base_url,
                    organization=provider_row.organization,
                    project=provider_row.project,
                    model=provider_model,
                    prompt=prompt,
                    temperature=temperature,
                    max_new_tokens=max_tokens,
                    stop=None,
                )
        except Exception as e:
            logger.error(f"Provider setup error: {e}")
            generator = None

    if generator is None:
        # Check if we have enabled providers but the model_id doesn't use provider format
        if not model_id or ":" not in model_id:
            try:
                from sqlalchemy import func
                enabled_providers = db.query(models.LLMProvider).filter(models.LLMProvider.enabled == 1).all()
                if enabled_providers:
                    provider_names = [p.provider for p in enabled_providers]
                    logger.warning(f"Enabled providers found ({provider_names}) but model_id '{model_id}' doesn't use provider:model format. Using default backend '{backend}' instead.")
                    
                    # Return a helpful error message to the user
                    error_message = f"To use the configured providers ({', '.join(provider_names)}), please select a model with the format 'provider:model' (e.g., 'openai:gpt-4o-mini'). Currently using default backend '{backend}' with model '{model_id}'."
                    yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"
                    return
            except Exception:
                pass
        
        generator = (
            ollama_client.stream_generate(
                prompt,
                temperature=temperature,
                max_new_tokens=max_tokens,
                model=model_id,
            )
            if backend == "ollama"
            else tgi.stream_generate(prompt, temperature=temperature, max_new_tokens=max_tokens)
        )

    async for item in generator:
        if "token" in item:
            delta = item["token"]["text"]
            collected_text.append(delta)
            num_tokens += 1
            yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"
        elif "generated_text" in item:
            # Some TGI versions may send a final object with generated_text
            pass

    elapsed = max(1e-6, time.perf_counter() - start_ts)
    tokens_per_sec = num_tokens / elapsed if num_tokens else None
    assistant_text = "".join(collected_text)

    # Phase 2: SQL tools integration — if response includes SQL, append lint/format suggestions
    def _extract_sql_blocks(text: str) -> List[Tuple[str, str]]:
        pattern = re.compile(r"```(\w+)?\n([\s\S]*?)```", re.MULTILINE)
        matches = pattern.findall(text or "")
        results: List[Tuple[str, str]] = []
        for lang, code in matches[:3]:  # limit to first 3 blocks to bound latency
            lang_lower = (lang or "sql").lower()
            if lang_lower in {"sql", "snowflake", "bigquery", "postgres", "postgresql", "mysql", "duckdb", "sqlite", "redshift", "mssql"}:
                results.append((lang_lower, code.strip()))
        return results

    def _pick_dialect(preferred: str | None, citations_list: list[dict]) -> str:
        if preferred and preferred != "sql":
            return "postgres" if preferred == "postgresql" else preferred
        # Heuristic from citations
        domain_products = [(c or {}).get("product", "") for c in (citations_list or [])]
        if any("snowflake" in (p or "").lower() for p in domain_products):
            return "snowflake"
        if any("bigquery" in (p or "").lower() for p in domain_products):
            return "bigquery"
        return "postgres"

    appended_tools_text = ""
    try:
        sql_blocks = _extract_sql_blocks(assistant_text)
        if sql_blocks:
            analyses: List[str] = []
            for idx, (lang, code) in enumerate(sql_blocks, start=1):
                dialect = _pick_dialect(lang, citations)
                try:
                    report = lint_sql(code, dialect=dialect)
                except Exception:
                    report = "SQL tools failed to analyze this block."
                analyses.append(f"Block {idx} [{dialect}]:\n{report}".strip())
            if analyses:
                appended_tools_text = "\n\n---\nSQL tools analysis\n\n" + "\n\n".join(analyses)
    except Exception:
        appended_tools_text = ""

    if appended_tools_text:
        assistant_text += appended_tools_text
        # Stream the tools section as one final delta chunk so the UI sees it without reload
        yield f"event: delta\ndata: {json.dumps({'text': appended_tools_text})}\n\n"

    # Persist assistant message with meta
    # Attach trace metadata
    current_user = get_optional_user(http_request, db)
    meta = {
        "elapsed_sec": elapsed,
        "tokens_per_sec": tokens_per_sec,
        "usage": {
            "prompt_tokens": None,
            "completion_tokens": num_tokens,
            "total_tokens": None,
        },
        "backend": backend,
        "model_id": model_id,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "project_id": project.id,
        "conversation_id": conversation.id,
        "user_id": (current_user.id if current_user else None),
    }
    if agent:
        meta["agent"] = {
            "id": agent.id,
            "name": agent.name,
            "product": agent.product,
        }
    # Low-confidence indicators
    if confidence_score is not None:
        meta["confidence_score"] = confidence_score
        meta["low_confidence"] = low_confidence

    assistant_msg = models.Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_text,
        meta_json={**meta, "citations": citations if citations else None},
    )
    db.add(assistant_msg)
    # Ensure updated_at is not None
    conversation.updated_at = assistant_msg.created_at or conversation.updated_at
    db.commit()
    db.refresh(assistant_msg)

    done_payload = {
        "message_id": assistant_msg.id,
        "meta": meta,
    }
    yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"


@router.post("/stream")
def stream_chat(request: ChatStreamRequest, http_request: Request, db=Depends(get_db)):
    async def generator():
        async for chunk in event_stream(request, http_request, db):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream")


