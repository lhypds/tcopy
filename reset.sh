#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Clear runtime files
bash "$SCRIPT_DIR/clear.sh"

# Delete PM2 process
(cd "$SCRIPT_DIR/server_mode" && pm2 delete ecosystem.config.cjs) || true

# Remove storage_mode virtual environment
rm -rf "$SCRIPT_DIR/storage_mode/.venv"

# Recreate .env files from .env.example
cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
cp "$SCRIPT_DIR/storage_mode/.env.example" "$SCRIPT_DIR/storage_mode/.env"
cp "$SCRIPT_DIR/server_mode/.env.example" "$SCRIPT_DIR/server_mode/.env"

echo "Reset complete."
