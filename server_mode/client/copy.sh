#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
	echo "Error: node_modules not found. Please run ./setup.sh first."
	exit 1
fi

if [ ! -f ".env" ]; then
	echo "Error: .env not found. Please setup first."
	exit 1
fi

node post.js "$@"
echo "Copied."
