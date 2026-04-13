#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./stop.sh
sleep 1

echo "Starting watcher..."
nohup ./start.sh > watch.log 2>&1 &
echo "Watcher started. Logs: $SCRIPT_DIR/watch.log"
