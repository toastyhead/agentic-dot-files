# Staging test data

Use `/Users/rizwan_respan/work/scripts/send-respan-otel-traces.mjs` to create targeted observability fixtures for live browser regression testing. Read its current implementation and `/Users/rizwan_respan/work/scripts/README.md` before changing or running it.

## API-key lifecycle

Use this procedure only after the regression matrix establishes that fresh staging data must be sent or ingested, or when API-key creation/revocation is itself the changed behavior. If suitable data already exists or the UI change does not require ingestion, do not create a key and do not run a sender.

When a key is required, create a fresh staging API key through the local app's `/platform/api-keys?action=create` flow. The secret is shown once. Keep it only in ephemeral runtime state and revoke it through the Browser UI after all test scenarios, including failed runs. The UI labels deletion as `Revoke key` and performs a soft revoke.

Never use a production key for staging, reuse an existing key, create or revoke the key with a direct API request, or expose the secret in a command, output, file, screenshot, task summary, or PR body.

## Commands

The source script's production invocation is:

```bash
RESPAN_API_KEY=<production-key> node scripts/send-respan-otel-traces.mjs
```

Do not run that form during this skill unless the user explicitly requests production testing.

For staging, always set both the endpoint and environment explicitly:

```bash
RESPAN_API_KEY=<temporary-staging-key> \
RESPAN_OTLP_ENDPOINT=https://staging-api.respan.ai/api/v2/traces \
RESPAN_OTEL_ENVIRONMENT=staging \
node scripts/send-respan-otel-traces.mjs
```

Prefer the skill wrapper, which rejects non-staging endpoint/environment overrides:

```bash
RESPAN_API_KEY=<temporary-staging-key> \
node /Users/rizwan_respan/.cursor/skills/respan-browser-testing/scripts/run-staging-otel-traces.mjs
```

Inject the secret directly into the child process environment from ephemeral runtime state. Do not render the resolved command or environment. Keep `RESPAN_API_KEY` out of shell history and tool-visible command text.

When the secret is already held in the Browser JavaScript runtime, prefer the wrapper's standard-input mode so its value never enters a rendered command:

```javascript
const { spawn } = await import("node:child_process");
const sender = spawn(
  process.execPath,
  [
    "/Users/rizwan_respan/.cursor/skills/respan-browser-testing/scripts/run-staging-otel-traces.mjs",
    "--api-key-stdin",
  ],
  { stdio: ["pipe", "pipe", "pipe"] },
);
sender.stdin.end(temporaryApiKey);
```

Capture and inspect the sender's stdout/stderr for counts or errors without emitting the secret. Clear `temporaryApiKey` from runtime state immediately after the sender exits, then revoke the named key in Browser during final cleanup.

Supported fixture controls include:

```bash
RESPAN_OTEL_TRACE_COUNT=36
RESPAN_OTEL_THREAD_COUNT=6
RESPAN_OTEL_FORCE_SUCCESS=false
```

Keep the thread count at or below the trace count. Use `RESPAN_OTEL_FORCE_SUCCESS=true` only when the changed flow requires all rows to satisfy a successful-status filter.

## Adapt fixtures when necessary

Prefer environment overrides when only row counts or success/error distribution need to change. If the feature requires different models, attributes, hierarchy, users, custom identifiers, prompts, outputs, costs, timing, or status shapes:

1. Trace the expected contract through `respan-frontend` and `respan-backend`.
2. Patch `/Users/rizwan_respan/work/scripts/send-respan-otel-traces.mjs` narrowly. Preserve unrelated profiles and existing default coverage.
3. Update `/Users/rizwan_respan/work/scripts/README.md` when adding or changing a reusable input or output contract.
4. Run `node --check /Users/rizwan_respan/work/scripts/send-respan-otel-traces.mjs` and its `--help` path.
5. Send the smallest batch that covers the scenario, using the staging wrapper and temporary key.
6. Record any persistent helper-script changes separately from frontend repository changes.

After a successful send, allow for asynchronous ingestion, select the matching `staging` environment and recent time range, then verify only the relevant pages. The default helper can cover Spans, Traces, Threads, Users, and Custom ID; use the sender's printed expected counts as ingestion expectations, not proof that the UI rendered them.
