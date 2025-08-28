from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..auth import ensure_project_member
from .. import models
from ..schemas import MessageRead


router = APIRouter(prefix="/conversations", tags=["messages"])


@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
def list_messages(
    conversation_id: int,
    limit: int = 100,
    before: Optional[int] = None,
    request: Request = None,
    db: Session = Depends(get_db),
):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ensure_project_member(conv.project_id, request, db)
    q = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.desc())
    )
    if before:
        q = q.filter(models.Message.id < before)
    items = q.limit(min(limit, 500)).all()
    return list(reversed(items))



