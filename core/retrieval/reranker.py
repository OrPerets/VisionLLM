from __future__ import annotations

"""
Naive reranker stub for Phase 1.

Scores with simple query-term overlap as a stand-in for a learned reranker.
"""

from typing import List
from .retriever import RetrievedChunk


def rerank(query: str, candidates: List[RetrievedChunk], k: int = 5) -> List[RetrievedChunk]:
    q_terms = set(t.lower() for t in query.split())
    def score(c: RetrievedChunk) -> float:
        text = (c.title or "") + "\n" + (c.content_md or "")
        terms = set(text.lower().split())
        overlap = len(q_terms & terms)
        return overlap + 0.001 * len((c.title or ""))

    ranked = sorted(candidates, key=score, reverse=True)
    return ranked[:k]


