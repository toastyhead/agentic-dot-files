---
name: respan-browser-testing
description: Validate Respan frontend changes in a real authenticated browser against the staging API. Invoke automatically after implementing or fixing user-visible frontend behavior, when reproducing or regression-testing a bug, when validating review feedback, and before reporting a frontend feature or fix complete. Use for both /Users/rizwan_respan/work/respan-frontend and /Users/rizwan_respan/respan-frontend-codex, including their git worktrees. Exercise every changed user flow on the live local app, create and revoke a fresh browser-issued API key for each test run, seed relevant staging data with local scripts when needed, record concrete browser and network evidence, and update an associated pull request's Test or Testing section when its head matches the tested commit.
---

# Respan browser testing

Validate changed behavior through the live app. Treat unit tests, lint, type checks, and static code inspection as complementary evidence, never substitutes for browser verification.

## 1. Establish the test target

1. Resolve the checkout with `git rev-parse --show-toplevel` and record `git rev-parse HEAD`.
2. Select the server:
   - `/Users/rizwan_respan/work/respan-frontend` -> `http://localhost:3000`
   - `/Users/rizwan_respan/respan-frontend-codex` -> `http://localhost:3001`
   - Any git worktree -> start an isolated temporary dev server from that worktree on a free port. Pass the staging API endpoints explicitly, wait for readiness, and stop only that temporary server after testing.
3. For the two persistent checkouts, reuse the existing terminal-owned server. Do not start a duplicate, stop it, or replace it.
4. Prove that the selected process serves the target checkout. Check the listener command/current working directory when possible and compare a changed runtime marker or asset with the checked-out source. Do not infer ownership from the port alone.
5. Confirm the app responds before opening it. If a persistent server is unavailable, report the affected checks as blocked; do not silently substitute the other checkout's server.

Never use ports 3000 or 3001 for a worktree. Never check out a branch merely to create a baseline.

## 2. Confirm staging and authentication

1. Verify the configured HTTP API host is `staging-api.respan.ai` before exercising a flow.
2. Confirm actual browser network requests use that host. A matching `.env.local` is useful setup evidence but does not prove the running process loaded it.
3. Stop before any mutation if requests target production or an unknown API host. Report the mismatch instead of continuing.
4. Reuse an authenticated browser session when available.
5. If the app shows its sign-in form, read [references/test-account.md](references/test-account.md), enter the local staging test credentials, submit, and confirm successful navigation. Do not expose the password in tool output, commentary, final summaries, screenshots, PR bodies, or logs.
6. If authentication, workspace access, required data, or another prerequisite is unavailable, mark only the affected scenarios `Blocked` or `Inconclusive`; never convert static evidence into a browser pass.

## 3. Build the regression matrix

Derive browser scenarios from the exact working-tree or PR diff and the reported behavior. Cover every user-observable changed path, not merely the page's happy path.

For each changed behavior, identify:

- entry route and prerequisites;
- primary interaction and expected visible outcome;
- affected loading, empty, error, disabled, retry, navigation, or persistence states;
- related API request method, host, status, and response effect;
- regression-sensitive adjacent behavior that shares the changed state or component.

Add focused automated checks when they provide durable regression coverage, then still exercise the live user flow. Avoid unrelated broad exploratory testing.

## 4. Create the temporary API key and prepare staging data

Always create a new API key through the local app in Browser for each test run. Do not reuse an existing key, create it through a direct API call, or leave it active after testing.

