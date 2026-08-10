#!/bin/bash
#
# Start the tcopy background process.
#
# On a machine configured as the server, with pm2 installed, this starts the
# server under pm2 via ecosystem.config.cjs — so it survives crashes and, after
# `pm2 save && pm2 startup`, reboots.
#
# Everywhere else it is a convenience wrapper around `tcopy start`, which uses
# the built-in daemon. That covers clients and the storage-mode clipboard
# watcher, neither of which pm2 should manage.
#
# Usage:
#   ./start.sh
#
# Set TCOPY_NO_PM2=1 to force the built-in daemon on the server too.
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
# after a switch to storage mode, so ENVIRONMENT alone would start the relay
# when the watcher was wanted.
MODE="$(read_env "$CONFIG_DIR/tcopy.env" MODE)"
ENVIRONMENT="$(read_env "$CONFIG_DIR/server.env" ENVIRONMENT)"
PM2_NAME="$(read_env "$CONFIG_DIR/server.env" PM2_NAME)"
PORT="$(read_env "$CONFIG_DIR/server.env" PORT)"

if [ "$MODE" = "server" ] && [ "$ENVIRONMENT" = "server" ] &&
   [ -z "${TCOPY_NO_PM2:-}" ] && command -v pm2 >/dev/null 2>&1; then
  # startOrReload is idempotent: it starts the app when it is not running and
  # reloads it in place when it is, so re-running after a `git pull` redeploys.
  pm2 startOrReload ecosystem.config.cjs
  echo
  echo "==> ${PM2_NAME:-tcopy} is running under pm2 on port ${PORT:-5460}."
  echo "    Logs:    pm2 logs ${PM2_NAME:-tcopy}"
  echo "    Persist: pm2 save && pm2 startup"
  exit 0
fi

# Prefer the installed command, so the process is started against the same
# configuration the commands use day to day. Fall back to this checkout when
# tcopy is not on PATH yet — the config directory is shared either way.
if command -v tcopy >/dev/null 2>&1; then
  exec tcopy start
fi

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Error: dependencies are not installed. Run ./install.sh first." >&2
  exit 1
fi

echo "Note: tcopy is not on your PATH; using this checkout."
echo "      Run ./install.sh to install the commands."
echo
exec node "$SCRIPT_DIR/bin/tcopy.js" start
