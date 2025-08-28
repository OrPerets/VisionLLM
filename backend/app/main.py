from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import sys
import os
import asyncio
from .config import settings

# Ensure repo root and tools module are importable when running locally or in Docker
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
for p in [repo_root, "/", os.path.join(repo_root, "tools")]:
	if p not in sys.path:
		sys.path.append(p)

from .routers import health, projects, conversations, messages, sqltools, chat
from .db import init_db, engine
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

	# Session middleware (for auth cookies)
	app.add_middleware(SessionMiddleware, secret_key=settings.session_secret, same_site="lax")

	app.include_router(health.router, prefix="/api")
	app.include_router(projects.router, prefix="/api")
	app.include_router(conversations.router, prefix="/api")
	app.include_router(messages.router, prefix="/api")
	app.include_router(sqltools.router, prefix="/api")
	from .routers import auth as auth_router

	app.include_router(chat.router, prefix="/api")
	app.include_router(auth_router.router, prefix="/api")
	from .routers import admin as admin_router
	app.include_router(admin_router.router, prefix="/api")

	# Simple in-memory rate limiter (per IP) — best-effort only
	if settings.rate_limit_enabled:
		from collections import defaultdict, deque
		from time import time

		window = max(1, int(settings.rate_limit_window_sec))
		limit = max(1, int(settings.rate_limit_requests))
		buckets: dict[str, deque[float]] = defaultdict(deque)

		@app.middleware("http")
		async def rate_limit_middleware(request: Request, call_next):
			path = request.url.path
			# Limit chat stream and SQL tools by default
			if path.startswith("/api/chat") or path.startswith("/api/sql"):
				ip = request.client.host if request.client else "unknown"
				now = time()
				q = buckets[ip]
				# Drop old timestamps
				while q and now - q[0] > window:
					q.popleft()
				if len(q) >= limit:
					from fastapi.responses import JSONResponse
					return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
				q.append(now)
			response = await call_next(request)
			return response

	@app.on_event("startup")
	def on_startup() -> None:
		# In test runs, reset SQLite DB file to ensure clean state between invocations
		try:
			if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("DISABLE_ENV_FILE_FOR_TESTS") == "1":
				if settings.database_url.startswith("sqlite///") or settings.database_url.startswith("sqlite:///"):
					db_path = settings.database_url.replace("sqlite:///", "")
					abs_path = os.path.abspath(db_path)
					try:
						engine.dispose()
					except Exception:
						pass
					if os.path.exists(abs_path):
						os.remove(abs_path)
		except Exception:
			pass
		init_db()
		# Fire-and-forget warmup; do not block startup
		try:
			asyncio.get_event_loop().create_task(tgi.warmup())
		except Exception:
			pass

	return app


app = create_app()


