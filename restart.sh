#!/bin/bash
#
# Update tcopy, then restart the background process.
#
# The checkout is fast-forwarded and its dependencies are refreshed first. In
# server mode, with pm2 installed, this then restarts the pm2 process defined by
# ecosystem.config.cjs — the relay on the server, the clipboard client on a
# client — re-reading PM2_NAME, ENVIRONMENT and PORT from server.env. Otherwise
# it wraps `tcopy restart`, which restarts the built-in daemon.
#
# Usage:
#   ./restart.sh
#
# Nothing is reconfigured. Set TCOPY_NO_PM2=1 to act on the built-in daemon in
# server mode too. `tcopy info` shows the mode and process status.

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

echo "==> Updating tcopy"
git pull --ff-only

echo
echo "==> Updating dependencies"
npm install

echo
echo "==> Restarting tcopy"

# Config lives in a per-user directory rather than the checkout — see config.js.
CONFIG_DIR="${TCOPY_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/tcopy}"

read_env() { # read_env <file> <key>
  [ -f "$1" ] || return 0
  grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

MODE="$(read_env "$CONFIG_DIR/tcopy.env" MODE)"
ENVIRONMENT="$(read_env "$CONFIG_DIR/server.env" ENVIRONMENT)"
PM2_NAME="$(read_env "$CONFIG_DIR/server.env" PM2_NAME)"
PORT="$(read_env "$CONFIG_DIR/server.env" PORT)"

# MODE is checked as well as ENVIRONMENT: server.env keeps its old ENVIRONMENT
# after a switch to storage mode, so ENVIRONMENT alone would restart a
# server-mode process when the watcher was wanted.
use_pm2=false
if [ "$MODE" = "server" ] && [ -z "${TCOPY_NO_PM2:-}" ] && command -v pm2 >/dev/null 2>&1; then
  case "$ENVIRONMENT" in server|client) use_pm2=true ;; esac
fi

if [ "$use_pm2" = true ]; then
  # Passing the config file rather than the process name re-evaluates it, so an
  # edited PORT or ENVIRONMENT is picked up; --update-env refreshes the
  # environment with it. pm2 starts the app if it was not running.
  pm2 restart ecosystem.config.cjs --update-env
  echo
  echo "==> ${PM2_NAME:-tcopy} restarted under pm2 ($ENVIRONMENT, port ${PORT:-5460})."
  echo "    Logs: pm2 logs ${PM2_NAME:-tcopy}"
  exit 0
fi

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
