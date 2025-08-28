from __future__ import annotations

from typing import Iterator
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from .config import settings


if settings.database_url.startswith("sqlite") and ":memory:" in settings.database_url:
    # Use a shared in-memory SQLite database across connections during tests
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
        pool_pre_ping=True,
    )

SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)


def init_db() -> None:
    from .models import Base  # noqa: WPS433

    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


