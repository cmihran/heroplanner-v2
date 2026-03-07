#!/usr/bin/env bash
# Smoke test: starts the app, waits for [READY] or [FRONTEND ERROR], then exits.
# Exit code 0 = app started successfully, 1 = error.

set -euo pipefail

TIMEOUT=${1:-60}
PIPE=$(mktemp -u)
mkfifo "$PIPE"

cleanup() {
  [ -n "${DEV_PID:-}" ] && kill -- -"$DEV_PID" 2>/dev/null
  rm -f "$PIPE"
}
trap cleanup EXIT

# Start make dev in its own process group so we can kill the whole tree
setsid make dev >"$PIPE" 2>&1 &
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
