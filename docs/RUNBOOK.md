## RUNBOOK — VisionBI In-House AI Assistant

### Services
- tgi: Hugging Face Text Generation Inference, exposes :8080
- api: FastAPI backend, exposes :8000
- db: Postgres 15, exposes :5432 (dev only)
- web: Next.js app, exposes :3000

### Health checks
- API: GET http://localhost:8000/api/health → { ok: true }
- Meta: GET http://localhost:8000/api/meta → model status
- TGI: GET http://localhost:8080/health → 200 when ready

### Common operations
- View logs: `make logs`
- Restart api only: `docker compose -f infra/docker-compose.yml restart api`
- Apply DB migrations: `make migrate`
- Seed demo data: `make seed`

### Troubleshooting
- TGI slow on first run: model weights download to `hf_cache` volume. Keep it persistent.
- CORS errors: ensure `CORS_ORIGIN` matches `web` origin.
- Chat not streaming: check TGI `/health` and backend logs for connection errors.

### Backups
- Database: snapshot `db_data` volume (e.g., `pg_dump` or volume-level backup).
- Model cache: snapshot `hf_cache` (optional; can be re-downloaded if license permits).


