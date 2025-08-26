from __future__ import annotations

from app.db import SessionLocal, init_db
from app import models


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        if not db.query(models.Project).filter_by(name="Demo").first():
            p = models.Project(
                name="Demo",
                system_instructions="You are VisionBI's assistant.",
                defaults_json={"temperature": 0.2, "max_tokens": 800},
            )
            db.add(p)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()


