from __future__ import annotations

"""
Chunk normalized markdown by headings and size.

Phase 0 stub: single chunk per document with trivial h_path.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime, UTC

IN_DIR = Path(__file__).resolve().parents[0] / ".data" / "clean"
OUT_DIR = Path(__file__).resolve().parents[0] / ".data" / "chunks"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    # Clear previous outputs to be idempotent
    for old in OUT_DIR.glob("*.chunks.jsonl"):
        try:
            old.unlink()
        except Exception:
            pass

    for path in sorted(IN_DIR.glob("*.norm.jsonl")):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                chunk = {
                    "id": str(uuid.uuid4()),
                    "url": obj["url"],
                    "title": obj.get("title"),
                    "product": obj.get("product"),
                    "doc_type": None,
                    "version": obj.get("version"),
                    "updated_at": datetime.now(UTC).isoformat(),
                    "h_path": "H1:",
                    "breadcrumbs": [],
                    "content_md": obj.get("content_md", ""),
                    "codeblocks": [],
                }
                out_path = OUT_DIR / (path.stem.replace(".norm", "") + ".chunks.jsonl")
                with open(out_path, "a", encoding="utf-8") as out:
                    out.write(json.dumps(chunk) + "\n")
                count += 1
    print(f"Chunked {count} chunks into {OUT_DIR}")


if __name__ == "__main__":
    main()


