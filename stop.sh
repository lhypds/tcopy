#!/bin/bash
#
# Stop the tcopy background process.
#
# In server mode, with pm2 installed, this stops the pm2 process defined by
# ecosystem.config.cjs — the relay on the server, the clipboard client on a
# client. Otherwise it wraps `tcopy stop`, which stops the built-in daemon.
#
# Usage:
#   ./stop.sh                  # stop the process
#   ./stop.sh --delete         # pm2 only: also remove it from the pm2 list
#
# Stopping something that is not running is not an error.
# Set TCOPY_NO_PM2=1 to act on the built-in daemon in server mode too.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

delete=false

case "${1:-}" in
  -h|--help)
    awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
    exit 0
    ;;
  --delete) delete=true ;;
  '') ;;
  *)
    echo "Error: unknown argument: $1 (use --help)" >&2
    exit 1
    ;;
esac

# Config lives in a per-user directory rather than the checkout — see config.js.
CONFIG_DIR="${TCOPY_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/tcopy}"

read_env() { # read_env <file> <key>
  [ -f "$1" ] || return 0
  grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

MODE="$(read_env "$CONFIG_DIR/tcopy.env" MODE)"
ENVIRONMENT="$(read_env "$CONFIG_DIR/server.env" ENVIRONMENT)"
PM2_NAME="$(read_env "$CONFIG_DIR/server.env" PM2_NAME)"
PM2_NAME="${PM2_NAME:-tcopy}"

# MODE is checked as well as ENVIRONMENT: server.env keeps its old ENVIRONMENT
# after a switch to storage mode, so ENVIRONMENT alone would look for a
# server-mode process when the watcher was wanted.
use_pm2=false
if [ "$MODE" = "server" ] && [ -z "${TCOPY_NO_PM2:-}" ] && command -v pm2 >/dev/null 2>&1; then
  case "$ENVIRONMENT" in server|client) use_pm2=true ;; esac
fi

if [ "$use_pm2" = true ]; then
  # Checked first so that stopping an already-stopped process is not an error,
  # which is how `tcopy stop` behaves; pm2 itself exits non-zero for it.
  if ! pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    echo "==> $PM2_NAME is not in the pm2 list; nothing to stop."
    exit 0
  fi
  if [ "$delete" = true ]; then
    pm2 delete ecosystem.config.cjs
    echo "==> $PM2_NAME stopped and removed from pm2."
  else
    pm2 stop ecosystem.config.cjs
    echo "==> $PM2_NAME stopped (still listed; ./start.sh resumes it)."
  fi
  exit 0
fi

if [ "$delete" = true ]; then
  echo "Error: --delete only applies when the process runs under pm2." >&2
  exit 1
fi

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
