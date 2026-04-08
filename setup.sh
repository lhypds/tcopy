#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
target_dir="${1:-}"

if [ -z "$target_dir" ]; then
  echo "Error: setup target directory is required."
  exit 1
fi

if [ ! -d "$target_dir" ]; then
  echo "Error: target directory not found: $target_dir"
  exit 1
fi

if [ ! -f "$target_dir/setup.sh" ]; then
  echo "Error: setup.sh not found in $target_dir"
  exit 1
fi

(
  cd "$target_dir"
  bash ./setup.sh
)

echo "Setup complete"
