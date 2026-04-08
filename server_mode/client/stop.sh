#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PIDS="$(pgrep -f "/server_mode/client/client.py" || true)"

if [ -z "$PIDS" ]; then
  echo "No running client process found."
  exit 0
fi

echo "Stopping client process(es): $PIDS"
kill $PIDS

echo "Client stopped."
