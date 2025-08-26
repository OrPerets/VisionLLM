# VisionBI Internal AI App — GGUF Desktop Scaffold (PySide6 + llama.cpp)

This is a **ready-to-run** desktop scaffold that bundles a local LLM (GGUF) using `llama-cpp-python` and provides:
- Chat tab with a VisionBI-tuned system prompt
- SQL Tools: **Transpile** (via `sqlglot`) and **Lint & Fix** (via `sqlfluff`)
- Optional bootstrap to download the GGUF on first run

## Quickstart (macOS Apple Silicon)
```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip wheel
CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python==0.2.90
pip install -r requirements.txt
python app.py
```

## Quickstart (Windows)
```bat
python -m venv .venv && .venv\Scripts\activate
python -m pip install --upgrade pip wheel
set CMAKE_ARGS=-DLLAMA_CUBLAS=on
set FORCE_CMAKE=1
pip install llama-cpp-python==0.2.90
pip install -r requirements.txt
python app.py
```

> If you do not have GPU acceleration, omit the Metal/CUBLAS flags (CPU will still work, just slower).

## Two packaging modes
- **Mode A (Monolith/Offline)**: put your `model.gguf` under `Resources/model.gguf` before packaging. The app ships fully offline.
- **Mode B (Bootstrap)**: do not embed a model. On first run, the app downloads a GGUF from an internal URL defined in `bootstrap.py` and verifies SHA256.

## Packaging (PyInstaller)
macOS:
```bash
pyinstaller --noconfirm --windowed       --name "VisionBI-AI"       --add-data "Resources/model.gguf:Resources"       app.py
```
Windows:
```bat
pyinstaller --noconfirm --windowed ^
  --name VisionBI-AI ^
  --add-data "Resources\model.gguf;Resources" ^
  app.py
```

## Notes
- Place a GGUF file at `Resources/model.gguf` (Mode A), or configure `bootstrap.py` for Mode B.
- Check the model's license allows redistribution.
- Configure `sqlfluff` rules if you have internal SQL conventions.
