#!/bin/bash
#
# Configure tcopy — choose the mode and fill in its settings.
#
# This is a convenience wrapper around `tcopy setup`. Run it after
# ./install.sh, or any time you want to reconfigure.
#
# Usage:
#   ./setup.sh
#
# Settings are written to your config directory, not to this checkout —
# `tcopy info` prints the resolved paths.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-}" in
  -h|--help)
    awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
    exit 0
    ;;
  '') ;;
  *)
    echo "Error: unknown argument: $1 (use --help)" >&2
    exit 1
    ;;
esac

# Prefer the installed command, so `tcopy setup` behaves exactly as it will
# later. Fall back to this checkout when tcopy is not on PATH yet — that way
# setup works even before ./install.sh has been run.
if command -v tcopy >/dev/null 2>&1; then
  exec tcopy setup
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Error: dependencies are not installed. Run ./install.sh first." >&2
  exit 1
fi

echo "Note: tcopy is not on your PATH; using this checkout."
echo "      Run ./install.sh to install the commands."
echo
exec node "$SCRIPT_DIR/bin/tcopy.js" setup
