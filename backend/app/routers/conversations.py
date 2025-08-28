from __future__ import annotations

from typing import List, Optional
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..db import get_db
from ..auth import ensure_project_member, require_admin
from .. import models
from ..schemas import ConversationCreate, ConversationRead, ConversationUpdate
from ..activity import record_activity


router = APIRouter(prefix="/projects", tags=["conversations"])


@router.get("/{project_id}/conversations", response_model=List[ConversationRead])
def list_conversations(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    q: Optional[str] = None,
):
    if not db.query(models.Project).get(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_project_member(project_id, request, db)
    base_q = (
        db.query(models.Conversation)
        .filter(models.Conversation.project_id == project_id)
    )

    if q:
        term = f"%{q.lower()}%"
        base_q = (
            base_q.outerjoin(models.Message, models.Message.conversation_id == models.Conversation.id)
            .filter(
                or_(
                    func.lower(models.Conversation.title).like(term),
                    func.lower(models.Message.content).like(term),
                )
            )
            .distinct(models.Conversation.id)
        )

    return base_q.order_by(models.Conversation.updated_at.desc()).all()


@router.post("/{project_id}/conversations", response_model=ConversationRead)
def create_conversation(project_id: int, payload: ConversationCreate, request: Request, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_project_member(project_id, request, db)
    conv = models.Conversation(project_id=project_id, title=payload.title or "New Conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    # Log activity
    try:
        actor_id = request.session.get("user_id")
        record_activity(db, actor_id=actor_id, action="conversation.create", object_type="conversation", object_id=conv.id, project_id=project_id)
    except Exception:
        pass
    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
def get_conversation(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    # Enforce membership when auth is enabled
    ensure_project_member(conv.project_id, request, db)
    return conv


@router.patch("/conversations/{conversation_id}", response_model=ConversationRead)
def update_conversation(conversation_id: int, payload: ConversationUpdate, request: Request, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    # Enforce membership when auth is enabled
    ensure_project_member(conv.project_id, request, db)

    updated = False
    if payload.title is not None:
        new_title = (payload.title or "").strip() or "New Conversation"
        if new_title != conv.title:
            conv.title = new_title
            updated = True

    if updated:
        db.add(conv)
        db.commit()
        db.refresh(conv)
        # Log activity
        try:
            actor_id = request.session.get("user_id")
            record_activity(db, actor_id=actor_id, action="conversation.update", object_type="conversation", object_id=conv.id, project_id=conv.project_id)
        except Exception:
            pass

    return conv


@router.delete("/conversations/{conversation_id}", dependencies=[Depends(require_admin)])
def delete_conversation(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    project_id = conv.project_id
    db.delete(conv)
    db.commit()
    # Log activity
    try:
        actor_id = request.session.get("user_id")
        record_activity(db, actor_id=actor_id, action="conversation.delete", object_type="conversation", object_id=conversation_id, project_id=project_id)
    except Exception:
        pass
    return {"ok": True}


@router.get("/conversations/{conversation_id}/export.json")
def export_conversation_json(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    ensure_project_member(conv.project_id, request, db)
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    payload = {
        "conversation": {
            "id": conv.id,
            "project_id": conv.project_id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "meta": m.meta_json,
            }
            for m in messages
        ],
    }
    return JSONResponse(content=payload)


@router.get("/conversations/{conversation_id}/export.md")
def export_conversation_markdown(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    conv = db.query(models.Conversation).get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    ensure_project_member(conv.project_id, request, db)
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    lines: List[str] = [f"# {conv.title}"]
    for m in messages:
        ts = m.created_at.isoformat()
        role = m.role.capitalize()
        lines.append("")
        lines.append(f"## {role} — {ts}")
        lines.append("")
        lines.append(m.content)
    text = "\n".join(lines)
    return PlainTextResponse(text, media_type="text/markdown")


