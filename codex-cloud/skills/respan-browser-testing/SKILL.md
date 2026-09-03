---
name: respan-browser-testing
description: Validate user-visible Respan frontend changes from a Codex Cloud checkout with an isolated local server, headless Playwright, and the staging API. Invoke after implementing or fixing frontend behavior, reproducing regressions, validating review feedback, and before reporting a frontend change complete.
---

# Respan browser testing in Codex Cloud

Validate every changed user flow from the exact cloud checkout. Static checks
supplement browser evidence but never replace it.

Codex Cloud cannot use the user's desktop browser, Chrome profile, Mac
localhost servers, or local filesystem credentials. Use the isolated cloud
container and headless Chromium prepared by `codex-cloud/setup.sh`.

## Establish the target

1. Resolve and record:
   - `git rev-parse --show-toplevel`
   - `git rev-parse HEAD`
   - `git status --short --branch`
   - the current PR and `headRefOid`, when available
2. Confirm the checkout is `respan-frontend`. Do not substitute another clone
   or check out a branch to obtain a baseline.
3. Read the current package scripts and Node requirements. Install repository
   dependencies using its lockfile when the cloud environment did not already
   do so.
4. Choose a free high port and start an isolated server from the checkout root.
   Set staging explicitly:

```bash
VITE_FETCH_ENDPOINT=https://staging-api.respan.ai/ \
VITE_WS_ENDPOINT=wss://staging-api.respan.ai/ \
yarn workspace platform dev --host 127.0.0.1 --port <free-port>
```

5. Keep the server in a dedicated terminal/session. Record its PID, log, URL,
   and working directory. On Linux, verify `/proc/<pid>/cwd` resolves inside the
   target checkout. Wait for an HTTP response before opening the app.
6. Stop only this isolated process during final cleanup, including after failed
   checks.

Never assume ports 3000 or 3001 and never stop an unrelated listener.

## Confirm staging and authentication

1. Verify the server was started with `staging-api.respan.ai` and confirm actual
   browser requests use that host.
2. Stop before mutations if requests target production or an unknown API host.
3. Read `E2E_EMAIL` and `E2E_PASSWORD` only from cloud environment variables
   when sign-in is required. Never print, persist, screenshot, or commit them.
4. Use a dedicated least-privilege staging account. If credentials, workspace
   access, network allowlists, or Chromium are unavailable, mark only the
   affected scenarios `Blocked` or `Inconclusive`.

The shared read-only browser harness is installed at:

```bash
dotfiles_directory="${CODEX_CLOUD_DOTFILES_DIR:-$HOME/agentic-dot-files}"
e2e_directory="$dotfiles_directory/workspace/work/e2e"
```

Use its `@playwright/test` installation for focused headless checks. Temporary
reproduction scripts may be created under a `mktemp` directory inside the
harness so Node can resolve dependencies; remove them after the run. Do not add
permanent tests unless the user explicitly approves test creation.

## Build the regression matrix

Derive scenarios from the exact working-tree or PR diff and reported behavior.
For each changed behavior, identify:

- entry route and prerequisites;
- primary interaction and visible outcome;
- loading, empty, error, disabled, retry, navigation, and persistence states
  affected by the change;
- related request method, staging host, status, and response effect; and
- regression-sensitive adjacent behavior sharing the changed state.

Exercise every user-observable changed path. Run focused existing automated
checks separately. Browser validation does not authorize adding Playwright,
unit, component, or regression tests.

## Staging data and API keys

Reuse existing staging data whenever it covers the required state. UI-only,
read-only, navigation, settings, presentation, and client-side filtering checks
must not create a key merely for setup.

Report `API key: not created; fresh ingestion not required` when applicable.

Create a temporary key only when fresh uniquely shaped ingestion is required or
the API-key lifecycle itself is under test:

1. Create it through `/platform/api-keys?action=create` using Playwright UI
   interactions against the isolated server. Never create it through a direct
   API request or reuse an existing key.
2. Name it `Codex cloud browser test <feature> <UTC timestamp>`.
3. Keep the one-time secret only in the Playwright process's memory. Never emit
   it through commands, output, logs, files, screenshots, summaries, or PR text.
4. If telemetry fixtures are needed, read
   [references/staging-test-data.md](references/staging-test-data.md) and pipe
   the secret to [scripts/run-staging-otel-traces.mjs](scripts/run-staging-otel-traces.mjs)
   through standard input from the same in-memory process.
5. Revoke the exact key through the UI in a `finally` cleanup and verify its
   revoked/absent state even when ingestion or validation fails.
6. If revocation cannot be verified, report the key name and failed cleanup
   without exposing its value. Do not claim the run complete.

Use the smallest fixture batch and distinctive identifiers. Revoking a key does
not remove ingested staging data.

## Exercise and record evidence

Use visible user-level interactions, fresh page state, durable locators, and
Playwright network events. Do not rely on stale pages, fixed waits, source-only
assertions, or implementation details.

For each scenario capture:

- checkout root, HEAD, isolated URL, and staging API host;
- route, prerequisites, actions, expected result, and actual result;
- relevant request method/status and response effect; and
- screenshot or trace only when it materially supports the conclusion.

Classify every scenario as `Passed`, `Failed`, `Blocked`, or `Inconclusive`.
Do not report the overall change as passing while an affected path is untested.

## Update the PR Testing section

When the current checkout has an associated PR and authenticated `gh` access,
keep its existing `Test`, `Tests`, `Testing`, or `Test plan` section current:

1. Verify the live PR `headRefOid` equals the tested local HEAD. If not, report
   the results as local-only and do not post them.
2. Preserve the entire PR body and human-authored testing content.
3. Replace only this skill's managed block, or append `## Testing` when no test
   heading exists.
4. Dry-run the helper first, review the rendered body, then apply it:

```bash
python3 "$HOME/.agents/skills/respan-browser-testing/scripts/update_pr_test_section.py" \
  --repo-root /absolute/path/to/checkout \
  --github-repo respanai/respan-frontend \
  --pr-number <number> \
  --scope "Changed feature flow" \
  --server "http://127.0.0.1:<free-port>" \
  --passed "Primary flow shows the saved result after refresh" \
  --blocked "Empty state: no suitable staging fixture"
```

Use `--apply` only after reviewing the dry run. Re-read the live PR body and
confirm both the managed block and tested SHA.

If GitHub authentication is unavailable, keep the same summary in the task
response and report the PR update as blocked.

## Report and clean up

Include the tested SHA and URL, scenario results, automated checks, staging-data
decision, API-key lifecycle result, PR update status, and cleanup status. Never
include credentials or a key value.

Remove temporary Playwright scripts and artifacts unless needed to explain a
failure. Stop the isolated server and confirm it no longer owns the listener.
