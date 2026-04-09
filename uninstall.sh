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

# Define the path to the symlink
SYMLINK_PATH="/usr/local/bin/tcopy"

# Check if the symlink exists
if [ -L "$SYMLINK_PATH" ] || [ -e "$SYMLINK_PATH" ]; then
  # Remove the symbolic link or launcher file
  echo "Removing tcopy command..."
  sudo rm "$SYMLINK_PATH"
  echo "Uninstallation complete. The 'tcopy' command has been removed."
else
  echo "The 'tcopy' command is not installed, or the symlink does not exist."
fi
