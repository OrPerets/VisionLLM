from __future__ import annotations

import asyncio
import json
import time
from typing import AsyncGenerator, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..schemas import ChatStreamRequest
from ..config import settings
from ..services.tgi_client import client as tgi


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


async def event_stream(request: ChatStreamRequest, db: Session) -> AsyncGenerator[str, None]:
    project = db.query(models.Project).get(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    conversation = db.query(models.Conversation).get(request.conversation_id)
    if not conversation or conversation.project_id != project.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Collect history by simple recency window (bounded by N messages)
    history = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation.id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    system_prompt = request.system_override or project.system_instructions

    temperature = request.temperature or (project.defaults_json or {}).get("temperature", settings.temperature)
    max_tokens = request.max_tokens or (project.defaults_json or {}).get("max_tokens", settings.max_tokens)
    model_id = (project.defaults_json or {}).get("model_id", settings.default_model_id)

    # Note: We do not swap model on TGI at runtime; model_id is for display/storage
    prompt = build_prompt(system_prompt, history, request.user_text)

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

    async for item in tgi.stream_generate(prompt, temperature=temperature, max_new_tokens=max_tokens):
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

    # Persist assistant message with meta
    meta = {
        "elapsed_sec": elapsed,
        "tokens_per_sec": tokens_per_sec,
        "usage": {
            "prompt_tokens": None,
            "completion_tokens": num_tokens,
            "total_tokens": None,
        },
        "backend": "tgi",
        "model_id": model_id,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    assistant_msg = models.Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_text,
        meta_json=meta,
    )
    db.add(assistant_msg)
    conversation.updated_at = assistant_msg.created_at
    db.commit()
    db.refresh(assistant_msg)

    done_payload = {
        "message_id": assistant_msg.id,
        "meta": meta,
    }
    yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"


@router.post("/stream")
def stream_chat(request: ChatStreamRequest, db=Depends(get_db)):
    async def generator():
        async for chunk in event_stream(request, db):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream")


