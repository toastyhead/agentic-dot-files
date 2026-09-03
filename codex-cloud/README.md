# Codex Cloud dotfiles

This directory is the remote-safe counterpart to `codex/`. It installs global
instructions into `~/.codex/AGENTS.md` and exposes cloud-compatible skills from
`~/.agents/skills`, the user skill location documented for Codex.

The local `codex/`, `cursor/`, and `workspace/` payloads remain unchanged.

## Configure a cloud environment

In the Codex Cloud environment settings, use the contents of `setup.sh` as the
setup script and `maintenance.sh` as the maintenance script. The setup script:

1. clones this public repository to `$HOME/agentic-dot-files`;
2. links each `codex-cloud/skills` entry under `$HOME/.agents/skills` without
   replacing unrelated user skills;
3. installs `codex-cloud/AGENTS.md` as the global Codex instructions; and
4. installs the existing shared Playwright harness, Chromium, and its Linux
   system dependencies, then verifies that headless Chromium launches.

Set `CODEX_CLOUD_SKIP_BROWSER_SETUP=1` only for environments that should not
perform browser validation. Set `CODEX_CLOUD_DOTFILES_DIR` only when the clone
must live somewhere other than `$HOME/agentic-dot-files`. A fork can set
`CODEX_CLOUD_DOTFILES_REPOSITORY` to its clone URL.

For authenticated staging checks, configure `E2E_EMAIL` and `E2E_PASSWORD` as
environment variables for a dedicated least-privilege staging account. Codex
Cloud environment variables remain available during the agent phase, so do not
use production credentials. Browser checks also require agent-phase network
access to the staging API and the domains used by staging authentication.

## Migrated capabilities

| Skill | Cloud behavior |
| --- | --- |
| `audit-frontend-tests` | Audits the current checkout with the bundled scanner. |
| `change-logs-update` | Uses authenticated GitHub API data and archives only when the frontend checkout is available. |
| `commit-and-push` | Supports normal and detached cloud checkouts without creating branches implicitly. |
| `convention` | Applies the same frontend conventions as the local profile. |
| `create-pr` | Resolves the current Respan upstream repository and fork head dynamically. |
| `e2e-testing` | Uses the shared harness from this checkout and targets an isolated cloud server. |
| `investigate-review-comments` | Uses current PR threads plus headless browser evidence. |
| `respan-browser-testing` | Starts an isolated frontend server and validates with headless Playwright against staging. |

`chronicle` is intentionally excluded because Codex Cloud cannot access the
Mac screen recorder, desktop history, or local app state.

MCP configuration is also intentionally excluded. GitHub operations require
the cloud run to already have authenticated `gh` access; skills report a
blocker instead of attempting interactive authentication.

## Verify a run

Start a new cloud run after changing the setup script or reset the environment
cache. Ask Codex:

```text
List the global and repository instruction files, available user skills, the
current checkout root, and whether headless Chromium can launch successfully.
Do not change files.
```

If a run finds a downloaded Chromium binary but reports missing shared
libraries, update both environment scripts from this directory and reset the
environment cache. A successful setup now includes a real headless launch, not
only a binary-presence check.
