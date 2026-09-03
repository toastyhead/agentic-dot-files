#!/usr/bin/env bash

set -euo pipefail

cloud_home_directory="${CODEX_CLOUD_HOME_DIR:-$HOME}"
dotfiles_directory="${CODEX_CLOUD_DOTFILES_DIR:-$cloud_home_directory/agentic-dot-files}"
e2e_directory="$dotfiles_directory/workspace/work/e2e"
installed_lockfile="$e2e_directory/node_modules/.package-lock.json"

verify_headless_chromium() {
  node <<'NODE'
const { chromium } = require("@playwright/test");

chromium
  .launch({ headless: true })
  .then((browser) => browser.close())
  .catch((error) => {
    console.error("Headless Chromium launch failed:", error.message);
    process.exit(1);
  });
NODE
}

if [ ! -d "$dotfiles_directory/.git" ]; then
  echo "error: run codex-cloud/setup.sh before the maintenance script" >&2
  exit 1
fi

git -C "$dotfiles_directory" pull --ff-only

if [ "${CODEX_CLOUD_SKIP_BROWSER_SETUP:-0}" != "1" ]; then
  (
    cd "$e2e_directory"

    is_browser_refresh_required=0
    if [ ! -f "$installed_lockfile" ] ||
      [ "$e2e_directory/package-lock.json" -nt "$installed_lockfile" ]; then
      npm ci
      is_browser_refresh_required=1
    fi

    if [ "$is_browser_refresh_required" = "1" ] ||
      ! verify_headless_chromium >/dev/null 2>&1; then
      npx playwright install --with-deps chromium
    fi

    verify_headless_chromium
  )
fi
