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
        async with httpx.AsyncClient(timeout=30) as client:
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


