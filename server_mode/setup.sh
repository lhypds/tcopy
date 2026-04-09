#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE_FILE="$SCRIPT_DIR/.env.example"
PACKAGE_JSON_FILE="$SCRIPT_DIR/package.json"

cd "$SCRIPT_DIR"

read_env_value() {
  local key="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 | cut -d'=' -f2- | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

set_env_value() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -q -E "^[[:space:]]*${key}=" "$file"; then
    sed -i.bak "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

if [ ! -f "$PACKAGE_JSON_FILE" ]; then
  echo "Error: package.json not found in current directory."
  exit 1
fi

if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE_FILE" ]; then
  echo "Creating .env from .env.example..."
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
fi

if [ -f "$ENV_FILE" ]; then
  # Setup ENVIRONMENT
  current_environment="$(read_env_value "ENVIRONMENT" "$ENV_FILE")"
  if [ -n "$current_environment" ]; then
    read -rp "Enter ENVIRONMENT ([s]erver/[c]lient, current: $current_environment): " input_environment
  else
    read -rp "Enter ENVIRONMENT ([s]erver/[c]lient): " input_environment
  fi

  if [ -z "$input_environment" ]; then
    if [ -n "$current_environment" ]; then
      input_environment="$current_environment"
    else
      echo "Error: ENVIRONMENT cannot be empty."
      exit 1
    fi
  fi

  case "$input_environment" in
    s|S|server|SERVER)
      input_environment="server"
      ;;
    c|C|client|CLIENT)
      input_environment="client"
      ;;
  esac

  if [ "$input_environment" != "server" ] && [ "$input_environment" != "client" ]; then
    echo "Error: ENVIRONMENT must be either 'server' or 'client'."
    exit 1
  fi

  set_env_value "ENVIRONMENT" "$input_environment" "$ENV_FILE"
  echo "ENVIRONMENT set to: $input_environment"
  current_environment="$input_environment"

  # Setup SERVER_BASE_URL for client
  if [ "$current_environment" = "client" ]; then
    current_url="$(read_env_value "SERVER_BASE_URL" "$ENV_FILE")"
    if [ -z "$current_url" ]; then
      read -rp "Enter SERVER_BASE_URL (e.g., http://localhost:5460): " input_url
      if [ -z "$input_url" ]; then
        echo "Error: SERVER_BASE_URL cannot be empty."
        exit 1
      fi
      set_env_value "SERVER_BASE_URL" "$input_url" "$ENV_FILE"
      echo "SERVER_BASE_URL set to: $input_url"
    fi
  fi
fi

echo "Installing npm packages from package.json..."
npm install

echo "Setup completed."
