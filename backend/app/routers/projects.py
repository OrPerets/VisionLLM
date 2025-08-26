from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..schemas import ProjectCreate, ProjectUpdate, ProjectRead


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


@router.post("", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
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
    return proj


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    return proj


@router.patch("/{project_id}", response_model=ProjectRead)
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
    return proj


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(models.Project).get(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(proj)
    db.commit()
    return {"ok": True}


