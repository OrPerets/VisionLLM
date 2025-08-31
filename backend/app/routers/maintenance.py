from __future__ import annotations

import os
import re
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import require_admin


class MaintenanceMessage(BaseModel):
    role: str
    content: str


class PlanRequest(BaseModel):
    transcript: List[MaintenanceMessage]


class PlanResponse(BaseModel):
    link: str


router = APIRouter(prefix="/maintenance", tags=["maintenance"], dependencies=[Depends(require_admin)])


@router.post("/plan", response_model=PlanResponse)
async def generate_plan(payload: PlanRequest) -> PlanResponse:
    if not payload.transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    first_user_msg = next((m.content for m in payload.transcript if m.role == "user"), "plan")
    slug_base = first_user_msg[:50].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug_base).strip("-") or "plan"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}-{slug}.md"

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    tasks_dir = os.path.join(repo_root, "tasks")
    os.makedirs(tasks_dir, exist_ok=True)
    file_path = os.path.join(tasks_dir, filename)

    user_messages = [m.content for m in payload.transcript if m.role == "user"]
    summary = user_messages[0] if user_messages else "Generated plan"

    plan_md = (
        "# Maintenance Plan\n\n"
        f"## Summary\n{summary}\n\n"
        "## User Stories\n" + "\n".join(f"- {m}" for m in user_messages) + "\n\n"
        "## Implementation Steps\n- TBD\n\n"
        "## Test Plan\n- TBD\n"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(plan_md)

    return PlanResponse(link=f"/tasks/{filename}")
