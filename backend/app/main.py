from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, projects, conversations, messages, sqltools, chat
from .db import init_db
from .services.tgi_client import client as tgi
import asyncio


def create_app() -> FastAPI:
    app = FastAPI(title="VisionBI AI Assistant API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin] if settings.cors_origin else [],
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


