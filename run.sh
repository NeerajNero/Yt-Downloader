#!/usr/bin/env bash
# YT Studio launcher (macOS/Linux). First run sets everything up;
# after that it just starts the server. Usage: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

# --- pick a Python 3.11+ ---------------------------------------------------
PY=""
for candidate in python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
      PY="$candidate"
      break
    fi
  fi
done
if [ -z "$PY" ]; then
  echo "error: Python 3.11+ not found. On macOS: brew install python@3.12" >&2
  exit 1
fi

# --- ffmpeg ----------------------------------------------------------------
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -x /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg ]; then
  echo "error: ffmpeg not found. On macOS: brew install ffmpeg-full" >&2
  echo "       (ffmpeg-full includes libass, needed for burned-in captions)" >&2
  exit 1
fi

# --- Python env ------------------------------------------------------------
if [ ! -x venv/bin/python ]; then
  echo "Creating venv with $PY..."
  "$PY" -m venv venv
fi
if ! venv/bin/python -c 'import fastapi, uvicorn, yt_dlp, faster_whisper' 2>/dev/null; then
  echo "Installing Python dependencies..."
  venv/bin/pip install --no-cache-dir -q -r requirements.txt
fi

# --- UI build --------------------------------------------------------------
if [ ! -f ui/dist/index.html ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "error: Node/npm not found (needed once to build the UI)." >&2
    echo "       On macOS: brew install node" >&2
    exit 1
  fi
  echo "Building the UI (first run only)..."
  (cd ui && npm install --no-fund --no-audit && npm run build)
fi

# --- go --------------------------------------------------------------------
echo "Starting YT Studio at http://127.0.0.1:8765 (Ctrl+C to stop)"
exec venv/bin/python server/main.py
