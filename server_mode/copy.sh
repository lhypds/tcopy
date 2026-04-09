#!/bin/bash

set -euo pipefail

if [ ! -d "node_modules" ]; then
	echo "Error: node_modules not found. Please run ./setup.sh first."
	exit 1
fi

if [ ! -f ".env" ]; then
	echo "Error: .env not found. Please setup first."
	exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "Error: .env not found. Please run ./setup.sh first."
  exit 1
fi

ENVIRONMENT="$(grep -E '^ENVIRONMENT=' .env | cut -d '=' -f2- | tr -d '[:space:]')"

if [ -z "$ENVIRONMENT" ]; then
  echo "Error: ENVIRONMENT is not set in .env. Please run ./setup.sh first."
  exit 1
fi

case "$ENVIRONMENT" in
  client)
    exec "$SCRIPT_DIR/client/copy.sh" "$@"
    ;;
  server)
    exec "$SCRIPT_DIR/server/copy.sh" "$@"
    ;;
  *)
    echo "Error: Unknown ENVIRONMENT '$ENVIRONMENT'. Expected 'server' or 'client'."
    exit 1
    ;;
esac
