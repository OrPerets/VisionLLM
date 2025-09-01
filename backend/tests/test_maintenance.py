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
    plan_file = Path("tasks") / filename
    assert plan_file.exists()
    plan_file.unlink()


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


def test_full_maintenance_workflow(monkeypatch):
    async def fake_stream(prompt, temperature, max_tokens):
        yield {"token": {"text": "CONFIRMED"}}

    from app.services import tgi_client

    monkeypatch.setattr(tgi_client.client, "stream_generate", fake_stream)

    client = TestClient(app)
    payload = {"messages": [{"role": "user", "content": "New feature"}]}
    with client.stream("POST", "/api/maintenance/stream", json=payload) as r:
        assert r.status_code == 200
        assert list(r.iter_lines())

    transcript = [{"role": "user", "content": "New feature"}]
    r = client.post("/api/maintenance/plan", json={"transcript": transcript})
    assert r.status_code == 200
    link = r.json()["link"]
    plan_path = Path("tasks") / link.split("/")[-1]
    assert plan_path.exists()

    from scripts import auto_coder

    commands: list[list[str]] = []

    def fake_run(cmd: list[str]) -> None:
        commands.append(cmd)

    monkeypatch.setattr(auto_coder, "run", fake_run)

    auto_coder.main(str(plan_path))

    assert ["pytest"] in commands
    assert ["npm", "test", "--prefix", "frontend"] in commands
    assert any(cmd[:2] == ["git", "commit"] for cmd in commands)

    plan_path.unlink()
