#!/usr/bin/env bash

set -euo pipefail

dotfiles_repository="${CODEX_CLOUD_DOTFILES_REPOSITORY:-https://github.com/toastyhead/agentic-dot-files.git}"
cloud_home_directory="${CODEX_CLOUD_HOME_DIR:-$HOME}"
dotfiles_directory="${CODEX_CLOUD_DOTFILES_DIR:-$cloud_home_directory/agentic-dot-files}"
skills_source="$dotfiles_directory/codex-cloud/skills"
skills_target_directory="$cloud_home_directory/.agents/skills"
agents_source="$dotfiles_directory/codex-cloud/AGENTS.md"
agents_target="$cloud_home_directory/.codex/AGENTS.md"
e2e_directory="$dotfiles_directory/workspace/work/e2e"

if [ -d "$dotfiles_directory/.git" ]; then
  git -C "$dotfiles_directory" pull --ff-only
elif [ -e "$dotfiles_directory" ]; then
  echo "error: $dotfiles_directory exists but is not the agentic-dot-files checkout" >&2
  exit 1
else
  git clone --depth 1 "$dotfiles_repository" "$dotfiles_directory"
fi

mkdir -p "$skills_target_directory" "$cloud_home_directory/.codex"

for skill_source in "$skills_source"/*; do
  skill_name="${skill_source##*/}"
  skill_target="$skills_target_directory/$skill_name"

  if [ -L "$skill_target" ]; then
    ln -sfn "$skill_source" "$skill_target"
  elif [ -e "$skill_target" ]; then
    echo "error: $skill_target already exists and is not a managed symlink" >&2
    exit 1
  else
    ln -s "$skill_source" "$skill_target"
  fi
done

install -m 0644 "$agents_source" "$agents_target"

if [ "${CODEX_CLOUD_SKIP_BROWSER_SETUP:-0}" != "1" ]; then
  (
    cd "$e2e_directory"
    npm ci
    npx playwright install chromium
  )
fi

printf 'Installed Codex Cloud instructions and skills from %s\n' "$dotfiles_directory"
