#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export APP_ENV="${APP_ENV:-development}"

exec uv run uvicorn app.main:app \
  --host "${HOST:-127.0.0.1}" \
  --port "${PORT:-5173}" \
  --reload
