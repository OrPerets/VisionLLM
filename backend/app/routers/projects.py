from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..db import get_db, init_db as _init_db
from ..auth import ensure_project_member, require_admin
from .. import models
from ..schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectRead,
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectMemberUpdate,
    SearchResponse,
)
from ..activity import record_activity


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectRead])
def list_projects(request: Request, db: Session = Depends(get_db)):
    # If auth disabled, return all
    from ..config import settings
    if not settings.enable_auth:
        return db.query(models.Project).order_by(models.Project.created_at.desc()).all()
    # With auth, list projects where user is a member or admin
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(models.User).get(int(user_id))
    if user.role == "admin":
        return db.query(models.Project).order_by(models.Project.created_at.desc()).all()
    return (
        db.query(models.Project)
        .join(models.ProjectMember, models.Project.id == models.ProjectMember.project_id)
        .filter(models.ProjectMember.user_id == user.id)
        .order_by(models.Project.created_at.desc())
        .all()
    )


@router.post("", response_model=ProjectRead)
def create_project(payload: ProjectCreate, request: Request, db: Session = Depends(get_db)):
    # Ensure schema exists (useful in tests where startup hooks may be skipped)
    try:
        _init_db()
    except Exception:
        pass
    # Allow project creation in tests/no-auth; admins can manage via UI when auth is enabled.
    if db.query(models.Project).filter(models.Project.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Project with this name already exists")
    proj = models.Project(
        name=payload.name,
        system_instructions=payload.system_instructions,
        defaults_json=payload.defaults,
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    # Log activity
    try:
        actor_id = request.session.get("user_id")
        record_activity(db, actor_id=actor_id, action="project.create", object_type="project", object_id=proj.id, project_id=proj.id)
    except Exception:
        pass
    return proj


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, request: Request, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    ensure_project_member(project_id, request, db)
    return proj


@router.patch("/{project_id}", response_model=ProjectRead, dependencies=[Depends(require_admin)])
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.name is not None:
        proj.name = payload.name
    if payload.system_instructions is not None:
        proj.system_instructions = payload.system_instructions
    if payload.defaults is not None:
        proj.defaults_json = payload.defaults
    db.add(proj)
    db.commit()
    db.refresh(proj)
    try:
        record_activity(db, actor_id=None, action="project.update", object_type="project", object_id=proj.id, project_id=proj.id)
    except Exception:
        pass
    return proj


@router.delete("/{project_id}", dependencies=[Depends(require_admin)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(proj)
    db.commit()
    try:
        record_activity(db, actor_id=None, action="project.delete", object_type="project", object_id=project_id, project_id=project_id)
    except Exception:
        pass
    return {"ok": True}


@router.get("/{project_id}/members", response_model=List[ProjectMemberRead])
def list_members(project_id: int, request: Request, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_project_member(project_id, request, db)
    return (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id)
        .order_by(models.ProjectMember.created_at.asc())
        .all()
    )


@router.post("/{project_id}/members", response_model=ProjectMemberRead, dependencies=[Depends(require_admin)])
def add_member(project_id: int, payload: ProjectMemberCreate, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        user = models.User(email=payload.email)
        db.add(user)
        db.commit()
        db.refresh(user)
    if (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id, models.ProjectMember.user_id == user.id)
        .first()
    ):
        raise HTTPException(status_code=400, detail="User already a member")
    member = models.ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role_in_project=payload.role_in_project or "worker",
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    try:
        record_activity(db, actor_id=None, action="project_member.add", object_type="project_member", object_id=member.id, project_id=project_id)
    except Exception:
        pass
    return member


@router.delete("/{project_id}/members/{user_id}", dependencies=[Depends(require_admin)])
def remove_member(project_id: int, user_id: int, db: Session = Depends(get_db)):
    member = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id, models.ProjectMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(member)
    db.commit()
    try:
        record_activity(db, actor_id=None, action="project_member.remove", object_type="project_member", object_id=member.id, project_id=project_id)
    except Exception:
        pass
    return {"ok": True}


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectMemberRead, dependencies=[Depends(require_admin)])
def update_member_role(project_id: int, user_id: int, payload: ProjectMemberUpdate, db: Session = Depends(get_db)):
    member = (
        db.query(models.ProjectMember)
        .filter(models.ProjectMember.project_id == project_id, models.ProjectMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membership not found")
    member.role_in_project = payload.role_in_project
    db.add(member)
    db.commit()
    db.refresh(member)
    try:
        record_activity(db, actor_id=None, action="project_member.update", object_type="project_member", object_id=member.id, project_id=project_id)
    except Exception:
        pass
    return member


@router.get("/search", response_model=SearchResponse)
def search_everything(request: Request, db: Session = Depends(get_db), q: Optional[str] = None, limit: int = 20):
    term = (q or "").strip().lower()
    # If no query, return empty lists
    if not term:
        return {"projects": [], "conversations": []}
    # Auth: if user is admin, search all; else only within their projects
    from ..auth import get_optional_user
    user = get_optional_user(request, db)
    projects_q = db.query(models.Project)
    conversations_q = db.query(models.Conversation)
    if user and user.role != "admin":
        member_project_ids = [pm.project_id for pm in db.query(models.ProjectMember).filter(models.ProjectMember.user_id == user.id).all()]
        if not member_project_ids:
            return {"projects": [], "conversations": []}
        projects_q = projects_q.filter(models.Project.id.in_(member_project_ids))
        conversations_q = conversations_q.filter(models.Conversation.project_id.in_(member_project_ids))

    projects_q = projects_q.filter(func.lower(models.Project.name).like(f"%{term}%")).order_by(models.Project.created_at.desc()).limit(limit)
    conversations_q = (
        conversations_q.outerjoin(models.Message, models.Message.conversation_id == models.Conversation.id)
        .filter(
            or_(
                func.lower(models.Conversation.title).like(f"%{term}%"),
                func.lower(models.Message.content).like(f"%{term}%"),
            )
        )
        .distinct(models.Conversation.id)
        .order_by(models.Conversation.updated_at.desc())
        .limit(limit)
    )
    return {"projects": projects_q.all(), "conversations": conversations_q.all()}


