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

# ------------------------------------------------------------------
# Feature flags for upcoming UI work
# ------------------------------------------------------------------
UI_USE_FLUENT = str(os.getenv("UI_USE_FLUENT", "true")).lower() in ("1", "true", "yes", "on")
UI_FRAMELESS = str(os.getenv("UI_FRAMELESS", "true")).lower() in ("1", "true", "yes", "on")
UI_ENABLE_ANIMATIONS = str(os.getenv("UI_ENABLE_ANIMATIONS", "true")).lower() in ("1", "true", "yes", "on")

# ------------------------------------------------------------------
# Design tokens
# ------------------------------------------------------------------
ACCENT_COLOR = "#2563eb"

NEUTRALS = {
    "light": {
        "background": "#ffffff",
        "surface": "#f8f9fa",
        "text": "#1f2937",
        "text_muted": "#6b7280",
        "border": "#e5e7eb",
    },
    "dark": {
        "background": "#1f2937",
        "surface": "#374151",
        "text": "#f9fafb",
        "text_muted": "#d1d5db",
        "border": "#4b5563",
    },
}

BORDER_RADIUS = 6
SPACING = 8
SPACING_HALF = 4

FONT_SIZES = {
    "title": 18,
    "label": 14,
    "body": 13,
}

