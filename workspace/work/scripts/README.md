# Workspace scripts

This folder holds local helper scripts that are useful across the `respan-frontend`
and `respan-backend` repositories without belonging to either repo.

## Send Respan OTEL traces

`send-respan-otel-traces.mjs` sends synthetic OpenTelemetry trace data to Respan
for testing the Spans, Traces, Threads, Users, and Custom ID pages. By default
it sends 36 traces grouped into six multi-turn threads, six synthetic users,
and six custom identifiers. The generated traces include chat input/output,
requests, tokens, cost, errors, latency, TTFT, TPS, environment, and synthetic
user profile attributes.

Run it from `/Users/rizwan_respan/work`:

```sh
RESPAN_API_KEY=<key> node scripts/send-respan-otel-traces.mjs
```

For the local frontend configured to use the staging API, run:

```sh
RESPAN_API_KEY=<staging-key> \
RESPAN_OTLP_ENDPOINT=https://staging-api.respan.ai/api/v2/traces \
RESPAN_OTEL_ENVIRONMENT=staging \
node scripts/send-respan-otel-traces.mjs
```

Optional environment variables:

```sh
RESPAN_OTLP_ENDPOINT=https://api.respan.ai/api/v2/traces
RESPAN_OTEL_TRACE_COUNT=36
RESPAN_OTEL_THREAD_COUNT=6
RESPAN_OTEL_ENVIRONMENT=staging
RESPAN_OTEL_FORCE_SUCCESS=false
RESPAN_OTEL_SEED_RUN_ID=optional-unique-run-id
```

Example with overrides:

```sh
RESPAN_API_KEY=<key> \
RESPAN_OTEL_TRACE_COUNT=60 \
RESPAN_OTEL_THREAD_COUNT=10 \
RESPAN_OTEL_ENVIRONMENT=development \
node scripts/send-respan-otel-traces.mjs
```

`RESPAN_OTEL_TRACE_COUNT` is the number of rows expected on the Traces page and
the total number of conversation turns. Each trace contains a workflow span,
an LLM span, and, for some profiles, a tool span, so the Spans page receives
more rows than the trace count. `RESPAN_OTEL_THREAD_COUNT` controls the number
of distinct rows expected on each of the Threads, Users, and Custom ID pages.
The thread count must not exceed the trace count.

Set `RESPAN_OTEL_FORCE_SUCCESS=true` when every generated trace must match an
automation filter that requires a successful status. The default remains false,
which preserves the mixed success/error coverage used by the logs pages.

Set `RESPAN_OTEL_SEED_RUN_ID` to a 2-64 character letters/numbers/hyphens value
when a test run needs uniquely attributable custom identifiers, users, and
threads. The value is appended to those seeded identifiers and emitted as
`respan.metadata.seed_run_id`; omit it to preserve the original stable fixture
names.

Select the same environment in the frontend as `RESPAN_OTEL_ENVIRONMENT`, and
make sure `RESPAN_OTLP_ENDPOINT` targets the same backend shown in the frontend
developer toolbar. The script prints the expected row coverage for all five
pages after a successful request. The synthetic data uses recent timestamps,
so it appears in a five-minute time range after ingestion and the asynchronous
log and ClickHouse aggregation pipelines complete.

The script requires a Node.js version with global `fetch` support.

## Check gateway PII redaction

`check-respan-gateway-pii-redaction.mjs` sends one real chat-completion request
through the Respan gateway. It asks the provider to echo synthetic email,
organization, and phone values, captures `X-Respan-Log-Id`, then verifies both
the provider response and stored gateway log contain `[REDACTED]` instead of the
synthetic values. It does not post an OTLP fixture or create a log directly.

Use a temporary API key for the target organization and revoke it after the
check. Staging is the default endpoint:

```sh
RESPAN_API_KEY=<temporary-staging-key> \
node scripts/check-respan-gateway-pii-redaction.mjs
```

Automation can pass the one-time key over standard input so it does not appear
in the rendered command or process arguments:

```sh
node scripts/check-respan-gateway-pii-redaction.mjs --api-key-stdin
```

Optional environment variables:

```sh
RESPAN_GATEWAY_ENDPOINT=https://staging-api.respan.ai/api/chat/completions
RESPAN_GATEWAY_MODEL=gpt-4o-mini
RESPAN_GATEWAY_LOG_WAIT_MS=20000
RESPAN_GATEWAY_RUN_ID=optional-unique-run-id
```

The check fails when the gateway call fails, the response has no gateway log
ID, the generated log cannot be read, any synthetic PII remains visible, or a
redaction marker is missing. The script never prints the API key or synthetic
PII values.
