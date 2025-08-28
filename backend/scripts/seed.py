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

        # Seed sample agents if none exist
        if db.query(models.Agent).count() == 0:
            agents = [
                models.Agent(
                    name="Snowflake Analyst",
                    product="snowflake",
                    description="Expert in Snowflake SQL, optimization, and best practices.",
                    categories_json=["sql", "analytics", "warehouse"],
                    tags_json=["snowflake", "sql", "performance"],
                    system_instructions=(
                        "You are a Snowflake expert. Prefer ANSI SQL. Provide concise answers with runnable SQL."
                    ),
                    knowledge_urls_json=[
                        "https://docs.snowflake.com/en/", 
                    ],
                    defaults_json={"model_id": settings.default_model_id, "temperature": 0.2, "max_tokens": 800},
                    is_enabled=1,
                ),
                models.Agent(
                    name="dbt Developer",
                    product="dbt",
                    description="Helps design models, tests, and macros for dbt projects.",
                    categories_json=["data modeling", "testing"],
                    tags_json=["dbt", "jinja", "macro"],
                    system_instructions=(
                        "You are a senior dbt developer. Use dbt conventions, write models and tests with clear rationale."
                    ),
                    knowledge_urls_json=[
                        "https://docs.getdbt.com/",
                    ],
                    defaults_json={"model_id": settings.default_model_id, "temperature": 0.25, "max_tokens": 900},
                    is_enabled=1,
                ),
                models.Agent(
                    name="Tableau Analyst",
                    product="tableau",
                    description="Guides dashboard design and calculations in Tableau.",
                    categories_json=["viz", "analytics"],
                    tags_json=["tableau", "lod", "calculation"],
                    system_instructions=(
                        "You are a Tableau expert. Provide practical tips and LOD examples; explain clearly."
                    ),
                    knowledge_urls_json=[
                        "https://help.tableau.com/current/pro/desktop/en-us/help.htm",
                    ],
                    defaults_json={"model_id": settings.default_model_id, "temperature": 0.3, "max_tokens": 700},
                    is_enabled=1,
                ),
            ]
            for a in agents:
                db.add(a)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()


