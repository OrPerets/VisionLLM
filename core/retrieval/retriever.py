from __future__ import annotations

"""
Hybrid retriever (BM25 + vector) with simple union and naive rerank hooks.

Phase 1 minimal implementation using Postgres full-text and pgvector cosine.
If DB is not Postgres with pgvector, falls back to lexical only.
"""

from dataclasses import dataclass
from typing import List, Optional
import os

from sqlalchemy import text
from sqlalchemy.engine import create_engine


@dataclass
class RetrievedChunk:
    id: str
    url: Optional[str]
    title: Optional[str]
    product: Optional[str]
    content_md: str
    score: float


def _get_engine():
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return None
    try:
        return create_engine(db_url)
    except Exception:
        return None


def _lexical(engine, query: str, limit: int) -> List[RetrievedChunk]:
    sql = text(
        """
SELECT id::text, url, title, product, content_md,
       ts_rank(to_tsvector('english', content_md), plainto_tsquery('english', :q)) AS score
FROM rag_chunks
WHERE to_tsvector('english', content_md) @@ plainto_tsquery('english', :q)
ORDER BY score DESC
LIMIT :limit
        """
    )
    with engine.begin() as conn:
        rows = conn.execute(sql, {"q": query, "limit": limit}).mappings().all()
    return [RetrievedChunk(**row) for row in rows]


def _vector(engine, embedding: list[float], limit: int) -> List[RetrievedChunk]:
    sql = text(
        """
SELECT id::text, url, title, product, content_md,
       1 - (embedding <=> :emb) AS score
FROM rag_chunks
ORDER BY embedding <=> :emb ASC
LIMIT :limit
        """
    )
    with engine.begin() as conn:
        rows = conn.execute(sql, {"emb": embedding, "limit": limit}).mappings().all()
    return [RetrievedChunk(**row) for row in rows]


def embed_query_stub(query: str, dim: int = 1024) -> list[float]:
    # Phase 1 stub: deterministic pseudo-embedding for query, zero elsewhere
    # Replace with real embedding model later
    vec = [0.0] * dim
    for i, ch in enumerate(query.encode("utf-8")):
        vec[i % dim] += (ch % 13) / 13.0
    # normalize
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


def hybrid_search(query: str, top_k: int = 12) -> List[RetrievedChunk]:
    engine = _get_engine()
    if engine is None or not str(engine.url).startswith("postgresql"):
        return []

    k_each = max(1, min(50, top_k))
    lex = _lexical(engine, query, limit=k_each)
    try:
        emb = embed_query_stub(query)
        vec = _vector(engine, emb, limit=k_each)
    except Exception:
        vec = []

    # Union by id, keep max score, bias to lexical
    combined: dict[str, RetrievedChunk] = {}
    for r in lex + vec:
        if r.id in combined:
            if r.score > combined[r.id].score:
                combined[r.id] = r
        else:
            combined[r.id] = r
    results = list(combined.values())
    results.sort(key=lambda x: x.score, reverse=True)
    return results[:top_k]


