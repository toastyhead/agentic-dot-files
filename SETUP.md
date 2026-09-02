# Setup and restore guide

Clone this repository somewhere outside the Respan work directory. For example:

```sh
git clone git@github.com:toastyhead/agentic-dot-files.git "$HOME/agentic-dot-files"
cd "$HOME/agentic-dot-files"
```

Do not run `git init` in `$HOME/work` or copy this repository's `.git` directory
into a workspace. Only copy the payload paths described below.

Cursor is the recommended runtime. The same Cursor rules and skills apply to
both `/Users/rizwan_respan/work` and `/Users/rizwan_respan/respan-frontend-codex`.
Keep Codex files only if you still use Codex.

## File map

| Backup path | Restore destination |
| --- | --- |
| `cursor/rules/` | `$HOME/.cursor/rules/` |
| `cursor/skills/<skill>/` | `$HOME/.cursor/skills/<skill>/` |
| `codex/AGENTS.md` | `$HOME/.codex/AGENTS.md` |
| `codex/skills/<skill>/` | `$HOME/.codex/skills/<skill>/` |
| `workspace/work/AGENTS.md` | `$HOME/work/AGENTS.md` |
| `workspace/work/.cursor/skills/e2e-testing/` | `$HOME/work/.cursor/skills/e2e-testing/` |
| `workspace/work/scripts/` | `$HOME/work/scripts/` |
| `workspace/work/e2e/` | `$HOME/work/e2e/` |

If your work root is in a different location, replace `$HOME/work` with that
path and update absolute paths inside the copied Markdown files.

## Restore Cursor files

Review local differences first if the destination already exists, then copy:

```sh
mkdir -p "$HOME/.cursor/rules" "$HOME/.cursor/skills"
cp cursor/rules/*.mdc "$HOME/.cursor/rules/"
cp -R cursor/skills/. "$HOME/.cursor/skills/"
```

Reload the Cursor window after changing global rules or skills so a new
session loads the restored definitions. Confirm the skills under
Customize → Skills.

Chronicle is Codex-only. Do not copy `codex/skills/chronicle` into
`$HOME/.cursor/skills`.

## Restore Codex files

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

The backup does not include tracked agent files from `respan-frontend` or
`respan-frontend-codex`. Restore those by cloning or updating the Respan
frontend repository itself.

## Configure the E2E harness

Credentials and browser authentication state are intentionally absent. Create
them locally after restoring:

```sh
cd "$HOME/work/e2e"
cp .env.example .env
npm ci
npx playwright install chromium
```

Edit `.env` and provide the real `E2E_EMAIL` and `E2E_PASSWORD`. The test suite
creates `tests/.auth/user.json` at runtime; both files remain ignored. The local
frontend must already be running on the base URL configured in `.env` before
running:

```sh
npm test
```

Default base URL is `http://localhost:3001` (`respan-frontend-codex`). Use
`PLAYWRIGHT_BASE_URL=http://localhost:3000` only when targeting
`/Users/rizwan_respan/work/respan-frontend`.

## Use the trace generator

The workspace script needs Node.js with global `fetch` support and a runtime API
key supplied through the environment:

```sh
cd "$HOME/work"
RESPAN_API_KEY=<key> node scripts/send-respan-otel-traces.mjs
```

For staging browser tests, prefer the Cursor skill wrapper, which pins the
staging endpoint and environment:

```sh
node "$HOME/.cursor/skills/respan-browser-testing/scripts/run-staging-otel-traces.mjs" --api-key-stdin
```

See `workspace/work/scripts/README.md` for endpoint, environment, trace-count,
and thread-count options. Never save the API key in this repository.
