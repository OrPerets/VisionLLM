from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import UniqueConstraint


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=True, unique=True)
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    role = Column(String(20), nullable=False, default="worker")  # admin | worker
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    system_instructions = Column(Text, nullable=True)
    defaults_json = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    conversations = relationship("Conversation", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")

    # Expose defaults_json as `defaults` for API serialization
    @property
    def defaults(self) -> Optional[dict]:
        return self.defaults_json


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    project = relationship("Project", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_conversations_project_id", "project_id"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id"), nullable=False, index=True
    )
    role = Column(String(20), nullable=False)  # system | user | assistant
    content = Column(Text, nullable=False)
    meta_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("idx_messages_conversation_id_created_at", "conversation_id", "created_at"),
    )


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)
    object_type = Column(String(50), nullable=False)
    object_id = Column(Integer, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_in_project = Column(String(20), nullable=False, default="worker")  # admin | worker
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="members")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),
        Index("idx_project_members_project_id", "project_id"),
        Index("idx_project_members_user_id", "user_id"),
    )


class LLMProvider(Base):
    __tablename__ = "llm_providers"

    id = Column(Integer, primary_key=True)
    # Provider type identifier, e.g., "openai", "gemini"
    provider = Column(String(50), nullable=False, unique=True)
    # Optional display name/label for UI
    name = Column(String(255), nullable=True)
    # Secret credentials (stored as plaintext for now; consider KMS/Vault in production)
    api_key = Column(Text, nullable=True)
    # Optional base URL (e.g., for Azure OpenAI or compatible APIs)
    base_url = Column(String(1024), nullable=True)
    # Optional organization or project identifiers
    organization = Column(String(255), nullable=True)
    project = Column(String(255), nullable=True)
    # Arbitrary extra config (e.g., allowed models)
    config_json = Column(JSON, nullable=True)
    # Enable/disable provider
    enabled = Column(Integer, nullable=False, default=1)  # 1=true, 0=false for SQLite simplicity
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    product = Column(String(50), nullable=False)  # snowflake|dbt|tableau
    description = Column(Text, nullable=True)
    categories_json = Column(JSON, nullable=True)  # list[str]
    tags_json = Column(JSON, nullable=True)       # list[str]
    system_instructions = Column(Text, nullable=False)
    knowledge_urls_json = Column(JSON, nullable=True)  # list[str]
    defaults_json = Column(JSON, nullable=True)   # e.g., model_id, temperature, flags
    is_enabled = Column(Integer, nullable=False, default=1)  # 1=true, 0=false for SQLite friendliness
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("name", "product", name="uq_agents_name_product"),
        Index("idx_agents_product", "product"),
    )

    # JSON alias properties for API serialization
    @property
    def categories(self) -> Optional[list]:
        return self.categories_json

    @property
    def tags(self) -> Optional[list]:
        return self.tags_json

    @property
    def knowledge_urls(self) -> Optional[list]:
        return self.knowledge_urls_json

    @property
    def defaults(self) -> Optional[dict]:
        return self.defaults_json
