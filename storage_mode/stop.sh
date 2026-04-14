#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="$SCRIPT_DIR/.watch.pid"

if [ ! -f "$PID_FILE" ]; then
	echo "No running watch process found."
	exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
	echo "No running watch process found (stale PID file)."
	rm -f "$PID_FILE"
	exit 0
fi

echo "Stopping watch process (PID $PID)..."
kill "$PID"
rm -f "$PID_FILE"
echo "Watch process stopped."
