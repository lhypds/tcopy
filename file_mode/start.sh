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
	if [ -f ".env.example" ]; then
		echo "Error: .env not found. Create it from .env.example and set CLIPBOARD_FILE_PATH."
	else
		echo "Error: .env not found. Please create it and set CLIPBOARD_FILE_PATH."
	fi
	exit 1
fi

CLIPBOARD_FILE_PATH="$(grep -E '^CLIPBOARD_FILE_PATH=' .env | tail -n 1 | cut -d '=' -f2- | sed 's/^"//; s/"$//' | sed "s/^'//; s/'$//")"
if [ -z "${CLIPBOARD_FILE_PATH:-}" ]; then
	echo "Error: CLIPBOARD_FILE_PATH is not set in .env"
	exit 1
fi

exec .venv/bin/python watch.py
