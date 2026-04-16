#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# logs
rm -f client/client.log
rm -f client/peer.log
rm -f server/server.log

# id
rm -f client/id
rm -f server/id

# .clipboard
rm -f server/.clipboard

echo "Server mode files cleared."
