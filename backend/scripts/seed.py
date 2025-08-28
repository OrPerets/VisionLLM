from __future__ import annotations

from app.db import SessionLocal, init_db
from app import models
from app.config import settings


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # Create or get admin user if admin_emails specified
        admin_email = None
        if settings.admin_emails:
            admin_email = settings.admin_emails.split(",")[0].strip()
        admin_user = None
        if admin_email:
            admin_user = db.query(models.User).filter_by(email=admin_email).first()
            if not admin_user:
                admin_user = models.User(email=admin_email, role="admin", name="Admin")
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)

        if not db.query(models.Project).filter_by(name="Demo").first():
            p = models.Project(
                name="Demo",
                system_instructions="You are VisionBI's assistant.",
                defaults_json={"temperature": 0.2, "max_tokens": 800},
            )
            db.add(p)
            db.commit()
            db.refresh(p)

            # Add admin as member if available
            if admin_user:
                member = models.ProjectMember(project_id=p.id, user_id=admin_user.id, role_in_project="admin")
                db.add(member)
                db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()


