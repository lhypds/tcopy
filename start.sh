#!/bin/bash
#
# Start the tcopy background process.
#
# In server mode, with pm2 installed, this starts the process under pm2 via
# ecosystem.config.cjs — the relay on the server, the clipboard client on a
# client — so it survives crashes and, after `pm2 save && pm2 startup`, reboots.
#
# Otherwise it is a convenience wrapper around `tcopy start`, which uses the
# built-in daemon. That covers storage mode's clipboard watcher, and any machine
# without pm2.
#
# Usage:
#   ./start.sh
#
# Set TCOPY_NO_PM2=1 to force the built-in daemon in server mode too.
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

MODE="$(read_env "$CONFIG_DIR/tcopy.env" MODE)"
ENVIRONMENT="$(read_env "$CONFIG_DIR/server.env" ENVIRONMENT)"
PM2_NAME="$(read_env "$CONFIG_DIR/server.env" PM2_NAME)"
PORT="$(read_env "$CONFIG_DIR/server.env" PORT)"

# MODE is checked as well as ENVIRONMENT: server.env keeps its old ENVIRONMENT
# after a switch to storage mode, so ENVIRONMENT alone would start a server-mode
# process when the watcher was wanted.
use_pm2=false
if [ "$MODE" = "server" ] && [ -z "${TCOPY_NO_PM2:-}" ] && command -v pm2 >/dev/null 2>&1; then
  case "$ENVIRONMENT" in server|client) use_pm2=true ;; esac
fi

if [ "$use_pm2" = true ]; then
  # startOrReload is idempotent: it starts the app when it is not running and
  # reloads it in place when it is, so re-running after a `git pull` redeploys.
  pm2 startOrReload ecosystem.config.cjs
  echo
  echo "==> ${PM2_NAME:-tcopy} is running under pm2 ($ENVIRONMENT, port ${PORT:-5460})."
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
