from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx


class OpenAIClient:
    def __init__(self, api_key: str, base_url: Optional[str] = None, organization: Optional[str] = None) -> None:
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.organization = organization

    async def list_models(self) -> List[str]:
        url = f"{self.base_url}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        if self.organization:
            headers["OpenAI-Organization"] = self.organization
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url, headers=headers)
                r.raise_for_status()
                data = r.json() or {}
                return [str(m.get("id")) for m in (data.get("data") or [])]
        except Exception:
            # Fallback to a minimal recommended set
            return [
                "gpt-4o-mini",
                "gpt-4o",
            ]

    async def stream_generate(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_new_tokens: int,
        stop: Optional[List[str]] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        # Simpler non-streaming; yield one token chunk for compatibility
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if self.organization:
            headers["OpenAI-Organization"] = self.organization

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_new_tokens,
            "stop": stop or [],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=None) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json() or {}
            text = (((data.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
            if text:
                yield {"token": {"text": text}}


class GeminiClient:
    def __init__(self, api_key: str, base_url: Optional[str] = None) -> None:
        self.api_key = api_key
        self.base_url = (base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

    async def list_models(self) -> List[str]:
        url = f"{self.base_url}/models"
        params = {"key": self.api_key}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                data = r.json() or {}
                items = data.get("models") or []
                names: List[str] = []
                for m in items:
                    name = m.get("name") or ""
                    # API returns full resource name like "models/gemini-1.5-flash"
                    if name.startswith("models/"):
                        name = name.split("/", 1)[1]
                    if name:
                        names.append(name)
                return names
        except Exception:
            return [
                "gemini-1.5-flash",
                "gemini-1.5-pro",
            ]

    async def stream_generate(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_new_tokens: int,
        stop: Optional[List[str]] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        # Non-streaming; yield one combined token
        # Endpoint: POST /models/{model}:generateContent?key=API_KEY
        url = f"{self.base_url}/models/{model}:generateContent"
        params = {"key": self.api_key}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_new_tokens,
                # Stop sequences are not portable; ignore for now
            },
        }
        async with httpx.AsyncClient(timeout=None) as client:
            r = await client.post(url, params=params, json=payload)
            r.raise_for_status()
            data = r.json() or {}
            text_parts: List[str] = []
            for cand in (data.get("candidates") or []):
                content = cand.get("content") or {}
                for part in (content.get("parts") or []):
                    t = part.get("text") or ""
                    if t:
                        text_parts.append(t)
            text = "".join(text_parts)
            if text:
                yield {"token": {"text": text}}


async def list_provider_models(provider: str, api_key: str, base_url: Optional[str], organization: Optional[str], project: Optional[str], config: Optional[dict[str, Any]]) -> List[str]:
    provider_lower = (provider or "").strip().lower()
    # If explicit models list configured, honor it
    if (config or {}).get("models"):
        try:
            models_list = list((config or {}).get("models") or [])
            return [str(m) for m in models_list]
        except Exception:
            pass

    if provider_lower == "openai":
        client = OpenAIClient(api_key=api_key, base_url=base_url, organization=organization)
        return await client.list_models()
    if provider_lower in {"google", "gemini"}:
        client = GeminiClient(api_key=api_key, base_url=base_url)
        return await client.list_models()
    # Unknown provider: no models
    return []


async def stream_generate_with_provider(
    provider: str,
    api_key: str,
    base_url: Optional[str],
    organization: Optional[str],
    project: Optional[str],
    model: str,
    prompt: str,
    temperature: float,
    max_new_tokens: int,
    stop: Optional[List[str]] = None,
) -> AsyncIterator[Dict[str, Any]]:
    provider_lower = (provider or "").strip().lower()
    if provider_lower == "openai":
        client = OpenAIClient(api_key=api_key, base_url=base_url, organization=organization)
        async for item in client.stream_generate(prompt=prompt, model=model, temperature=temperature, max_new_tokens=max_new_tokens, stop=stop):
            yield item
        return
    if provider_lower in {"google", "gemini"}:
        client = GeminiClient(api_key=api_key, base_url=base_url)
        async for item in client.stream_generate(prompt=prompt, model=model, temperature=temperature, max_new_tokens=max_new_tokens, stop=stop):
            yield item
        return
    # Unknown provider: return empty
    if False:
        yield {}


