---
name: e2e-testing
description: Create or maintain high-value Respan Playwright end-to-end tests from a Codex Cloud checkout. Use when the user explicitly approves adding or changing E2E coverage, asks to run existing Playwright tests, or requests maintenance of the shared user-flow harness.
---

# E2E testing in Codex Cloud

Maintain user-flow-oriented Playwright coverage without relying on a desktop
browser, Mac paths, or an existing local server.

## Approval and repository boundary

- Running and inspecting existing tests is allowed.
- Never create a test case or file, or materially expand an existing case,
  unless the user explicitly approves test creation for the current task.
- After approval, add coverage only when it protects a distinct observable
  contract with meaningful regression impact, is not already covered, would
  fail before the change, uses the lowest-cost reliable layer, and survives a
  behavior-preserving refactor.
- Prefer zero or one new test per distinct behavior. Do not test copy, styling,
  layout, static configuration, simple wiring, library behavior, or
  implementation details unless specifically requested.
- Modify test files only when they belong to the repository selected for the
  cloud task. The bootstrap clone at `$HOME/agentic-dot-files` is an installed
  dependency during other repositories' tasks; do not edit it expecting those
  changes to appear in the task diff.

The shared harness is tracked at `workspace/work/e2e` when the active checkout
is `agentic-dot-files`. During another repository's task, the installed copy at
`$HOME/agentic-dot-files/workspace/work/e2e` may be used read-only for browser
validation.

## Environment

1. Resolve the target checkout with `git rev-parse --show-toplevel`.
2. For frontend execution, start an isolated dev server from that exact
   checkout on a free high port. Read the repository package scripts to choose
   the command; do not assume ports 3000 or 3001 or reuse another process.
3. Set the staging endpoints explicitly for the server:

```bash
VITE_FETCH_ENDPOINT=https://staging-api.respan.ai/ \
VITE_WS_ENDPOINT=wss://staging-api.respan.ai/ \
yarn workspace platform dev --host 127.0.0.1 --port <free-port>
```

4. Record the server PID, working directory, URL, and checkout HEAD. Wait for a
   successful readiness request. Stop only that process during cleanup.
5. Use headless Chromium. The cloud setup script installs the shared harness
   and browser unless `CODEX_CLOUD_SKIP_BROWSER_SETUP=1` was configured.
6. Read `E2E_EMAIL` and `E2E_PASSWORD` from cloud environment variables. Never
   print, persist, screenshot, or commit them. If missing, mark authenticated
   flows blocked rather than embedding credentials.

The harness receives the isolated server through `PLAYWRIGHT_BASE_URL`:

```bash
dotfiles_directory="${CODEX_CLOUD_DOTFILES_DIR:-$HOME/agentic-dot-files}"
e2e_directory="$dotfiles_directory/workspace/work/e2e"
PLAYWRIGHT_BASE_URL="http://127.0.0.1:<free-port>" \
  npm --prefix "$e2e_directory" test -- tests/<feature>
```

## Design coverage

Start from the primary user goal and add only important secondary or failure
flows whose breakage would block the goal, lose data, or show materially wrong
data. Keep each test isolated, deterministic, and self-cleaning.

- Prefer role, label, placeholder, and visible-text locators.
- Use the shared `getButtonByText` helper for `ButtonNew` labels.
- Use web-first assertions and Playwright auto-waiting.
- Do not use fixed waits, brittle CSS chains, XPath, shared mutable state, or
  manual login inside specs.
- Make created entities unique and clean them up even after failure.
- Ask before adding `data-testid` to product code.

Authentication is performed by the shared setup project and reused through its
storage state. Public-demo specs remain unauthenticated.

## Run and verify

From an `agentic-dot-files` cloud task:

```bash
e2e_directory="$(git rev-parse --show-toplevel)/workspace/work/e2e"
npm --prefix "$e2e_directory" ci
PLAYWRIGHT_BASE_URL="http://127.0.0.1:<free-port>" \
  npm --prefix "$e2e_directory" test -- tests/<feature>
```

Run a changed test enough times to expose obvious flakiness. Do not use headed,
UI, codegen, or report-opening commands in Codex Cloud.

Report the checkout SHA, server URL, staging host, selected specs, results,
cleanup, and missing prerequisites. A browser run is validation evidence; it
does not authorize creating permanent Playwright coverage.
