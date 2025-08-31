
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import require_admin

import json
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..config import settings
from ..services.tgi_client import client as tgi, ollama_client

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

class MaintenanceMessage(BaseModel):
    role: str
    content: str

class PlanRequest(BaseModel):
    transcript: List[MaintenanceMessage]


class PlanResponse(BaseModel):
    link: str


router = APIRouter(prefix="/maintenance", tags=["maintenance"], dependencies=[Depends(require_admin)])


@router.post("/plan", response_model=PlanResponse)
async def generate_plan(payload: PlanRequest) -> PlanResponse:
    if not payload.transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    first_user_msg = next((m.content for m in payload.transcript if m.role == "user"), "plan")
    slug_base = first_user_msg[:50].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug_base).strip("-") or "plan"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}-{slug}.md"

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    tasks_dir = os.path.join(repo_root, "tasks")
    os.makedirs(tasks_dir, exist_ok=True)
    file_path = os.path.join(tasks_dir, filename)

    user_messages = [m.content for m in payload.transcript if m.role == "user"]
    summary = user_messages[0] if user_messages else "Generated plan"

    plan_md = (
        "# Maintenance Plan\n\n"
        f"## Summary\n{summary}\n\n"
        "## User Stories\n" + "\n".join(f"- {m}" for m in user_messages) + "\n\n"
        "## Implementation Steps\n- TBD\n\n"
        "## Test Plan\n- TBD\n"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(plan_md)

    return PlanResponse(link=f"/tasks/{filename}")

class MaintenanceStreamRequest(BaseModel):
    messages: List[MaintenanceMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


def _build_prompt(messages: List[MaintenanceMessage]) -> str:
    parts: List[str] = []
    for m in messages:
        role = m.role if m.role in {"user", "assistant", "system"} else "user"
        parts.append(f"<|{role}|>\n{m.content}")
    parts.append("<|assistant|>")
    return "\n".join(parts)


@router.post("/stream")
def stream_requirements(request: MaintenanceStreamRequest):
    async def generator() -> AsyncGenerator[str, None]:
        prompt = _build_prompt(request.messages)
        temperature = request.temperature or settings.temperature
        max_tokens = request.max_tokens or settings.max_tokens
        backend = settings.model_backend
        if backend == "ollama":
            async for item in ollama_client.stream_generate(prompt, temperature, max_tokens, model=settings.default_model_id):
                delta = item.get("token", {}).get("text", "")
                if delta:
                    yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"
        else:
            async for item in tgi.stream_generate(prompt, temperature, max_tokens):
                delta = item.get("token", {}).get("text", "")
                if delta:
                    yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")