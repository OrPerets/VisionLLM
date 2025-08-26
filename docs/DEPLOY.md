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

### Deploy steps
```bash
git clone <this repo>
cd VisionLLM
docker compose -f infra/docker-compose.yml up -d --build
```

Access:
- Web: http://<host>:3000
- API: http://<host>:8000

### Model cache reuse
TGI uses `hf_cache` volume (`/data/.cache/huggingface`) so model downloads occur once. To pre-seed offline:
1) On a machine with internet: run TGI once with the target `MODEL_ID`.
2) Copy the populated `hf_cache` to the target environment.
3) Mount the volume at the same path on the TGI container.

### Security notes
- Restrict service exposure to your internal network (firewall/security groups).
- Set `AUTH_TOKEN` on the API and require it via a simple bearer check (stub in place).
- Configure CORS to your internal web origin.
- For SSO/OIDC, integrate in front of the API (reverse proxy) or extend the API auth layer.

### Upgrades
- Pull new images or rebuild `api`/`web`.
- The `hf_cache` persists across restarts and upgrades.
- Run `make migrate` to apply DB schema changes when backend updates.


