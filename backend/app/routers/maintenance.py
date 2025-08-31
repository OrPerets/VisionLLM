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
