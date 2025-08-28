## VisionBI In-House AI Assistant — Web (FastAPI + Next.js + TGI)

This repository now delivers a production-ready, on‑prem web AI assistant with:
- FastAPI backend with SSE streaming, projects/conversations/messages, SQL tools.
- Hugging Face Text Generation Inference (TGI) model server that loads once and is shared.
- Next.js frontend with modern UX (chat UI, code toolbar, logs, diff viewer, preferences).
- Docker Compose stack: `tgi`, `api`, `db`, `web`.

### Dev Quickstart (Docker, recommended)
```bash
make dev-up          # builds and runs db, tgi, api, web
make logs            # follow logs
# Open http://localhost:3000

# Tear down
make dev-down
```

Environment defaults are embedded in `infra/docker-compose.yml`. To override, export env vars (e.g., `MODEL_ID`).

### Dev Quickstart (Backend only, local)
```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

# Start backend on :8000 (expects TGI at http://localhost:8080)
make backend-dev
```

### Directory Layout
- `backend/`: FastAPI app, models, routers, services, Alembic, tests
- `infra/`: docker-compose, volumes
- `tools/sql_tools.py`: SQL transpile and lint/fix used by the API
- `frontend/`: Next.js app (added in this migration)
- `docs/`: RUNBOOK and DEPLOY guides

### Configuration
Backend env (can be set in container or shell):
- `DATABASE_URL` (default: Postgres in compose)
- `MODEL_SERVER_URL` (default: http://tgi:8080)
- `DEFAULT_MODEL_ID` (default: meta-llama/Meta-Llama-3.1-8B-Instruct)
- `CORS_ORIGIN` (default: http://localhost:3000)
- `TEMPERATURE`, `MAX_TOKENS`

Auth (optional):
- `ENABLE_AUTH` (default: false)
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `ALLOWED_GOOGLE_DOMAINS` (comma-separated)
- `ADMIN_EMAILS` (bootstrap admin emails)

TGI env:
- `MODEL_ID` (default: meta-llama/Meta-Llama-3.1-8B-Instruct)
- `MAX_INPUT_TOKENS`, `MAX_TOTAL_TOKENS` (default: 8192)

### API Endpoints (high-level)
- `GET /api/health`, `GET /api/meta`
- Projects CRUD: `/api/projects`
- Conversations CRUD: `/api/projects/:id/conversations`, `/api/conversations/:id`
- Messages list: `/api/conversations/:id/messages`
- Chat SSE: `POST /api/chat/stream`
- SQL tools: `/api/sql/transpile`, `/api/sql/lint`

### On‑prem Deploy (summary)
1) Provision a Docker host with GPU if desired (TGI benefits from GPU).
2) Prepare a persistent volume for `hf_cache` to ensure one‑time model download.
3) Set `MODEL_ID` and other envs as needed.
4) `docker compose -f infra/docker-compose.yml up -d`.
5) Point users to the internal URL of the `web` service.

See `docs/DEPLOY.md` for detailed on‑prem guidance and cache pre-seeding.

### SQL Tools parity
The backend reuses the existing `tools/sql_tools.py` for transpile and lint/fix to preserve behavior.

### Design tokens
Preserved from the desktop app (accent `#2563eb`, neutrals, spacing, radius, font sizes) and applied in the web UI.

