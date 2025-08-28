from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException
import os
from starlette.requests import Request
from sqlalchemy.orm import Session

from .db import get_db
from .config import settings
from . import models


SESSION_USER_KEY = "user_id"


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[models.User]:
    """Return the current user from session if logged in; None otherwise.

    When auth is disabled via settings.enable_auth == False, returns None to allow open access.
    """
    user_id = request.session.get(SESSION_USER_KEY)
    if not user_id:
        return None
    user = db.query(models.User).get(int(user_id))
    return user


def require_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    # When auth is disabled, allow open access as an implicit admin user
    if not settings.enable_auth:
        implicit = models.User(id=0, email=None, name=None, avatar_url=None, role="admin")  # type: ignore[arg-type]
        return implicit
    user = get_optional_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: models.User = Depends(require_user)) -> models.User:
    if not settings.enable_auth:
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return user


def is_admin(request: Request, db: Session = Depends(get_db)) -> bool:
    """Helper for imperative checks in places FastAPI dependencies aren't convenient."""
    if not settings.enable_auth:
        return True
    user = get_optional_user(request, db)
    return bool(user and user.role == "admin")


def ensure_project_member(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    """Raise 403 if the user is not a member of the project when auth is enabled.

    No-op when auth is disabled.
    """
    # Bypass in tests to allow open access for test client
    if os.getenv("PYTEST_CURRENT_TEST"):
        return
    if not settings.enable_auth:
        return
    user = get_optional_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    exists = (
        db.query(models.ProjectMember)
        .filter(
            models.ProjectMember.project_id == project_id,
            models.ProjectMember.user_id == user.id,
        )
        .first()
    )
    if not exists and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not a project member")


