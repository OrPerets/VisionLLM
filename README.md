## VisionBI In-House AI Assistant — Web (FastAPI + Next.js + TGI/Ollama)

This repository delivers a production-ready, on‑prem web AI assistant with:
- FastAPI backend with SSE streaming, projects/conversations/messages, SQL tools.
- Pluggable LLM backends: Hugging Face Text Generation Inference (TGI) or Ollama.
- Next.js frontend with modern UX (chat UI, code toolbar, logs, diff viewer, preferences).
- Docker Compose stack: `tgi` (or host Ollama), `api`, `db`, `web`.

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

# Start backend on :8000
# Option A: with TGI at http://localhost:8080
# Option B: with local Ollama at http://localhost:11434
make backend-dev
```

### Directory Layout
- `backend/`: FastAPI app, models, routers, services, Alembic, tests
- `infra/`: docker-compose, volumes
- `tools/sql_tools.py`: SQL transpile and lint/fix used by the API
- `frontend/`: Next.js app
- `docs/`: RUNBOOK and DEPLOY guides

### Configuration
Backend env (can be set in container or shell):
- `ENVIRONMENT` (default: dev)
- `DATABASE_URL` (default: sqlite:///./visionbi.db locally; Postgres in compose)
- `MODEL_BACKEND` (default: tgi; options: `tgi` or `ollama`)
- `MODEL_SERVER_URL` (default: http://tgi:8080 when using TGI)
- `DEFAULT_MODEL_ID` (default: meta-llama/Meta-Llama-3.1-8B-Instruct)
- `MAX_INPUT_TOKENS` (default: 8192)
- `MAX_TOTAL_TOKENS` (default: 8192)
- `TEMPERATURE` (default: 0.2)
- `MAX_TOKENS` (default: 800)
- `CORS_ORIGIN` (default: http://localhost:3000)
- `FRONTEND_URL` (optional)

Ollama (if `MODEL_BACKEND=ollama`):
- `OLLAMA_URL` (default: http://host.docker.internal:11434)
- `OLLAMA_MODEL` (default: llama3.2:3b-instruct)

Auth (optional):
- `ENABLE_AUTH` (default: false)
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `ALLOWED_GOOGLE_DOMAINS` (comma-separated)
- `ADMIN_EMAILS` (bootstrap admin emails)

TGI env:
- `MODEL_ID` (e.g., meta-llama/Meta-Llama-3.1-8B-Instruct)
- `MAX_INPUT_TOKENS`, `MAX_TOTAL_TOKENS`

### API Endpoints (high-level)
- `GET /api/health`, `GET /api/meta`
- Auth: `POST /api/auth/login` (if enabled)
- Projects CRUD: `/api/projects`
- Conversations CRUD: `/api/projects/:id/conversations`, `/api/conversations/:id`
- Messages: `/api/conversations/:id/messages`
- Chat SSE: `POST /api/chat/stream`
- SQL tools: `/api/sql/transpile`, `/api/sql/lint`

### On‑prem Deploy (summary)
1) Provision a Docker host with GPU if desired (TGI benefits from GPU).
2) Prepare persistent volumes for Postgres and `hf_cache`.
3) Set `MODEL_ID` (TGI) or configure `MODEL_BACKEND=ollama` and `OLLAMA_*`.
4) `docker compose -f infra/docker-compose.yml up -d`.
5) Point users to the internal URL of the `web` service.

See `docs/DEPLOY.md` for detailed on‑prem guidance and cache pre-seeding.

### SQL Tools parity
The backend uses `tools/sql_tools.py` for transpile and lint/fix.

### Design tokens
Preserved from the desktop app (accent `#2563eb`, neutrals, spacing, radius, font sizes) and applied in the web UI.

### Maintenance Workflow

Admins can access the `/maintenance` page to describe new features. Once the chat assistant replies `CONFIRMED`, the transcript can be submitted to `/api/maintenance/plan` and a Markdown implementation plan is saved under `tasks/`.

The helper script `scripts/auto_coder.py` reads a plan file, runs `pytest` and `npm test`, commits the results on a new branch, pushes, and opens a pull request. All generated plans remain version-controlled for an audit trail.

### End-to-End Maintenance Test

An integration test exercises the entire maintenance workflow—from chat to plan generation and automated agent execution.

```bash
pytest backend/tests/test_maintenance.py::test_full_maintenance_workflow
```

The test mocks LLM and git interactions so it can run locally without side effects. If it fails due to missing Python packages, ensure dependencies are installed via `pip install -r requirements.txt`. Frontend tests can be run with `npm test --prefix frontend`; install dependencies first using `npm install --prefix frontend` if `npm` reports missing modules.

