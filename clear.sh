#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

bash "$SCRIPT_DIR/storage_mode/clear.sh"
bash "$SCRIPT_DIR/server_mode/clear.sh"
