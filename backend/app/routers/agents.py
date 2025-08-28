from __future__ import annotations

from typing import List, Optional
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, String

from ..db import get_db
from .. import models
from ..schemas import AgentRead, AgentRecommendRequest, AgentRecommendation


router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=List[AgentRead])
def list_agents(
    q: Optional[str] = None,
    product: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.Agent).filter(models.Agent.is_enabled == 1)

    if product:
        query = query.filter(func.lower(models.Agent.product) == product.lower())

    if q:
        term = f"%{q.lower()}%"
        # Case-insensitive search across name, description, categories_json, tags_json
        query = query.filter(
            (func.lower(models.Agent.name).like(term))
            | (func.lower(models.Agent.description).like(term))
            | (func.lower(func.cast(models.Agent.categories_json, String)).like(term))
            | (func.lower(func.cast(models.Agent.tags_json, String)).like(term))
        )

    if category:
        # Portable LIKE on serialized JSON
        cterm = f"%{category.lower()}%"
        query = query.filter(func.lower(func.cast(models.Agent.categories_json, String)).like(cterm))

    if tag:
        tterm = f"%{tag.lower()}%"
        query = query.filter(func.lower(func.cast(models.Agent.tags_json, String)).like(tterm))

    items = query.order_by(models.Agent.updated_at.desc()).limit(max(1, min(200, limit))).all()
    return items


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Agent).get(agent_id)
    if not item or not bool(item.is_enabled):
        raise HTTPException(status_code=404, detail="Agent not found")
    return item


def _normalize_terms(text: str | None) -> list[str]:
    if not text:
        return []
    return re.findall(r"[A-Za-z0-9_]+", text.lower())


@router.post("/recommend", response_model=List[AgentRecommendation])
def recommend_agents(payload: AgentRecommendRequest, db: Session = Depends(get_db)):
    q_terms = set(_normalize_terms(payload.q))

    query = db.query(models.Agent).filter(models.Agent.is_enabled == 1)
    if payload.product:
        query = query.filter(func.lower(models.Agent.product) == payload.product.lower())

    # Optional coarse category filter
    if payload.categories:
        for cat in payload.categories:
            term = f"%{(cat or '').lower()}%"
            query = query.filter(func.lower(func.cast(models.Agent.categories_json, String)).like(term))

    candidates: list[models.Agent] = query.limit(500).all()

    results: list[AgentRecommendation] = []
    for a in candidates:
        haystack_parts: list[str] = [a.name or "", a.description or ""]
        for lst in [a.categories_json or [], a.tags_json or []]:
            try:
                haystack_parts.extend([str(x) for x in (lst or [])])
            except Exception:
                pass
        hay = " ".join(haystack_parts)
        a_terms = set(_normalize_terms(hay))
        overlap = len(q_terms & a_terms)
        denom = max(6, len(q_terms) or 0)
        base_score = 0.0 if denom == 0 else min(1.0, overlap / denom)
        score = base_score

        reasons: list[str] = []
        if overlap:
            matched = sorted(list(q_terms & a_terms))[:6]
            if matched:
                reasons.append(f"matched: {', '.join(matched)}")
        if payload.product and a.product and payload.product.lower() == a.product.lower():
            score += 0.1
            reasons.append("product boost")

        results.append(
            AgentRecommendation(
                agent=a,
                score=round(score, 4),
                reason="; ".join(reasons) if reasons else "",
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)
    k = max(1, min(50, payload.top_k or 10))
    return results[:k]


