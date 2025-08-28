from __future__ import annotations

from typing import List, Optional, Dict, Any
import subprocess
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..db import get_db
from ..auth import require_admin
from .. import models
from ..schemas import UserRead, UserRoleUpdate


class MaintenanceRequest(BaseModel):
    scope: str  # "chat" | "all" | "demo"


class MaintenanceResponse(BaseModel):
    ok: bool
    counts: Optional[Dict[str, int]] = None


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserRead], dependencies=[Depends(require_admin)])
def list_users(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.User)
    if q:
        term = f"%{q.lower()}%"
        # Simple case-insensitive search on email or name
        from sqlalchemy import func, or_

        query = query.filter(
            or_(
                func.lower(models.User.email).like(term),
                func.lower(models.User.name).like(term),
            )
        )
    return query.order_by(models.User.created_at.desc()).limit(100).all()


@router.patch("/users/{user_id}/role", response_model=UserRead, dependencies=[Depends(require_admin)])
def update_user_role(user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/maintenance/cleanup", response_model=MaintenanceResponse, dependencies=[Depends(require_admin)])
def admin_cleanup_db(payload: MaintenanceRequest, db: Session = Depends(get_db)):
    """Admin-only maintenance endpoint to clean DB tables."""
    scope = payload.scope
    
    if scope not in ["chat", "all", "demo"]:
        raise HTTPException(status_code=400, detail="Invalid scope. Must be 'chat', 'all', or 'demo'")
    
    counts = {}
    
    try:
        # Start transaction
        db.begin()
        
        if scope in ["chat", "all", "demo"]:
            # Delete in dependency-safe order: activity_logs, messages, conversations
            activity_count = db.query(models.ActivityLog).count()
            db.query(models.ActivityLog).delete()
            counts["activity_logs"] = activity_count
            
            message_count = db.query(models.Message).count()
            db.query(models.Message).delete()
            counts["messages"] = message_count
            
            conversation_count = db.query(models.Conversation).count()
            db.query(models.Conversation).delete()
            counts["conversations"] = conversation_count
        
        if scope in ["all", "demo"]:
            # Also delete project_members and projects, but keep users
            member_count = db.query(models.ProjectMember).count()
            db.query(models.ProjectMember).delete()
            counts["project_members"] = member_count
            
            project_count = db.query(models.Project).count()
            db.query(models.Project).delete()
            counts["projects"] = project_count
        
        # Commit the deletions
        db.commit()
        
        # For demo scope, try to reseed if seed script exists
        if scope == "demo":
            try:
                # Look for seed script in the expected location
                repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
                seed_script = os.path.join(repo_root, "backend", "scripts", "seed.py")
                
                if os.path.exists(seed_script):
                    # Run the seed script
                    result = subprocess.run(
                        ["python", seed_script],
                        cwd=repo_root,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        counts["demo_seeded"] = 1
                    else:
                        counts["demo_seed_failed"] = 1
                else:
                    counts["demo_seed_not_found"] = 1
            except Exception:
                counts["demo_seed_error"] = 1
        
        return MaintenanceResponse(ok=True, counts=counts)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


