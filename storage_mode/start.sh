#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "watch.py" ]; then
	echo "Error: watch.py not found in $SCRIPT_DIR"
	exit 1
fi

if [ ! -d ".venv" ]; then
	echo "Error: .venv not found. Please run ./setup.sh first."
	exit 1
fi

if [ ! -f ".env" ]; then
	echo "Error: .env not found. Create it from .env.example and setup."
	exit 1
fi

STORAGE_PATH="$(grep -E '^STORAGE_PATH=' .env | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//")"
if [ -z "${STORAGE_PATH:-}" ]; then
	echo "Error: STORAGE_PATH is not set in .env"
	exit 1
fi

CLIPBOARD_FILE="$(grep -E '^CLIPBOARD_FILE=' .env | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//")"
if [ -z "${CLIPBOARD_FILE:-}" ]; then
	echo "Error: CLIPBOARD_FILE is not set in .env"
	exit 1
fi

exec .venv/bin/python watch.py
