from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field
from pydantic import ConfigDict


class Meta(BaseModel):
    elapsed_sec: float | None = None
    tokens_per_sec: float | None = None
    usage: dict[str, int] | None = None
    backend: str | None = None
    model_id: str | None = None
    # Allow field names starting with `model_` without warnings
    model_config = ConfigDict(protected_namespaces=())


class UserRead(BaseModel):
    id: int
    email: Optional[str]
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str
    system_instructions: Optional[str] = None
    defaults: Optional[dict[str, Any]] = Field(default=None, description="Model defaults: temperature, max_tokens, model_id")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    system_instructions: Optional[str] = None
    defaults: Optional[dict[str, Any]] = None


class ProjectRead(BaseModel):
    id: int
    name: str
    system_instructions: Optional[str]
    defaults: Optional[dict[str, Any]]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberCreate(BaseModel):
    email: str
    role_in_project: Optional[str] = Field(default="worker")


class ProjectMemberRead(BaseModel):
    id: int
    project_id: int
    user_id: int
    role_in_project: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberUpdate(BaseModel):
    role_in_project: str


class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None


class ConversationRead(BaseModel):
    id: int
    project_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageRead(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    meta_json: Optional[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatStreamRequest(BaseModel):
    project_id: int
    conversation_id: int
    user_text: str
    stream: bool = True
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_override: Optional[str] = None
    history_strategy: Optional[str] = Field(default="recent", description="recent|window token-bounded history")
    use_rag: Optional[bool] = Field(default=False, description="Enable Retrieval-Augmented Generation")
    top_k: Optional[int] = Field(default=12)
    low_conf_threshold: Optional[float] = Field(default=0.52)
    model_id: Optional[str] = Field(default=None, description="Optional model override for this request")
    agent_id: Optional[int] = Field(default=None, description="Optional agent selection for this request")


class SQLTranspileRequest(BaseModel):
    sql: str
    source: str
    target: str


class SQLTranspileResponse(BaseModel):
    result: str


class SQLLintRequest(BaseModel):
    sql: str
    dialect: str


class SQLLintResponse(BaseModel):
    report: str
    fixed: str


class ActivityLogRead(BaseModel):
    id: int
    actor_id: Optional[int]
    action: str
    object_type: str
    object_id: int
    project_id: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: str


class SearchResponse(BaseModel):
    projects: list["ProjectRead"]
    conversations: list["ConversationRead"]


# Models/admin
class ModelInfo(BaseModel):
    name: str
    size_bytes: Optional[int] = None
    parameter_size: Optional[str] = None
    quantization: Optional[str] = None
    format: Optional[str] = None
    source: Optional[str] = None  # ollama | tgi | gguf | provider
    provider: Optional[str] = None  # openai | google | ...


class ModelsResponse(BaseModel):
    backend: str
    models: list[ModelInfo]
    default_model_id: Optional[str] = None
    current_ollama_model: Optional[str] = None
    providers: Optional[list[str]] = None


# Admin: LLM Providers
class LLMProviderCreate(BaseModel):
    provider: str
    name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    organization: Optional[str] = None
    project: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    enabled: Optional[bool] = True


class LLMProviderRead(BaseModel):
    id: int
    provider: str
    name: Optional[str]
    base_url: Optional[str]
    organization: Optional[str]
    project: Optional[str]
    config: Optional[dict[str, Any]]
    enabled: bool

    model_config = ConfigDict(from_attributes=True)


class LLMProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    organization: Optional[str] = None
    project: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    enabled: Optional[bool] = None


class PullModelRequest(BaseModel):
    name: str


class PullModelResponse(BaseModel):
    ok: bool
    status: str
    name: Optional[str] = None


class DeleteModelResponse(BaseModel):
    ok: bool


# Agents
class AgentBase(BaseModel):
    name: str
    product: str
    description: Optional[str] = None
    categories: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    system_instructions: str
    knowledge_urls: Optional[list[str]] = None
    defaults: Optional[dict] = None
    is_enabled: Optional[bool] = True


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    product: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    system_instructions: Optional[str] = None
    knowledge_urls: Optional[list[str]] = None
    defaults: Optional[dict] = None
    is_enabled: Optional[bool] = None


class AgentRead(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AgentRecommendRequest(BaseModel):
    q: str
    product: Optional[str] = None
    categories: Optional[list[str]] = None
    top_k: Optional[int] = 10


class AgentRecommendation(BaseModel):
    agent: AgentRead
    score: float
    reason: str

