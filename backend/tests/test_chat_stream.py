from __future__ import annotations

import json
from fastapi.testclient import TestClient
from app.main import app


def test_chat_stream_endpoint_smoke(monkeypatch):
    # Mock TGI streaming
    async def fake_stream(prompt, temperature, max_new_tokens, stop=None):
        yield {"token": {"text": "Hello"}}
        yield {"token": {"text": "!"}}

    from app.services import tgi_client

    monkeypatch.setattr(tgi_client.client, "stream_generate", fake_stream)

    client = TestClient(app)

    # Create project and conversation
    proj = client.post(
        "/api/projects",
        json={"name": "Test", "system_instructions": "Be nice", "defaults": {"temperature": 0.1}},
    ).json()
    conv = client.post(
        f"/api/projects/{proj['id']}/conversations",
        json={"title": "Hello"},
    ).json()

    with client.stream(
        "POST", 
        "/api/chat/stream", 
        json={
            "project_id": proj["id"],
            "conversation_id": conv["id"],
            "user_text": "Hi",
            "stream": True
        }
    ) as r:
        assert r.status_code == 200
        chunks = list(r.iter_lines())
        assert any("event: delta" in c for c in chunks)
        assert any("event: done" in c for c in chunks)


