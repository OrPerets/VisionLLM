from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.db import init_db

init_db()


def test_plan_creates_file(tmp_path):
    client = TestClient(app)
    transcript = [{"role": "user", "content": "Add dark mode"}]
    r = client.post("/api/maintenance/plan", json={"transcript": transcript})
    assert r.status_code == 200, r.text
    link = r.json()["link"]
    filename = link.split("/")[-1]
    assert (Path("tasks") / filename).exists()


def test_stream_and_plan_end_to_end(monkeypatch):
    async def fake_stream(prompt, temperature, max_tokens):
        yield {"token": {"text": "CONFIRMED"}}

    from app.services import tgi_client

    monkeypatch.setattr(tgi_client.client, "stream_generate", fake_stream)

    client = TestClient(app)
    payload = {"messages": [{"role": "user", "content": "Hi"}]}
    with client.stream("POST", "/api/maintenance/stream", json=payload) as r:
        assert r.status_code == 200
        lines = list(r.iter_lines())
        assert lines


def test_plan_requires_admin(monkeypatch):
    from app.config import settings

    settings.enable_auth = True
    client = TestClient(app)
    transcript = [{"role": "user", "content": "test"}]
    r = client.post("/api/maintenance/plan", json={"transcript": transcript})
    assert r.status_code == 401
    settings.enable_auth = False
