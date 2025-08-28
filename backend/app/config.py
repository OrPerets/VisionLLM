from __future__ import annotations

import os
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	"""Environment-driven configuration for the API service."""

	# Core
	environment: str = Field("dev", env="ENVIRONMENT")
	cors_origin: str | None = Field(None, env="CORS_ORIGIN")
	auth_token: str | None = Field(None, env="AUTH_TOKEN")
	enable_auth: bool = Field(False, env="ENABLE_AUTH")
	frontend_url: str | None = Field(None, env="FRONTEND_URL")

	# Database
	database_url: str = Field(
		default="sqlite:///./visionbi.db", env="DATABASE_URL"
	)

	# Model server (TGI)
	model_server_url: str = Field(
		default="http://tgi:8080", env="MODEL_SERVER_URL"
	)
	default_model_id: str = Field(
		default="meta-llama/Meta-Llama-3.1-8B-Instruct", env="DEFAULT_MODEL_ID"
	)
	max_input_tokens: int = Field(8192, env="MAX_INPUT_TOKENS")
	max_total_tokens: int = Field(8192, env="MAX_TOTAL_TOKENS")
	temperature: float = Field(0.2, env="TEMPERATURE")
	max_tokens: int = Field(800, env="MAX_TOKENS")

	# Backend selection: 'tgi' or 'ollama'
	model_backend: str = Field("tgi", env="MODEL_BACKEND")

	# Ollama settings for local POC on macOS
	ollama_url: str = Field("http://host.docker.internal:11434", env="OLLAMA_URL")
	ollama_model: str = Field("llama3.2:3b-instruct", env="OLLAMA_MODEL")

	# Auth/OAuth settings
	session_secret: str = Field("dev-insecure-secret", env="SESSION_SECRET")
	google_client_id: str | None = Field(None, env="GOOGLE_CLIENT_ID")
	google_client_secret: str | None = Field(None, env="GOOGLE_CLIENT_SECRET")
	google_redirect_uri: str | None = Field(None, env="GOOGLE_REDIRECT_URI")
	allowed_google_domains: str | None = Field(None, env="ALLOWED_GOOGLE_DOMAINS")
	admin_emails: str | None = Field(None, env="ADMIN_EMAILS")

	# Rate limiting
	rate_limit_enabled: bool = Field(False, env="RATE_LIMIT_ENABLED")
	rate_limit_requests: int = Field(60, env="RATE_LIMIT_REQUESTS")
	rate_limit_window_sec: int = Field(60, env="RATE_LIMIT_WINDOW_SEC")

	# Pydantic v2 config
	model_config = SettingsConfigDict(
		env_file=None if os.getenv("DISABLE_ENV_FILE_FOR_TESTS") == "1" else ".env.api",
		case_sensitive=False,
		# Allow fields that start with `model_` (e.g., model_server_url)
		protected_namespaces=(),
	)


@lru_cache()

def get_settings() -> Settings:
	cfg = Settings()
	if os.getenv("DISABLE_ENV_FILE_FOR_TESTS") == "1":
		cfg.database_url = "sqlite:///:memory:"
		cfg.enable_auth = False
	return cfg


settings = get_settings()


