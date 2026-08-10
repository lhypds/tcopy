#!/bin/bash
#
# Stop the tcopy background process.
#
# This is a convenience wrapper around `tcopy stop`. Which process is stopped
# depends on your configured mode — the server, the client, or the storage-mode
# clipboard watcher.
#
# Usage:
#   ./stop.sh
#
# Stopping a process that is not running is not an error. `tcopy info` shows
# the mode and whether the process is running.

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

# Prefer the installed command, so the process stopped is the one the commands
# started. Fall back to this checkout when tcopy is not on PATH yet — the pid
# files live in the shared config directory either way.
if command -v tcopy >/dev/null 2>&1; then
  exec tcopy stop
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Error: dependencies are not installed. Run ./install.sh first." >&2
  exit 1
fi

echo "Note: tcopy is not on your PATH; using this checkout."
echo "      Run ./install.sh to install the commands."
echo
exec node "$SCRIPT_DIR/bin/tcopy.js" stop
