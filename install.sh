#!/bin/bash
#
# Install tcopy from this checkout.
#
# Links the four commands — tcopy, tpaste, fcopy, fpaste — onto your PATH via
# `npm link`, so the checkout stays live: after `git pull` (or `tcopy update`)
# the installed commands are already up to date, with nothing to reinstall.
#
# Usage:
#   ./install.sh            Install dependencies and link the commands
#   ./install.sh --no-deps  Skip `npm install` (dependencies already present)
#
# On Windows, run the two steps directly instead:
#   npm install
#   npm link

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LEGACY_LAUNCHER="/usr/local/bin/tcopy"
COMMANDS=(tcopy tpaste fcopy fpaste)

install_deps=true

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
    --no-deps) install_deps=false; shift ;;
    -h|--help)
      awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
      exit 0
      ;;
    *) die "unknown argument: $1 (use --help)" ;;
  esac
done

# ---- Preflight -------------------------------------------------------------

step "Checking environment"

command -v node >/dev/null 2>&1 || die "node is not installed or not in PATH."
command -v npm  >/dev/null 2>&1 || die "npm is not installed or not in PATH."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 18 ] || die "Node.js 18+ is required (found $(node -v))."

[ -f "$SCRIPT_DIR/package.json" ] || die "package.json not found in $SCRIPT_DIR."

echo "node:         $(node -v)"
echo "npm prefix:   $(npm prefix -g)"

# ---- Remove the pre-0.1 launcher -------------------------------------------
# Versions before the Node rewrite installed a shell launcher into
# /usr/local/bin that exec'd tcopy.sh. That file no longer exists, so the stale
# launcher is broken — and worse, it can shadow the npm-linked command
# depending on PATH order.

if [ -e "$LEGACY_LAUNCHER" ] || [ -L "$LEGACY_LAUNCHER" ]; then
  if grep -q "tcopy.sh" "$LEGACY_LAUNCHER" 2>/dev/null; then
    step "Removing the old launcher at $LEGACY_LAUNCHER"
    echo "It points at tcopy.sh, which no longer exists."
    if [ -w "$(dirname "$LEGACY_LAUNCHER")" ]; then
      rm -f "$LEGACY_LAUNCHER"
    else
      echo "This needs sudo (the file is owned by root)."
      sudo rm -f "$LEGACY_LAUNCHER"
    fi
    echo "Removed."
  else
    echo
    echo "Warning: $LEGACY_LAUNCHER exists but was not created by tcopy."
    echo "         Leaving it alone; it may shadow the tcopy command."
  fi
fi

# ---- Dependencies ----------------------------------------------------------

if [ "$install_deps" = true ]; then
  step "Installing dependencies"
  npm install
else
  step "Skipping dependency install (--no-deps)"
  [ -d "$SCRIPT_DIR/node_modules" ] || die "node_modules not found; re-run without --no-deps."
fi

# ---- Link ------------------------------------------------------------------

step "Linking commands"

# Writing into npm's global prefix normally needs no elevation (nvm, fnm and
# Homebrew all keep it user-owned). Only fall back to sudo if it does not.
global_bin="$(npm prefix -g)/bin"
if [ -w "$global_bin" ] || [ ! -e "$global_bin" ]; then
  npm link
else
  echo "npm's global bin ($global_bin) is not writable; using sudo."
  sudo npm link
fi

# ---- Verify ----------------------------------------------------------------

step "Verifying"

# Drop bash's cached command lookups so a path resolved before linking (such as
# the launcher removed above) does not mask the freshly linked command.
hash -r 2>/dev/null || true

missing=0
for cmd in "${COMMANDS[@]}"; do
  if resolved="$(command -v "$cmd" 2>/dev/null)"; then
    printf '  %-8s %s\n' "$cmd" "$resolved"
    case "$resolved" in
      "$global_bin"/*) ;;
      *)
        echo "           ^ warning: not the freshly linked copy; another '$cmd'"
        echo "             earlier in PATH is winning."
        ;;
    esac
  else
    printf '  %-8s NOT FOUND on PATH\n' "$cmd"
    missing=$((missing + 1))
  fi
done

if [ "$missing" -gt 0 ]; then
  echo
  echo "Some commands are not on your PATH. Make sure this directory is in it:"
  echo "  $global_bin"
  exit 1
fi

version="$(tcopy --version 2>/dev/null || echo unknown)"

step "Installed tcopy $version"
echo "Next step:  tcopy setup"
echo "Uninstall:  ./uninstall.sh"
