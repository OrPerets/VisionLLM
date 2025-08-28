from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from . import models


def _normalize_actor_id(user_id: Optional[int]) -> Optional[int]:
    """Return a valid actor_id or None if not a persisted user.

    In no-auth mode we may synthesize a user with id=0; avoid FK issues by storing None.
    """
    try:
        if user_id is None:
            return None
        if int(user_id) <= 0:
            return None
        return int(user_id)
    except Exception:
        return None


def record_activity(
    db: Session,
    *,
    actor_id: Optional[int],
    action: str,
    object_type: str,
    object_id: int,
    project_id: Optional[int] = None,
) -> None:
    """Insert a best-effort activity log entry; failures are non-fatal."""
    # Normalize and validate actor_id against existing users to avoid FK errors
    normalized = _normalize_actor_id(actor_id)
    if normalized is not None:
        try:
            if not db.query(models.User).get(normalized):
                normalized = None
        except Exception:
            normalized = None

    entry = models.ActivityLog(
        actor_id=normalized,
        action=action,
        object_type=object_type,
        object_id=object_id,
        project_id=project_id,
    )
    db.add(entry)
    try:
        db.commit()
    except Exception:
        db.rollback()


