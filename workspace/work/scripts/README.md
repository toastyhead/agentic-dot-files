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

Select the same environment in the frontend as `RESPAN_OTEL_ENVIRONMENT`, and
make sure `RESPAN_OTLP_ENDPOINT` targets the same backend shown in the frontend
developer toolbar. The script prints the expected row coverage for all five
pages after a successful request. The synthetic data uses recent timestamps,
so it appears in a five-minute time range after ingestion and the asynchronous
log and ClickHouse aggregation pipelines complete.

The script requires a Node.js version with global `fetch` support.
