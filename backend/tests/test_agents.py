from __future__ import annotations

import json
from typing import List

from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

# Ensure tables exist in in-memory SQLite for tests
init_db()


def _create_agent(client: TestClient, name: str, product: str, categories: List[str] | None = None, tags: List[str] | None = None) -> dict:
    payload = {
        "name": name,
        "product": product,
        "description": f"Agent for {product}",
        "categories": categories or [],
        "tags": tags or [],
        "system_instructions": f"You are a {product} expert.",
        "knowledge_urls": [],
        "defaults": {"temperature": 0.2, "max_tokens": 128},
        "is_enabled": True,
    }
    res = client.post("/api/admin/agents", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


def test_agents_list_and_filter():
    client = TestClient(app)

    a1 = _create_agent(client, name="Snowflake Analyst", product="snowflake", categories=["sql", "warehouse"], tags=["snowflake", "performance"])  # noqa: E501
    a2 = _create_agent(client, name="dbt Developer", product="dbt", categories=["modeling"], tags=["dbt", "macro"])  # noqa: E501

    # List
    r = client.get("/api/agents")
    assert r.status_code == 200
    items = r.json()
    ids = {it["id"] for it in items}
    assert a1["id"] in ids and a2["id"] in ids

    # Filter by product
    r = client.get("/api/agents", params={"product": "snowflake"})
    assert r.status_code == 200
    prods = {it["product"].lower() for it in r.json()}
    assert prods == {"snowflake"}

    # Search by q
    r = client.get("/api/agents", params={"q": "snow"})
    names = {it["name"] for it in r.json()}
    assert "Snowflake Analyst" in names

    # Filter by category
    r = client.get("/api/agents", params={"category": "warehouse"})
    names = {it["name"] for it in r.json()}
    assert "Snowflake Analyst" in names

    # Filter by tag
    r = client.get("/api/agents", params={"tag": "macro"})
    names = {it["name"] for it in r.json()}
    assert "dbt Developer" in names


def test_agents_recommend_scoring_and_sorting():
    client = TestClient(app)

    a1 = _create_agent(client, name="Snowflake Pro", product="snowflake", categories=["sql"], tags=["snowflake", "performance"])  # noqa: E501
    a2 = _create_agent(client, name="dbt Pro", product="dbt", categories=["jinja"], tags=["dbt", "macro"])  # noqa: E501

    payload = {
        "q": "snowflake sql performance",
        "product": "snowflake",
        "top_k": 5,
    }
    r = client.post("/api/agents/recommend", json=payload)
    assert r.status_code == 200
    recs = r.json()
    assert len(recs) >= 1
    # All recommendations should be for the requested product
    assert all(r["agent"]["product"].lower() == "snowflake" for r in recs)
    # Ensure our created agent is included
    assert any(r["agent"]["id"] == a1["id"] for r in recs)
    # Reason for top hit should mention product boost
    assert "product boost" in (recs[0]["reason"] or "")
    # Ensure non-increasing scores
    scores = [rec["score"] for rec in recs]
    assert scores == sorted(scores, reverse=True)


def test_chat_meta_persists_agent(monkeypatch):
    # Mock TGI streaming to be deterministic and fast
    async def fake_stream(prompt, temperature, max_new_tokens, stop=None):
        yield {"token": {"text": "Hello"}}
        yield {"token": {"text": " from agent"}}

    from app.services import tgi_client

    monkeypatch.setattr(tgi_client.client, "stream_generate", fake_stream)

    client = TestClient(app)

    # Create project and conversation
    proj = client.post(
        "/api/projects",
        json={"name": "AgentsTest", "system_instructions": "Be concise.", "defaults": {"temperature": 0.1}},
    ).json()
    conv = client.post(
        f"/api/projects/{proj['id']}/conversations",
        json={"title": "Agents Chat"},
    ).json()

    # Create agent
    agent = _create_agent(client, name="Snowflake Chat Agent", product="snowflake", categories=["sql"], tags=["snowflake"])  # noqa: E501

    # Stream chat with agent_id
    with client.stream(
        "POST",
        "/api/chat/stream",
        json={
            "project_id": proj["id"],
            "conversation_id": conv["id"],
            "user_text": "Hi",
            "agent_id": agent["id"],
            "stream": True,
        },
    ) as r:
        assert r.status_code == 200
        _ = list(r.iter_lines())

    # Verify assistant message meta contains agent info
    msgs = client.get(f"/api/conversations/{conv['id']}/messages").json()
    assert msgs[-1]["role"] == "assistant"
    meta = msgs[-1]["meta_json"] or {}
    assert meta.get("agent") is not None
    assert meta["agent"]["id"] == agent["id"]
    assert meta["agent"]["product"].lower() == "snowflake"


