from __future__ import annotations

"""
Convert raw JSONL to normalized markdown records.

Phase 0 stub: pass through content as markdown; keep title and url.
"""

import json
from pathlib import Path

IN_DIR = Path(__file__).resolve().parents[0] / ".data" / "raw"
OUT_DIR = Path(__file__).resolve().parents[0] / ".data" / "clean"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    # Clear previous outputs to be idempotent
    for old in OUT_DIR.glob("*.norm.jsonl"):
        try:
            old.unlink()
        except Exception:
            pass

    for path in sorted(IN_DIR.glob("*.jsonl")):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                normalized = {
                    "url": obj["url"],
                    "title": obj.get("title"),
                    "product": obj.get("product"),
                    "version": obj.get("version"),
                    "content_md": obj.get("content", ""),
                }
                out_path = OUT_DIR / (path.stem + ".norm.jsonl")
                with open(out_path, "a", encoding="utf-8") as out:
                    out.write(json.dumps(normalized) + "\n")
                count += 1
    print(f"Cleaned {count} records into {OUT_DIR}")


if __name__ == "__main__":
    main()


