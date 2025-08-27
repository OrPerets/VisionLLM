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

    # Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=".env.api",
        case_sensitive=False,
        # Allow fields that start with `model_` (e.g., model_server_url)
        protected_namespaces=(),
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


