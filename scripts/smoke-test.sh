#!/usr/bin/env bash
# Smoke test: starts the app, waits for [READY] or [FRONTEND ERROR], then exits.
# Exit code 0 = app started successfully, 1 = error.
# Uses port 5174 by default (configurable via SMOKE_PORT) to avoid killing a running make dev.

set -euo pipefail

SMOKE_PORT=${SMOKE_PORT:-5174}
TIMEOUT=${1:-60}
PIPE=$(mktemp -u)
mkfifo "$PIPE"

# Kill anything already on our smoke port (but never touch 5173/dev)
if fuser "$SMOKE_PORT"/tcp >/dev/null 2>&1; then
  echo "Warning: port $SMOKE_PORT in use, killing existing process..."
  fuser -k "$SMOKE_PORT"/tcp >/dev/null 2>&1 || true
  sleep 1
fi

cleanup() {
  [ -n "${DEV_PID:-}" ] && kill -- -"$DEV_PID" 2>/dev/null
  rm -f "$PIPE"
}
trap cleanup EXIT

# Start make dev on the smoke port in its own process group
# VITE_PORT tells Vite to listen on the smoke port
# TAURI_CONFIG overrides devUrl so Tauri connects to the right port
setsid env VITE_PORT="$SMOKE_PORT" \
  TAURI_CONFIG="{\"build\":{\"devUrl\":\"http://localhost:$SMOKE_PORT\"}}" \
  make dev >"$PIPE" 2>&1 &
DEV_PID=$!

RESULT=1
while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == *"[READY]"* ]]; then
    RESULT=0
    break
  fi
  if [[ "$line" == *"[FRONTEND ERROR]"* ]] || [[ "$line" == *"[REACT ERROR]"* ]]; then
    RESULT=1
    break
  fi
done < <(timeout "$TIMEOUT" cat "$PIPE" || true)

if [ $RESULT -eq 0 ]; then
  echo ""
  echo "=== SMOKE TEST PASSED ==="
else
  echo ""
  echo "=== SMOKE TEST FAILED ==="
fi

exit $RESULT
