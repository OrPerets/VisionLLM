from typing import List, Dict, Any, Callable, Tuple
import os
import time
from datetime import datetime
from config import LLM_CONFIG

# Import llama_cpp lazily to allow running with an Ollama backend without the shared lib
_llama_import_error: Exception | None = None
try:
    from llama_cpp import Llama  # type: ignore
except Exception as e:  # pragma: no cover - optional dependency at runtime
    Llama = None  # type: ignore
    _llama_import_error = e

_ollama_import_error: Exception | None = None
try:
    import ollama  # type: ignore
except Exception as e:  # pragma: no cover - optional dependency at runtime
    ollama = None  # type: ignore
    _ollama_import_error = e

class CancelledError(Exception):
    """Raised to indicate user-cancelled streaming with optional partial text."""
    def __init__(self, message: str = "Cancelled", partial_text: str = "", meta: Dict[str, Any] | None = None):
        super().__init__(message)
        self.partial_text = partial_text
        self.meta = meta or {}


class LLM:
    """Chat backend wrapper with automatic fallback to Ollama.

    Prefers local GGUF via llama.cpp. If that fails or backend is set to
    'ollama', uses the local Ollama server via its HTTP API.
    """

    def __init__(self):
        self.temperature: float = LLM_CONFIG["temperature"]
        self.max_tokens: int = LLM_CONFIG["max_tokens"]
        self.n_ctx: int = LLM_CONFIG["n_ctx"]

        requested_backend = str(LLM_CONFIG.get("backend", "auto")).lower()
        self.backend: str = ""

        # If explicitly requested Ollama (via env/config), choose it.
        if requested_backend == "ollama" or os.getenv("OLLAMA_MODEL"):
            self._init_ollama()
            return

        # Try llama.cpp first (auto or llama set)
        if requested_backend in ("auto", "llama", "llama_cpp", "llamacpp"):
            try:
                if Llama is None:
                    raise RuntimeError(
                        f"llama_cpp import failed: {_llama_import_error!r}"
                    )
                self.llm = Llama(
                    model_path=LLM_CONFIG["model_path"],
                    n_ctx=self.n_ctx,
                    n_gpu_layers=LLM_CONFIG["n_gpu_layers"],
                    verbose=False,
                )
                self.backend = "llama"
                return
            except Exception as e:
                # If Ollama is configured, fall back, otherwise surface the error
                if LLM_CONFIG.get("ollama_model") or os.getenv("OLLAMA_MODEL"):
                    self._init_ollama()
                    return
                # Raise with a helpful hint
                raise RuntimeError(
                    f"Failed to load GGUF via llama.cpp: {e}.\n"
                    "Tip: set OLLAMA_MODEL=gpt-oss:20b to use the local Ollama server, "
                    "or place a compatible GGUF at Resources/model.gguf."
                )

        # Fallback catch-all: default to Ollama if asked for anything else
        self._init_ollama()

    def _init_ollama(self) -> None:
        if ollama is None:
            raise RuntimeError(
                f"Ollama backend requested but python 'ollama' package is missing: {_ollama_import_error!r}"
            )
        self.ollama_model: str = (
            str(LLM_CONFIG.get("ollama_model") or os.getenv("OLLAMA_MODEL") or "")
        )
        if not self.ollama_model:
            raise RuntimeError(
                "Ollama backend selected but no model specified. Set OLLAMA_MODEL, e.g. 'gpt-oss:20b'."
            )
        # Allow custom host via OLLAMA_HOST (default http://127.0.0.1:11434)
        host = LLM_CONFIG.get("ollama_host") or os.getenv("OLLAMA_HOST")
        if host:
            ollama.set_base_url(str(host))
        self.backend = "ollama"

    def chat(self, system: str, user: str, history: List[Dict[str, Any]] | None = None) -> str:
        text, _meta = self.chat_with_meta(system, user, history=history, stream=False)
        return text

    def chat_with_meta(
        self,
        system: str,
        user: str,
        history: List[Dict[str, Any]] | None = None,
        stream: bool = False,
        on_delta: Callable[[str], None] | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """Chat and return (text, meta) with basic observability.

        - Keeps chat() behavior intact by calling this with stream=False.
        - When stream=True and on_delta is provided, calls on_delta(delta_text) as tokens arrive.
        - Meta includes backend, model, n_ctx, temperature, max_tokens, timing, and usage if available.
        """
        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        if history:
            for msg in history:
                role = str(msg.get("role", "")).strip() or "user"
                content = str(msg.get("content", ""))
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user})

        start_monotonic = time.perf_counter()
        start_iso = datetime.utcnow().isoformat() + "Z"
        text: str = ""
        meta: Dict[str, Any] = {
            "backend": self.backend,
            "model": (getattr(self, "ollama_model", None) if self.backend == "ollama" else LLM_CONFIG.get("model_path")),
            "n_ctx": self.n_ctx,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "start_time": start_iso,
            "end_time": None,
            "elapsed_sec": None,
            "usage": {},
            "warnings": [],
        }

        if self.backend == "ollama":
            options = {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
                "num_ctx": self.n_ctx,
            }
            try:
                if stream:
                    last_chunk: Dict[str, Any] | None = None
                    for chunk in ollama.chat(model=self.ollama_model, messages=messages, options=options, stream=True):
                        if should_cancel and should_cancel():
                            meta_cancel = dict(meta)
                            end_monotonic = time.perf_counter()
                            meta_cancel["end_time"] = datetime.utcnow().isoformat() + "Z"
                            meta_cancel["elapsed_sec"] = max(0.0, end_monotonic - start_monotonic)
                            meta_cancel["cancelled"] = True
                            raise CancelledError(partial_text=text, meta=meta_cancel)
                        last_chunk = chunk
                        delta = str(chunk.get("message", {}).get("content", ""))
                        if delta:
                            text += delta
                            if on_delta:
                                on_delta(delta)
                    # Extract usage/timings from the last chunk if present
                    if last_chunk:
                        prompt_eval_count = last_chunk.get("prompt_eval_count")
                        eval_count = last_chunk.get("eval_count")
                        eval_duration = last_chunk.get("eval_duration")  # ns
                        total_duration = last_chunk.get("total_duration")  # ns
                        usage: Dict[str, Any] = {}
                        if prompt_eval_count is not None:
                            usage["prompt_tokens"] = int(prompt_eval_count)
                        if eval_count is not None:
                            usage["completion_tokens"] = int(eval_count)
                        if usage:
                            usage["total_tokens"] = int(usage.get("prompt_tokens", 0)) + int(usage.get("completion_tokens", 0))
                        meta["usage"] = usage
                        if eval_duration:
                            # Prefer eval duration for tokens/sec
                            try:
                                seconds = float(eval_duration) / 1e9
                                if seconds > 0 and eval_count:
                                    meta["tokens_per_sec"] = float(eval_count) / seconds
                            except Exception:
                                pass
                        if total_duration:
                            try:
                                meta["total_duration_sec"] = float(total_duration) / 1e9
                            except Exception:
                                pass
                else:
                    resp = ollama.chat(model=self.ollama_model, messages=messages, options=options)
                    text = str(resp.get("message", {}).get("content", "")).strip()
                    usage: Dict[str, Any] = {}
                    if resp.get("prompt_eval_count") is not None:
                        usage["prompt_tokens"] = int(resp.get("prompt_eval_count"))
                    if resp.get("eval_count") is not None:
                        usage["completion_tokens"] = int(resp.get("eval_count"))
                    if usage:
                        usage["total_tokens"] = int(usage.get("prompt_tokens", 0)) + int(usage.get("completion_tokens", 0))
                    meta["usage"] = usage
                    # Timings (ns)
                    eval_duration = resp.get("eval_duration")
                    total_duration = resp.get("total_duration")
                    if eval_duration and resp.get("eval_count"):
                        try:
                            seconds = float(eval_duration) / 1e9
                            if seconds > 0:
                                meta["tokens_per_sec"] = float(resp.get("eval_count")) / seconds
                        except Exception:
                            pass
                    if total_duration:
                        try:
                            meta["total_duration_sec"] = float(total_duration) / 1e9
                        except Exception:
                            pass
            except Exception as e:
                meta["warnings"].append(f"ollama.chat error: {e}")
                raise
        else:
            # llama.cpp backend
            try:
                if stream:
                    for part in self.llm.create_chat_completion(
                        messages=messages,
                        temperature=self.temperature,
                        max_tokens=self.max_tokens,
                        stream=True,
                    ):
                        if should_cancel and should_cancel():
                            meta_cancel = dict(meta)
                            end_monotonic = time.perf_counter()
                            meta_cancel["end_time"] = datetime.utcnow().isoformat() + "Z"
                            meta_cancel["elapsed_sec"] = max(0.0, end_monotonic - start_monotonic)
                            meta_cancel["cancelled"] = True
                            raise CancelledError(partial_text=text, meta=meta_cancel)
                        # Depending on version, delta path may vary
                        delta = ""
                        try:
                            delta = str(part["choices"][0].get("delta", {}).get("content", ""))
                        except Exception:
                            delta = str(part.get("choices", [{}])[0].get("text", ""))
                        if delta:
                            text += delta
                            if on_delta:
                                on_delta(delta)
                else:
                    out = self.llm.create_chat_completion(
                        messages=messages,
                        temperature=self.temperature,
                        max_tokens=self.max_tokens,
                    )
                    text = out["choices"][0]["message"]["content"].strip()
                    if isinstance(out, dict) and out.get("usage"):
                        # llama.cpp may include usage in some builds
                        meta["usage"] = dict(out.get("usage", {}))
            except Exception as e:
                meta["warnings"].append(f"llama.cpp error: {e}")
                raise

        end_monotonic = time.perf_counter()
        meta["end_time"] = datetime.utcnow().isoformat() + "Z"
        meta["elapsed_sec"] = max(0.0, end_monotonic - start_monotonic)
        return text, meta
