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

node "$SCRIPT_DIR/client/paste.js" "$@"
