#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./stop.sh
sleep 1

echo "Starting client..."
nohup ./start.sh > client.log 2>&1 &
echo "Client started. Logs: $SCRIPT_DIR/client.log"
