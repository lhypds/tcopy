#!/bin/bash
#
# Restart the tcopy background process.
#
# This is a convenience wrapper around `tcopy restart`. Which process is
# restarted depends on your configured mode — the server, the client, or the
# storage-mode clipboard watcher.
#
# Usage:
#   ./restart.sh
#
# Nothing is reconfigured; only the background process is stopped and started
# again. `tcopy info` shows the mode and whether the process is running.

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

# Prefer the installed command, so the restart targets the same configuration
# the commands use day to day. Fall back to this checkout when tcopy is not on
# PATH yet — the config directory is shared either way.
if command -v tcopy >/dev/null 2>&1; then
  exec tcopy restart
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Error: dependencies are not installed. Run ./install.sh first." >&2
  exit 1
fi

echo "Note: tcopy is not on your PATH; using this checkout."
echo "      Run ./install.sh to install the commands."
echo
exec node "$SCRIPT_DIR/bin/tcopy.js" restart
