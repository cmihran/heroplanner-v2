#!/bin/bash
# Sync project to Windows filesystem for native Tauri dev/testing.
# Usage: ./scripts/sync-to-windows.sh [DEST]
# Default destination: /mnt/c/dev/heroplanner-v2

set -e

DEST="${1:-/mnt/c/dev/heroplanner-v2}"

echo "Syncing to $DEST ..."

mkdir -p "$DEST"

rsync -av --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'src-tauri/target' \
  --exclude '.git' \
  --exclude 'notes' \
  --exclude 'raw_data_*.zip' \
  /home/charl/dev/heroplanner-v2/ "$DEST/"

echo ""
echo "Sync complete."
echo ""
echo "On Windows (PowerShell), run:"
echo "  cd C:\\dev\\heroplanner-v2"
echo "  npm install"
echo "  npm run dev"
echo ""
echo "First time only: also copy the database:"
echo "  copy \\\\wsl\$\\Ubuntu\\home\\charl\\dev\\heroplanner-v2\\src-tauri\\heroplanner.db C:\\dev\\heroplanner-v2\\src-tauri\\"
