from __future__ import annotations

"""
Upsert embedded chunks into Postgres (rag_chunks table) and lexical tsvector index.

Phase 0: create table if not exists (requires pgvector extension).
If DATABASE_URL points to SQLite, this script will just print a message.
"""

import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import create_engine

REPO_ROOT = Path(__file__).resolve().parents[1]
EMBED_DIR = REPO_ROOT / "ingestion" / ".data" / "embedded"


def ensure_schema(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(
            text(
                """
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY,
  url TEXT,
  title TEXT,
  product TEXT,
  doc_type TEXT,
  version TEXT,
  updated_at TIMESTAMPTZ,
  h_path TEXT,
  content_md TEXT,
  embedding vector(1024)
);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
  ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rag_chunks_lexical_idx
  ON rag_chunks USING gin (to_tsvector('english', content_md));
                """
            )
        )


def upsert_chunks(engine) -> int:
    inserted = 0
    for path in sorted(EMBED_DIR.glob("*.embedded.jsonl")):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                with engine.begin() as conn:
                    conn.execute(
                        text(
                            """
INSERT INTO rag_chunks (id, url, title, product, doc_type, version, updated_at, h_path, content_md, embedding)
VALUES (:id, :url, :title, :product, :doc_type, :version, :updated_at, :h_path, :content_md, :embedding)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  title = EXCLUDED.title,
  product = EXCLUDED.product,
  doc_type = EXCLUDED.doc_type,
  version = EXCLUDED.version,
  updated_at = EXCLUDED.updated_at,
  h_path = EXCLUDED.h_path,
  content_md = EXCLUDED.content_md,
  embedding = EXCLUDED.embedding
                            """
                        ),
                        {
                            "id": obj["id"],
                            "url": obj.get("url"),
                            "title": obj.get("title"),
                            "product": obj.get("product"),
                            "doc_type": obj.get("doc_type"),
                            "version": obj.get("version"),
                            "updated_at": obj.get("updated_at"),
                            "h_path": obj.get("h_path"),
                            "content_md": obj.get("content_md"),
                            "embedding": obj.get("embedding"),
                        },
                    )
                    inserted += 1
    return inserted


def main() -> None:
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url or db_url.startswith("sqlite"):
        print("Skipping indexing: DATABASE_URL not set to Postgres.")
        return

    engine = create_engine(db_url)
    ensure_schema(engine)
    n = upsert_chunks(engine)
    print(f"Upserted {n} chunks into rag_chunks")


if __name__ == "__main__":
    main()


