from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..schemas import ConversationCreate, ConversationRead


router = APIRouter(prefix="/projects", tags=["conversations"])


@router.get("/{project_id}/conversations", response_model=List[ConversationRead])
def list_conversations(project_id: int, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.project_id == project_id)
        .order_by(models.Conversation.updated_at.desc())
        .all()
    )


@router.post("/{project_id}/conversations", response_model=ConversationRead)
def create_conversation(project_id: int, payload: ConversationCreate, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    conv = models.Conversation(project_id=project_id, title=payload.title or "New Conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}