1. Read and follow `$browser:control-in-app-browser` before interacting with the API-key UI.
2. Open `/platform/api-keys?action=create` on the selected local server.
3. Create a uniquely named key containing `Codex browser test`, the tested feature, and a UTC timestamp. Confirm the create request uses staging.
4. Capture the one-time secret only in ephemeral runtime state. Never print it, paste it into a tool command, save it to disk, or place it in source, logs, screenshots, summaries, or PR text.
5. If the regression matrix needs traces, spans, threads, users, custom identifiers, or other seeded data, read [references/staging-test-data.md](references/staging-test-data.md). Use the fresh key and the staging-enforcing wrapper at [scripts/run-staging-otel-traces.mjs](scripts/run-staging-otel-traces.mjs).
6. Prefer supported environment overrides for counts and success/error coverage. If the required fixture shape is missing, update `/Users/rizwan_respan/work/scripts/send-respan-otel-traces.mjs` and its README as needed, validate the script, send a small targeted batch, and verify the resulting data in the live UI.
7. Treat cleanup as a `finally` step: return to the API-key page in Browser, choose `Revoke key` for the exact temporary key, confirm, and verify that it is absent from the active list or shown as revoked when that filter is selected. Run this cleanup even when ingestion or browser checks fail.
8. If revocation cannot be verified, report the key name and cleanup status as a failed or blocked cleanup item without exposing the secret. Never claim the run fully complete while a temporary key may remain active.

Revoking the key does not remove ingested staging data. Use distinctive fixture identifiers and the narrowest practical counts so test data remains attributable.

## 5. Exercise the live app

1. Read and follow `$browser:control-in-app-browser` before browser work. Use its in-app Browser flow unless the user explicitly chooses another browser.
2. Open the selected local URL and navigate from a realistic entry point.
3. Perform the regression matrix using visible, user-level interactions.
4. Verify outcomes from fresh page state. Do not rely on stale locators, stale cached forms, or a previous checkout's tab.
5. Inspect relevant network activity to confirm staging origin and API outcome.
6. Use reversible staging data for mutations and clean it up when practical. Do not trigger paid, destructive, or externally executing actions unless the task requires them and the user has authorized that effect.
7. Re-test a confirmed fix after implementation. For a bug fix, record the original symptom or a precise pre-fix reproduction when available, then record the corrected behavior.

Capture enough evidence to make each result reproducible: checkout, HEAD, local URL, staging host, route, actions, expected result, actual result, and any relevant request/status. Take screenshots when visual state materially supports the conclusion.

## 6. Report results

Classify every planned scenario as `Passed`, `Failed`, `Blocked`, or `Inconclusive`. Do not claim the overall change passed while an affected changed path remains untested.

In the final task summary, include:

- tested checkout, commit, local URL, and staging API host;
- concise scenario results;
- failed, blocked, or inconclusive coverage and why;
- automated checks run separately from browser checks;
- staging fixture script, overrides, and expected row coverage when data was seeded;
- temporary API-key creation and verified revocation status, never its secret;
- whether temporary tabs/server processes were left open or cleaned up.

## 7. Update the pull request Test section

When the current branch has an associated pull request, update its existing `Test`, `Tests`, `Testing`, or `Test plan` section after testing, even when some checks fail or are blocked.

1. Verify the PR head SHA equals the tested local HEAD. If they differ, do not post results as PR-head evidence; report that the summary is pending commit/push.
2. Preserve the entire existing PR body and any human-authored test content.
3. Replace only the block managed by this skill. If no test heading exists, append `## Testing` and the managed block.
4. Run [scripts/update_pr_test_section.py](scripts/update_pr_test_section.py) with the tested scope and passed, failed, or blocked scenarios. Use `--apply` only after reviewing the rendered block.
5. Re-read the live PR body and confirm the managed block and tested SHA exactly match.

Include the staging fixture coverage and API-key revocation result in the managed testing block. Never include the plaintext key.

Example:

```bash
python3 /Users/rizwan_respan/.codex/skills/respan-browser-testing/scripts/update_pr_test_section.py \
  --repo-root /absolute/path/to/checkout \
  --scope "Changed feature flow" \
  --server "http://localhost:3000" \
  --passed "Primary flow shows the saved result after refresh" \
  --blocked "Empty-state scenario: no suitable staging fixture" \
  --apply
```

If no PR exists, keep the same testing summary in the task response and skip external mutation.
