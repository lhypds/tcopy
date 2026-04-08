#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PIDS="$(pgrep -f "/file_mode/watch.py" || true)"

if [ -z "$PIDS" ]; then
	echo "No running watch process found."
	exit 0
fi

echo "Stopping watch process(es): $PIDS"
kill $PIDS

echo "Watch process stopped."
