#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
	echo "Error: .venv not found. Please setup first."
	exit 1
fi

if [ ! -f ".env" ]; then
	echo "Error: .env not found. Please setup first."
	exit 1
fi

.venv/bin/python post.py "$@"
echo "Copied."
