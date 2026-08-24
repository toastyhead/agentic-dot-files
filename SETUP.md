# Setup and restore guide

Clone this repository somewhere outside the Respan work directory. For example:

```sh
git clone git@github.com:toastyhead/agentic-dot-files.git "$HOME/agentic-dot-files"
cd "$HOME/agentic-dot-files"
```

Do not run `git init` in `$HOME/work` or copy this repository's `.git`
directory into a workspace. Only copy the payload paths described below.

## File map

| Backup path | Restore destination |
| --- | --- |
| `codex/AGENTS.md` | `$HOME/.codex/AGENTS.md` |
| `codex/skills/<skill>/` | `$HOME/.codex/skills/<skill>/` |
| `workspace/work/AGENTS.md` | `$HOME/work/AGENTS.md` |
| `workspace/work/.cursor/skills/e2e-testing/` | `$HOME/work/.cursor/skills/e2e-testing/` |
| `workspace/work/scripts/` | `$HOME/work/scripts/` |
| `workspace/work/e2e/` | `$HOME/work/e2e/` |

The destinations above reproduce the original layout. If your work root is in
a different location, replace `$HOME/work` with that path and update absolute
paths inside the copied Markdown files.

## Restore Codex files

Review local differences first if the destination already exists, then copy:

```sh
mkdir -p "$HOME/.codex/skills"
cp codex/AGENTS.md "$HOME/.codex/AGENTS.md"
cp -R codex/skills/. "$HOME/.codex/skills/"
```

Restart Codex after changing global instructions or skills so a new session
loads the restored definitions.

## Restore workspace instructions and helpers

```sh
mkdir -p "$HOME/work/.cursor/skills" "$HOME/work/scripts" "$HOME/work/e2e"
cp workspace/work/AGENTS.md "$HOME/work/AGENTS.md"
cp -R workspace/work/.cursor/skills/. "$HOME/work/.cursor/skills/"
cp -R workspace/work/scripts/. "$HOME/work/scripts/"
cp -R workspace/work/e2e/. "$HOME/work/e2e/"
```

The backup does not include the tracked agent files from
`respan-frontend-codex`. Restore those by cloning or updating the Respan
frontend repository itself.

## Configure the E2E harness

Credentials and browser authentication state are intentionally absent. Create
them locally after restoring:

```sh
cd "$HOME/work/e2e"
cp .env.example .env
npm ci
npx playwright install
```

Edit `.env` and provide the real `E2E_EMAIL` and `E2E_PASSWORD`. The test suite
creates `tests/.auth/user.json` at runtime; both files remain ignored. The local
frontend must already be running on the base URL configured in `.env` before
running:

```sh
npm test
```

## Use the trace generator

The workspace script needs Node.js with global `fetch` support and a runtime API
key supplied through the environment:

```sh
cd "$HOME/work"
RESPAN_API_KEY=<key> node scripts/send-respan-otel-traces.mjs
```

See `workspace/work/scripts/README.md` for endpoint, environment, trace-count,
and thread-count options. Never save the API key in this repository.
