from __future__ import annotations

"""
Create embeddings for chunks.

Phase 0 stub: write zero-vector embeddings to allow pgvector schema validation.
Replace with real model calls later.
"""

import json
from pathlib import Path

EMBED_DIM = 1024
IN_DIR = Path(__file__).resolve().parents[0] / ".data" / "chunks"
OUT_DIR = Path(__file__).resolve().parents[0] / ".data" / "embedded"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    # Clear previous outputs to be idempotent
    for old in OUT_DIR.glob("*.embedded.jsonl"):
        try:
            old.unlink()
        except Exception:
            pass

    for path in sorted(IN_DIR.glob("*.chunks.jsonl")):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                chunk = json.loads(line)
                record = {
                    **chunk,
                    "embedding": [0.0] * EMBED_DIM,
                }
                out_path = OUT_DIR / (path.stem.replace(".chunks", "") + ".embedded.jsonl")
                with open(out_path, "a", encoding="utf-8") as out:
                    out.write(json.dumps(record) + "\n")
                count += 1
    print(f"Embedded {count} chunks into {OUT_DIR}")


if __name__ == "__main__":
    main()


