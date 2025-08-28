from __future__ import annotations

import asyncio
import json
import time
from typing import Any, AsyncIterator, Dict, List

import httpx

from ..config import settings


class TGIClient:
    """Minimal TGI streaming client for SSE-like chunk handling via HTTP chunked JSON."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or settings.model_server_url

    async def warmup(self) -> None:
        """Warm the model by sending a small prompt."""
        prompt = "Hello"  # small allocation and load
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_new_tokens": 1,
                            "temperature": 0.0,
                        },
                        "stream": False,
                    },
                )
        except Exception:
            # Ignore warmup failures; TGI may be unavailable or still loading
            return

    async def stream_generate(
        self,
        prompt: str,
        temperature: float,
        max_new_tokens: int,
        stop: List[str] | None = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream text generation from TGI; yields dicts containing 'token' or 'generated_text' and 'details'."""
        url = f"{self.base_url}/generate_stream"
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_new_tokens,
                "stop": stop or [],
                "return_full_text": False,
            },
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    yield data


client = TGIClient()


class OllamaClient:
    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        self.base_url = base_url or settings.ollama_url
        self.model = model or settings.ollama_model

    async def stream_generate(
        self,
        prompt: str,
        temperature: float,
        max_new_tokens: int,
        stop: List[str] | None = None,
        model: str | None = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model or self.model,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_new_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=None) as http:
            async with http.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    # Ollama streams one JSON per line; extract delta text
                    delta = data.get("message", {}).get("content", "")
                    if delta:
                        yield {"token": {"text": delta}}


ollama_client = OllamaClient()


