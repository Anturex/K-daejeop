#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="$ROOT_DIR/.venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then
  echo "[error] .venv not found. Run: python3 -m venv .venv" >&2
  exit 1
fi

cd "$ROOT_DIR"
export APP_ENV="${APP_ENV:-development}"
exec "$PYTHON" -m uvicorn app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-5173}"
