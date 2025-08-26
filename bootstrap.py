"""
Optional first-run model bootstrap:
Downloads GGUF from an internal URL if missing and verifies SHA256.
"""
from pathlib import Path
import hashlib, shutil, urllib.request, json

APP_DIR = Path.home() / ".visionbi-ai" / "models"
MODEL_PATH = APP_DIR / "model.gguf"
MANIFEST_URL = "https://intra.vision.bi/models/visionbi-model.json"  # TODO: change to your internal URL

def sha256sum(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def ensure_model() -> str:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists():
        return str(MODEL_PATH)

    with urllib.request.urlopen(MANIFEST_URL) as r:
        m = json.load(r)
    url = m["url"]; expected = m["sha256"]

    tmp = MODEL_PATH.with_suffix(".part")
    with urllib.request.urlopen(url) as r, tmp.open("wb") as f:
        shutil.copyfileobj(r, f)

    actual = sha256sum(tmp)
    if actual.lower() != expected.lower():
        tmp.unlink(missing_ok=True)
        raise RuntimeError("Model checksum mismatch")

    tmp.rename(MODEL_PATH)
    return str(MODEL_PATH)

if __name__ == "__main__":
    print(ensure_model())
