#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

rm -f "$SCRIPT_DIR/.watch.pid"
rm -f "$SCRIPT_DIR/.clipboard"
rm -f "$SCRIPT_DIR/watch.log"

echo "Storage mode files cleared."
