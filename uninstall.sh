#!/bin/bash
#
# Uninstall tcopy.
#
# Removes the four linked commands — tcopy, tpaste, fcopy, fpaste — from your
# PATH. Your configuration and clipboard data are kept unless you pass --purge.
#
# Usage:
#   ./uninstall.sh           Remove the commands, keep configuration
#   ./uninstall.sh --purge   Also delete the configuration directory
#   ./uninstall.sh --yes     Do not ask for confirmation when purging
#
# On Windows, run this instead:
#   npm rm -g tcopy

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LEGACY_LAUNCHER="/usr/local/bin/tcopy"
COMMANDS=(tcopy tpaste fcopy fpaste)

purge=false
assume_yes=false

die() {
  echo "Error: $*" >&2
  exit 1
}

step() {
  echo
  echo "==> $*"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --purge) purge=true; shift ;;
    --yes|-y) assume_yes=true; shift ;;
    -h|--help)
      awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
      exit 0
      ;;
    *) die "unknown argument: $1 (use --help)" ;;
  esac
done

command -v npm >/dev/null 2>&1 || die "npm is not installed or not in PATH."

pkg_name="$(node -p "require('$SCRIPT_DIR/package.json').name" 2>/dev/null || echo tcopy)"
global_bin="$(npm prefix -g)/bin"

# ---- Stop anything still running -------------------------------------------
# Do this before unlinking, while the command still exists.

if command -v tcopy >/dev/null 2>&1; then
  step "Stopping background process"
  tcopy stop >/dev/null 2>&1 || true
  echo "Done."
fi

# ---- Unlink ----------------------------------------------------------------

step "Removing linked commands"

if [ -w "$global_bin" ] || [ ! -e "$global_bin" ]; then
  npm rm -g "$pkg_name" 2>/dev/null || true
else
  sudo npm rm -g "$pkg_name" 2>/dev/null || true
fi

# ---- Remove the pre-0.1 launcher -------------------------------------------

if [ -e "$LEGACY_LAUNCHER" ] || [ -L "$LEGACY_LAUNCHER" ]; then
  if grep -q "tcopy.sh" "$LEGACY_LAUNCHER" 2>/dev/null; then
    step "Removing the old launcher at $LEGACY_LAUNCHER"
    if [ -w "$(dirname "$LEGACY_LAUNCHER")" ]; then
      rm -f "$LEGACY_LAUNCHER"
    else
      echo "This needs sudo (the file is owned by root)."
      sudo rm -f "$LEGACY_LAUNCHER"
    fi
    echo "Removed."
  fi
fi

# ---- Configuration ---------------------------------------------------------

if [ -n "${TCOPY_CONFIG_DIR:-}" ]; then
  config_dir="$TCOPY_CONFIG_DIR"
else
  config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/tcopy"
fi

if [ "$purge" = true ]; then
  if [ -d "$config_dir" ]; then
    step "Deleting configuration"
    echo "This removes $config_dir, including your settings and any"
    echo "clipboard data stored inside it."
    if [ "$assume_yes" = false ]; then
      echo
      printf "Delete it? [y/N]: "
      read -r answer
      case "$answer" in
        y|Y|yes|YES) ;;
        *) echo "Keeping configuration."; purge=false ;;
      esac
    fi
    if [ "$purge" = true ]; then
      rm -rf "$config_dir"
      echo "Deleted $config_dir"
    fi
  else
    step "No configuration found at $config_dir"
  fi
fi

# ---- Verify ----------------------------------------------------------------

step "Verifying"

# Drop bash's cached command lookups; `tcopy stop` above hashed a path that no
# longer exists, and `command -v` would keep reporting it.
hash -r 2>/dev/null || true

remaining=0
for cmd in "${COMMANDS[@]}"; do
  if resolved="$(command -v "$cmd" 2>/dev/null)"; then
    printf '  %-8s still on PATH: %s\n' "$cmd" "$resolved"
    remaining=$((remaining + 1))
  else
    printf '  %-8s removed\n' "$cmd"
  fi
done

echo
if [ "$remaining" -gt 0 ]; then
  echo "Some commands are still on your PATH — they were installed by something"
  echo "other than ./install.sh, so this script left them alone."
  exit 1
fi

echo "Uninstalled."
if [ "$purge" = false ] && [ -d "$config_dir" ]; then
  echo "Configuration kept at $config_dir (remove with --purge)."
fi
