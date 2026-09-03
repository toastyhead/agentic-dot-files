#!/usr/bin/env bash

set -euo pipefail

cloud_home_directory="${CODEX_CLOUD_HOME_DIR:-$HOME}"
dotfiles_directory="${CODEX_CLOUD_DOTFILES_DIR:-$cloud_home_directory/agentic-dot-files}"
e2e_directory="$dotfiles_directory/workspace/work/e2e"
installed_lockfile="$e2e_directory/node_modules/.package-lock.json"

if [ ! -d "$dotfiles_directory/.git" ]; then
  echo "error: run codex-cloud/setup.sh before the maintenance script" >&2
  exit 1
fi

git -C "$dotfiles_directory" pull --ff-only

if [ "${CODEX_CLOUD_SKIP_BROWSER_SETUP:-0}" != "1" ] &&
  { [ ! -f "$installed_lockfile" ] ||
    [ "$e2e_directory/package-lock.json" -nt "$installed_lockfile" ]; }; then
  (
    cd "$e2e_directory"
    npm ci
    npx playwright install chromium
  )
fi
