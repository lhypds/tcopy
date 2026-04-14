#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

PID_FILE="$SCRIPT_DIR/.watch.pid"

# Delete the PID file if it exists but the process is not running


if [ -f "$PID_FILE" ]; then
	OLD_PID=$(cat "$PID_FILE")
	if ! kill -0 "$OLD_PID" 2>/dev/null; then
		echo "Stale PID file found. Removing..."
		rm -f "$PID_FILE"
	fi
fi

if [ -f "$PID_FILE" ]; then
	OLD_PID=$(cat "$PID_FILE")
	if kill -0 "$OLD_PID" 2>/dev/null; then
		echo "watch.py is already running (PID $OLD_PID)."
		exit 0
	fi
	rm -f "$PID_FILE"
fi

.venv/bin/python watch.py &
echo $! > "$PID_FILE"
echo "Started watch.py (PID $(cat $PID_FILE))"
wait
