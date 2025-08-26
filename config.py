from pathlib import Path
import sys
import os

APP_NAME = "VisionBI-AI"
RESOURCES_DIR = "Resources"
MODEL_FILENAME = "model.gguf"  # replace if you ship a specific file name

def resource_path(rel: str) -> str:
    """Return absolute path to resource, supporting PyInstaller (_MEIPASS)."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str((base / rel).resolve())

# Default LLM config
LLM_CONFIG = {
    "model_path": resource_path(f"{RESOURCES_DIR}/{MODEL_FILENAME}"),
    "n_ctx": int(os.getenv("LLM_N_CTX", 8192)),
    # On macOS Metal, -1 offloads all layers to GPU; on CPU use 0
    "n_gpu_layers": int(os.getenv("LLM_N_GPU_LAYERS", (-1 if sys.platform == "darwin" else 0))),
    "temperature": float(os.getenv("LLM_TEMPERATURE", 0.2)),
    "max_tokens": int(os.getenv("LLM_MAX_TOKENS", 800)),
    # Backend selection: auto | llama | ollama
    "backend": os.getenv("LLM_BACKEND", "auto"),
    # Ollama options (used when backend==ollama or OLLAMA_MODEL is set)
    "ollama_model": os.getenv("OLLAMA_MODEL", None),
    "ollama_host": os.getenv("OLLAMA_HOST", None),
}

# SQL defaults
DEFAULT_SOURCE_DIALECT = "snowflake"
DEFAULT_TARGET_DIALECT = "bigquery"
DEFAULT_LINT_DIALECT = "snowflake"

# UI defaults (optional)
# Whether to enable token streaming by default (if backend supports)
UI_DEFAULT_STREAM = str(os.getenv("UI_DEFAULT_STREAM", "true")).lower() in ("1", "true", "yes", "on")
# Whether the Logs panel starts open
UI_LOGS_OPEN = str(os.getenv("UI_LOGS_OPEN", "false")).lower() in ("1", "true", "yes", "on")
# Theme: light | dark
THEME = str(os.getenv("THEME", "light")).lower() if str(os.getenv("THEME", "light")).lower() in ("light", "dark") else "light"
# UI Polish flags
UI_COMPACT_MODE = str(os.getenv("UI_COMPACT_MODE", "false")).lower() in ("1", "true", "yes", "on")
UI_ANIMATION_ENABLED = str(os.getenv("UI_ANIMATION_ENABLED", "true")).lower() in ("1", "true", "yes", "on")
