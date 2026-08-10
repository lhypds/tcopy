#!/bin/bash
#
# Publish tcopy to npm.
#
# Usage:
#   ./publish.sh                     Publish the version currently in package.json
#   ./publish.sh patch|minor|major   Bump the version first, then publish
#   ./publish.sh 1.2.3               Set an explicit version, then publish
#
# Options:
#   --dry-run          Run every check and show what would be published, but stop
#                      short of publishing (implies no version bump, no tagging)
#   --tag <dist-tag>   Publish under an npm dist-tag other than `latest`
#   --otp <code>       Two-factor auth code, if your npm account requires one
#   --yes              Skip the interactive confirmation
#   --allow-branch     Permit publishing from a branch other than master
#
# This is a maintainer tool and only ever runs on your own machine; end users
# install with `npm install -g tcopy` on any platform.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MAIN_BRANCH="master"

version_arg=""
dist_tag="latest"
otp=""
dry_run=false
assume_yes=false
allow_branch=false

die() {
  echo "Error: $*" >&2
  exit 1
}

step() {
  echo
  echo "==> $*"
}

# ---- Parse arguments -------------------------------------------------------

while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major)
      [ -n "$version_arg" ] && die "version specified more than once"
      version_arg="$1"
      shift
      ;;
    [0-9]*.[0-9]*.[0-9]*)
      [ -n "$version_arg" ] && die "version specified more than once"
      version_arg="$1"
      shift
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    --tag)
      [ $# -ge 2 ] || die "--tag requires a value"
      dist_tag="$2"
      shift 2
      ;;
    --otp)
      [ $# -ge 2 ] || die "--otp requires a value"
      otp="$2"
      shift 2
      ;;
    --yes|-y)
      assume_yes=true
      shift
      ;;
    --allow-branch)
      allow_branch=true
      shift
      ;;
    -h|--help)
      # Print the header comment block, stopping at the first non-comment line.
      awk 'NR > 1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
      exit 0
      ;;
    *)
      die "unknown argument: $1 (use --help)"
      ;;
  esac
done

# ---- Preflight -------------------------------------------------------------

step "Checking environment"

command -v node >/dev/null 2>&1 || die "node is not installed or not in PATH."
command -v npm  >/dev/null 2>&1 || die "npm is not installed or not in PATH."
command -v git  >/dev/null 2>&1 || die "git is not installed or not in PATH."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 18 ] || die "Node.js 18+ is required to publish (found $(node -v))."

npm_user="$(npm whoami 2>/dev/null || true)"
[ -n "$npm_user" ] || die "not logged in to npm. Run 'npm login' first."
echo "npm user:     $npm_user"
echo "node:         $(node -v)"

# ---- Repository state ------------------------------------------------------

step "Checking repository state"

branch="$(git branch --show-current)"
echo "branch:       $branch"
if [ "$branch" != "$MAIN_BRANCH" ] && [ "$allow_branch" = false ]; then
  die "on branch '$branch', expected '$MAIN_BRANCH'. Use --allow-branch to override."
fi

if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "working tree is not clean. Commit or stash your changes first."
fi

# A published version should correspond to a commit that exists upstream.
if git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  git fetch --quiet origin "$branch" 2>/dev/null || true
  behind="$(git rev-list --count 'HEAD..@{upstream}' 2>/dev/null || echo 0)"
  [ "$behind" -eq 0 ] || die "branch is $behind commit(s) behind upstream. Pull first."
fi

# ---- Verify the package ----------------------------------------------------

step "Verifying sources"

# Syntax-check everything that ships.
# (Built with a plain loop rather than `mapfile`, which macOS's bash 3.2 lacks.)
js_count=0
while IFS= read -r file; do
  node --check "$file" || die "syntax check failed: $file"
  js_count=$((js_count + 1))
done < <(find bin src storage_mode server_mode -name '*.js' -not -path '*/node_modules/*' | sort)
[ "$js_count" -gt 0 ] || die "no JavaScript sources found."
echo "syntax:       $js_count file(s) OK"

# The CLI must at least load and report its version.
cli_version="$(node bin/tcopy.js --version)" || die "'tcopy --version' failed to run."
echo "cli:          responds ($cli_version)"

# Every file the CLI dispatches to must actually be included by the `files`
# whitelist in package.json — a missing entry produces a broken published
# package that works perfectly in the local checkout.
step "Checking packaged contents"

packed="$(npm pack --dry-run --json 2>/dev/null)" || die "npm pack failed."
packed_files="$(node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  for (const f of data[0].files) console.log(f.path);
' <<<"$packed")"

required=(
  "bin/tcopy.js"
  "src/cli.js"
  "src/config.js"
  "src/daemon.js"
  "src/fileRefs.js"
  "src/prompt.js"
  "storage_mode/watchEntry.js"
  "storage_mode/copy.js"
  "storage_mode/paste.js"
  "server_mode/client/copy.js"
  "server_mode/client/paste.js"
  "server_mode/client/client.js"
  "server_mode/server/serve.js"
  "server_mode/constants.js"
)
for entry in "${required[@]}"; do
  grep -Fxq "$entry" <<<"$packed_files" \
    || die "'$entry' is missing from the package. Check the \"files\" field in package.json."
done
echo "contents:     $(wc -l <<<"$packed_files" | tr -d ' ') file(s), all required entries present"

# ---- Version ---------------------------------------------------------------

step "Resolving version"

pkg_name="$(node -p "require('./package.json').name")"

if [ -n "$version_arg" ]; then
  if [ "$dry_run" = true ]; then
    echo "would bump version: $version_arg (skipped for --dry-run)"
  else
    # `npm version` creates the commit and the git tag for us.
    npm version "$version_arg" --message "%s" >/dev/null
    echo "version bumped"
  fi
fi

pkg_version="$(node -p "require('./package.json').version")"
echo "package:      $pkg_name@$pkg_version"
echo "dist-tag:     $dist_tag"

# Does this package exist on the registry at all? `npm view --json` prints its
# error object to stdout on a 404, so trust the exit status, not the output.
first_publish=false
if published="$(npm view "$pkg_name" versions --json 2>/dev/null)"; then
  # Republishing an existing version is rejected by the registry; catch it here
  # with a clearer message.
  if grep -q "\"$pkg_version\"" <<<"$published"; then
    die "$pkg_name@$pkg_version is already published. Bump the version first."
  fi
  echo "registry:     latest published is $(npm view "$pkg_name" version 2>/dev/null || echo unknown)"
else
  first_publish=true
  echo "registry:     '$pkg_name' is unclaimed — this would be the FIRST publish"
fi

# ---- Confirm ---------------------------------------------------------------

if [ "$dry_run" = true ]; then
  step "Dry run complete — nothing was published"
  npm pack --dry-run
  exit 0
fi

if [ "$assume_yes" = false ]; then
  step "Ready to publish"
  if [ "$first_publish" = true ]; then
    echo "This is the FIRST publish of '$pkg_name' — it claims the name permanently."
  fi
  echo "Publishing is effectively permanent: npm only allows unpublishing within"
  echo "72 hours, and the name stays reserved either way."
  echo
  printf "Publish %s@%s to npm as '%s'? [y/N]: " "$pkg_name" "$pkg_version" "$dist_tag"
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

# ---- Publish ---------------------------------------------------------------

step "Publishing"

publish_args=(publish --tag "$dist_tag")
[ -n "$otp" ] && publish_args+=(--otp "$otp")

npm "${publish_args[@]}"

step "Pushing to git"

git push
git push --tags

echo
echo "Published $pkg_name@$pkg_version"
echo "Install with: npm install -g $pkg_name"
