#!/bin/bash
#
# Restart the tcopy background process.
#
# On a machine configured as the server, with pm2 installed, this restarts the
# pm2 process defined by ecosystem.config.cjs, re-reading PM2_NAME and PORT from
# server.env. Everywhere else it wraps `tcopy restart`, which restarts the
# built-in daemon — the client, or the storage-mode clipboard watcher.
#
# Usage:
#   ./restart.sh
#
# Nothing is reconfigured; only the background process is stopped and started
# again. Set TCOPY_NO_PM2=1 to act on the built-in daemon on the server too.
# `tcopy info` shows the mode and whether the process is running.

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

# Config lives in a per-user directory rather than the checkout — see config.js.
CONFIG_DIR="${TCOPY_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/tcopy}"

read_env() { # read_env <file> <key>
  [ -f "$1" ] || return 0
  grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

# MODE is checked as well as ENVIRONMENT: server.env keeps its old ENVIRONMENT
# after a switch to storage mode, so ENVIRONMENT alone would restart the relay
# when the watcher was wanted.
MODE="$(read_env "$CONFIG_DIR/tcopy.env" MODE)"
ENVIRONMENT="$(read_env "$CONFIG_DIR/server.env" ENVIRONMENT)"
PM2_NAME="$(read_env "$CONFIG_DIR/server.env" PM2_NAME)"
PORT="$(read_env "$CONFIG_DIR/server.env" PORT)"

if [ "$MODE" = "server" ] && [ "$ENVIRONMENT" = "server" ] &&
   [ -z "${TCOPY_NO_PM2:-}" ] && command -v pm2 >/dev/null 2>&1; then
  # Passing the config file rather than the process name re-evaluates it, so an
  # edited PORT is picked up; --update-env refreshes the environment with it.
  # pm2 starts the app if it was not running.
  pm2 restart ecosystem.config.cjs --update-env
  echo
  echo "==> ${PM2_NAME:-tcopy} restarted under pm2 on port ${PORT:-5460}."
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
