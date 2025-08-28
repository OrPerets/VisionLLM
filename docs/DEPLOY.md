## On‑prem Deploy — VisionBI In-House AI Assistant

### Prereqs
- Docker 24+
- Optional NVIDIA GPU with drivers + container toolkit for TGI acceleration
- Persistent volumes for Postgres and HF cache

### Environment
- Default values are embedded in `infra/docker-compose.yml`. Override via env vars:
  - `MODEL_ID` (e.g., meta-llama/Meta-Llama-3.1-8B-Instruct)
  - `MAX_INPUT_TOKENS`, `MAX_TOTAL_TOKENS`
  - `DATABASE_URL`, `CORS_ORIGIN`, `TEMPERATURE`, `MAX_TOKENS`

### Deploy steps (production)
```bash
git clone <this repo>
cd VisionLLM

# 1) Prepare env files
# Backend API env consumed by compose (`env_file` in api service)
cp infra/env.api.example backend/.env.api
# TGI env (model id, tokens)
cp infra/env.tgi.example infra/env.tgi

# 2) Edit values:
# - backend/.env.api → CORS_ORIGIN (your web URL), SESSION_SECRET, ENABLE_AUTH, etc.
# - infra/env.tgi → MODEL_ID you want to serve, optional HF token

# 3) Bring up stack with production override (keeps db/tgi internal, sets API base for web)
export NEXT_PUBLIC_API_BASE="http://<api-host>:8000/api"
export CORS_ORIGIN="http://<web-host>:3000"
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  up -d --build

# 4) Apply DB migrations (one-time per upgrade)
docker compose -f infra/docker-compose.yml exec api make migrate | cat
```

Access:
- Web: http://<web-host>:3000
- API: http://<api-host>:8000

### Model cache reuse
TGI uses `hf_cache` volume (`/data/.cache/huggingface`) so model downloads occur once. To pre-seed offline:
1) On a machine with internet: run TGI once with the target `MODEL_ID`.
2) Copy the populated `hf_cache` to the target environment.
3) Mount the volume at the same path on the TGI container.

### Security notes
- Keep `db` and `tgi` internal-only (prod override does this by default).
- Restrict `web` and `api` to your internal network (firewall/security groups).
- Configure `CORS_ORIGIN` to your internal web origin.
- Front the `web` and `api` services with a reverse proxy or load balancer for TLS.
- For SSO/OIDC, integrate at the proxy or extend the API auth layer.

### Upgrades
- Pull new images or rebuild `api`/`web`.
- The `hf_cache` persists across restarts and upgrades.
- Run `make migrate` to apply DB schema changes when backend updates.


