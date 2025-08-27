from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import asyncio
from .config import settings

# Ensure shared tools module is importable when running in Docker
if "/" not in sys.path:
    sys.path.append("/")

from .routers import health, projects, conversations, messages, sqltools, chat
from .db import init_db
from .services.tgi_client import client as tgi


def create_app() -> FastAPI:
    app = FastAPI(title="VisionBI AI Assistant API", version="0.1.0")

    # Build allowed CORS origins: merge comma-separated env with sensible local defaults
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    if settings.cors_origin:
        env_origins = [o.strip() for o in settings.cors_origin.split(",") if o.strip()]
        # Preserve order: env first, then defaults, and deduplicate
        merged: list[str] = []
        for origin in (*env_origins, *allowed_origins):
            if origin not in merged:
                merged.append(origin)
        allowed_origins = merged

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(projects.router, prefix="/api")
    app.include_router(conversations.router, prefix="/api")
    app.include_router(messages.router, prefix="/api")
    app.include_router(sqltools.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()
        # Fire-and-forget warmup; do not block startup
        try:
            asyncio.get_event_loop().create_task(tgi.warmup())
        except Exception:
            pass

    return app


app = create_app()


