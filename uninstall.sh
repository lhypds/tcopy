#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
SERVER_DIR="$SCRIPT_DIR/server_mode/server"

read_env_value() {
  local key="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//"
}

remove_pm2_process_if_server_mode() {
  local mode
  mode="$(read_env_value "MODE" "$ENV_FILE")"

  if [ "$mode" != "server" ]; then
    return 0
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    echo "MODE=server detected, but pm2 is not installed. Skipping pm2 process removal."
    return 0
  fi

  if [ ! -f "$SERVER_DIR/ecosystem.config.js" ]; then
    echo "MODE=server detected, but ecosystem.config.js was not found. Skipping pm2 process removal."
    return 0
  fi

  echo "Removing pm2 process for server mode..."
  (
    cd "$SERVER_DIR"
    pm2 delete ecosystem.config.js >/dev/null 2>&1 || true
  )
}

# Define the path to the symlink
SYMLINK_PATH="/usr/local/bin/tcopy"

remove_pm2_process_if_server_mode

# Check if the symlink exists
if [ -L "$SYMLINK_PATH" ] || [ -e "$SYMLINK_PATH" ]; then
  # Remove the symbolic link or launcher file
  echo "Removing tcopy command..."
  sudo rm "$SYMLINK_PATH"
  echo "Uninstallation complete. The 'tcopy' command has been removed."
else
  echo "The 'tcopy' command is not installed, or the symlink does not exist."
fi
