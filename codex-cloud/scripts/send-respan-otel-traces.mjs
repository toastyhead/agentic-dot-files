#!/usr/bin/env node

import { randomBytes } from "node:crypto";

const DEFAULT_OTLP_ENDPOINT = "https://api.respan.ai/api/v2/traces";
const DEFAULT_TRACE_COUNT = 36;
const DEFAULT_THREAD_COUNT = 6;
const DEFAULT_ENVIRONMENT = "staging";
const NANOS_PER_MILLISECOND = 1_000_000n;
const SPAN_KIND_INTERNAL = 1;
const SPAN_KIND_CLIENT = 3;
const STATUS_CODE_OK = 1;
const STATUS_CODE_ERROR = 2;
const LOG_STATUS_CODE_OK = 200;
const LOG_STATUS_CODE_ERROR = 500;
const INPUT_TOKEN_COST_PER_TOKEN = 0.000005;
const OUTPUT_TOKEN_COST_PER_TOKEN = 0.000015;
const RESPAN_CUSTOM_IDENTIFIER_ATTRIBUTE =
  "respan.span_params.custom_identifier";
const RESPAN_CUSTOMER_EMAIL_ATTRIBUTE = "respan.customer_params.email";
const RESPAN_CUSTOMER_IDENTIFIER_ATTRIBUTE =
  "respan.customer_params.customer_identifier";
const RESPAN_CUSTOMER_NAME_ATTRIBUTE = "respan.customer_params.name";
const RESPAN_THREAD_IDENTIFIER_ATTRIBUTE =
  "respan.threads.thread_identifier";
const RESPAN_TRACE_GROUP_IDENTIFIER_ATTRIBUTE =
  "respan.trace.trace_group_identifier";

const customIdentifierProfiles = [
  {
    customIdentifier: "support-chat-acme-enterprise",
    customerIdentifier: "acme-enterprise",
    customerName: "Maya Chen",
    customerEmail: "maya.chen@acme.example",
    threadPrefix: "acme-ticket",
    workflowName: "support_triage_agent",
    model: "gpt-4o",
    provider: "openai",
    customerTier: "enterprise",
    region: "us-east-1",
    prompt: "Summarize a billing support thread and suggest the next reply.",
    output: "Customer issue classified as billing adjustment with medium urgency.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "checkout-risk-nova-retail",
    customerIdentifier: "nova-retail",
    customerName: "Noah Williams",
    customerEmail: "noah.williams@nova.example",
    threadPrefix: "nova-checkout",
    workflowName: "checkout_risk_review",
    model: "claude-3-5-sonnet",
    provider: "anthropic",
    customerTier: "growth",
    region: "us-west-2",
    prompt: "Review a high-value checkout for fraud signals.",
    output: "Checkout approved after address and account-age checks.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "claims-intake-river-insurance",
    customerIdentifier: "river-insurance",
    customerName: "Priya Shah",
    customerEmail: "priya.shah@river.example",
    threadPrefix: "river-claim",
    workflowName: "claims_intake_classifier",
    model: "gpt-4o-mini",
    provider: "openai",
    customerTier: "business",
    region: "eu-west-1",
    prompt: "Extract claim type, incident date, and missing documents.",
    output: "Auto claim detected with police report still missing.",
    hasToolSpan: false,
  },
  {
    customIdentifier: "onboarding-copilot-summit-saas",
    customerIdentifier: "summit-saas",
    customerName: "Liam Taylor",
    customerEmail: "liam.taylor@summit.example",
    threadPrefix: "summit-onboarding",
    workflowName: "onboarding_copilot",
    model: "gemini-1.5-pro",
    provider: "google",
    customerTier: "enterprise",
    region: "us-central1",
    prompt: "Create a personalized onboarding checklist from account notes.",
    output: "Checklist created with SSO, data import, and admin training steps.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "patient-summary-harbor-clinic",
    customerIdentifier: "harbor-clinic",
    customerName: "Sofia Martinez",
    customerEmail: "sofia.martinez@harbor.example",
    threadPrefix: "harbor-visit",
    workflowName: "patient_visit_summarizer",
    model: "gpt-4o",
    provider: "openai",
    customerTier: "business",
    region: "us-east-2",
    prompt: "Summarize a patient visit transcript for the care team.",
    output: "Visit summarized with follow-up labs and medication changes.",
    hasToolSpan: false,
  },
  {
    customIdentifier: "loan-review-cascade-bank",
    customerIdentifier: "cascade-bank",
    customerName: "Ethan Brooks",
    customerEmail: "ethan.brooks@cascade.example",
    threadPrefix: "cascade-loan",
    workflowName: "loan_document_review",
    model: "claude-3-5-sonnet",
    provider: "anthropic",
    customerTier: "enterprise",
    region: "us-east-1",
    prompt: "Review loan documents and identify missing borrower evidence.",
    output: "Income verification missing for one borrower.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "hotel-concierge-lumen-travel",
    customerIdentifier: "lumen-travel",
    customerName: "Ava Patel",
    customerEmail: "ava.patel@lumen.example",
    threadPrefix: "lumen-stay",
    workflowName: "hotel_concierge_agent",
    model: "gpt-4o-mini",
    provider: "openai",
    customerTier: "growth",
    region: "ap-southeast-1",
    prompt: "Recommend restaurants near the guest hotel and book a table.",
    output: "Italian restaurant reserved for two at 7:30 PM.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "invoice-audit-orbit-finance",
    customerIdentifier: "orbit-finance",
    customerName: "Lucas Kim",
    customerEmail: "lucas.kim@orbit.example",
    threadPrefix: "orbit-invoice",
    workflowName: "invoice_audit_assistant",
    model: "gemini-1.5-flash",
    provider: "google",
    customerTier: "business",
    region: "europe-west4",
    prompt: "Compare an invoice against purchase order terms.",
    output: "Invoice matched purchase order except a shipping surcharge.",
    hasToolSpan: false,
  },
  {
    customIdentifier: "warehouse-routing-pine-logistics",
    customerIdentifier: "pine-logistics",
    customerName: "Isabella Morgan",
    customerEmail: "isabella.morgan@pine.example",
    threadPrefix: "pine-route",
    workflowName: "warehouse_routing_agent",
    model: "gpt-4o",
    provider: "openai",
    customerTier: "enterprise",
    region: "us-west-1",
    prompt: "Pick the lowest-latency routing plan for a delayed shipment.",
    output: "Shipment rerouted through secondary warehouse with 3 hour delay.",
    hasToolSpan: true,
  },
  {
    customIdentifier: "lesson-feedback-bright-academy",
    customerIdentifier: "bright-academy",
    customerName: "Oliver Singh",
    customerEmail: "oliver.singh@bright.example",
    threadPrefix: "bright-lesson",
    workflowName: "lesson_feedback_generator",
    model: "claude-3-haiku",
    provider: "anthropic",
    customerTier: "starter",
    region: "us-east-1",
    prompt: "Generate student-friendly feedback for a writing assignment.",
    output: "Feedback drafted with thesis, evidence, and grammar suggestions.",
    hasToolSpan: false,
  },
];

const showHelp = () => {
  console.log(`
Send realistic OpenTelemetry trace data to Respan.

Usage:
  RESPAN_API_KEY=<key> node scripts/send-respan-otel-traces.mjs

Optional environment variables:
  RESPAN_OTLP_ENDPOINT        Defaults to ${DEFAULT_OTLP_ENDPOINT}
  RESPAN_OTEL_TRACE_COUNT     Defaults to ${DEFAULT_TRACE_COUNT}
  RESPAN_OTEL_THREAD_COUNT    Defaults to ${DEFAULT_THREAD_COUNT}
  RESPAN_OTEL_ENVIRONMENT     Defaults to ${DEFAULT_ENVIRONMENT}
  RESPAN_OTEL_FORCE_SUCCESS   Defaults to false
  RESPAN_OTEL_SEED_RUN_ID     Optional unique suffix for seeded entities
`);
};

if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

const getRequiredEnvironmentValue = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is required. Example: ${name}=rk_live_... node scripts/send-respan-otel-traces.mjs`,
    );
  }

  return value;
};

const getPositiveIntegerEnvironmentValue = (name, defaultValue) => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  const isValidValue = Number.isInteger(parsedValue) && parsedValue > 0;

  if (!isValidValue) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
};

const getBooleanEnvironmentValue = (name, defaultValue) => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
};

const getOptionalSeedRunId = () => {
  const seedRunId = process.env.RESPAN_OTEL_SEED_RUN_ID?.trim() || "";

  if (seedRunId && !/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i.test(seedRunId)) {
    throw new Error(
      "RESPAN_OTEL_SEED_RUN_ID must be 2-64 letters, numbers, or hyphens.",
    );
  }

  return seedRunId;
};

const getHexId = (byteLength) => randomBytes(byteLength).toString("hex");

const getProfileForThread = (threadIndex, seedRunId) => {
  const baseProfile =
    customIdentifierProfiles[threadIndex % customIdentifierProfiles.length];
  const profileCycleNumber =
    Math.floor(threadIndex / customIdentifierProfiles.length) + 1;
  const profileCycleSuffix =
    profileCycleNumber === 1 ? "" : `seed-${profileCycleNumber}`;
  const identifierSuffix = [profileCycleSuffix, seedRunId]
    .filter(Boolean)
    .join("-");
  const [emailLocalPart, emailDomain] = baseProfile.customerEmail.split("@");

  return identifierSuffix
    ? {
        ...baseProfile,
        customIdentifier: `${baseProfile.customIdentifier}-${identifierSuffix}`,
        customerIdentifier: `${baseProfile.customerIdentifier}-${identifierSuffix}`,
        customerEmail: `${emailLocalPart}+${identifierSuffix}@${emailDomain}`,
        threadPrefix: `${baseProfile.threadPrefix}-${identifierSuffix}`,
        seedRunId,
      }
    : { ...baseProfile, seedRunId };
};

const toUnixNano = (timestampMs) =>
  String(BigInt(timestampMs) * NANOS_PER_MILLISECOND);

const createAttribute = (key, value) => {
  if (typeof value === "boolean") {
    return { key, value: { boolValue: value } };
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return { key, value: { intValue: String(value) } };
  }

  if (typeof value === "number") {
    return { key, value: { doubleValue: value } };
  }

  return { key, value: { stringValue: String(value) } };
};

const getDistinctStringAttributeCount = (spans, key) =>
  new Set(
    spans
      .flatMap((span) => span.attributes)
      .filter((attribute) => attribute.key === key)
      .map((attribute) => attribute.value.stringValue),
  ).size;

const createCommonAttributes = ({
  profile,
  traceIndex,
  threadIdentifier,
  traceGroupIdentifier,
  environment,
  isError,
}) => [
  createAttribute("custom_identifier", profile.customIdentifier),
  createAttribute(
    RESPAN_CUSTOM_IDENTIFIER_ATTRIBUTE,
    profile.customIdentifier,
  ),
  createAttribute(
    RESPAN_CUSTOMER_IDENTIFIER_ATTRIBUTE,
    profile.customerIdentifier,
  ),
  createAttribute(RESPAN_CUSTOMER_NAME_ATTRIBUTE, profile.customerName),
  createAttribute(RESPAN_CUSTOMER_EMAIL_ATTRIBUTE, profile.customerEmail),
  createAttribute(RESPAN_THREAD_IDENTIFIER_ATTRIBUTE, threadIdentifier),
  createAttribute(
    RESPAN_TRACE_GROUP_IDENTIFIER_ATTRIBUTE,
    traceGroupIdentifier,
  ),
  // `environment` is the native field promoted by the OTLP v2 ingestion path
  // and used by every logs page query. Keep the namespaced value as metadata
  // for SDK/backward compatibility.
  createAttribute("environment", environment),
  createAttribute("respan.environment", environment),
  createAttribute("app.customer_tier", profile.customerTier),
  createAttribute("app.region", profile.region),
  createAttribute("app.seed_index", traceIndex + 1),
  createAttribute("app.is_synthetic_seed", true),
  createAttribute("respan.metadata.custom_identifier", profile.customIdentifier),
  createAttribute(
    "respan.metadata.customer_identifier",
    profile.customerIdentifier,
  ),
  createAttribute("respan.metadata.seed_source", "scripts/send-respan-otel-traces.mjs"),
  ...(profile.seedRunId
    ? [createAttribute("respan.metadata.seed_run_id", profile.seedRunId)]
    : []),
  createAttribute("respan.metadata.customer_tier", profile.customerTier),
  createAttribute("respan.metadata.region", profile.region),
  createAttribute("respan.metadata.is_error_sample", isError),
];

const createSpan = ({
  traceId,
  spanId,
  parentSpanId,
  name,
  kind,
  startTimeMs,
  endTimeMs,
  attributes,
  isError,
}) => {
  const span = {
    traceId,
    spanId,
    name,
    kind,
    startTimeUnixNano: toUnixNano(startTimeMs),
    endTimeUnixNano: toUnixNano(endTimeMs),
    attributes,
    status: isError
      ? {
          code: STATUS_CODE_ERROR,
          message: "Synthetic seed trace marked as failed for dashboard coverage.",
        }
      : { code: STATUS_CODE_OK },
  };

  if (parentSpanId) {
    span.parentSpanId = parentSpanId;
  }

  return span;
};

const getSyntheticCost = ({ promptTokens, completionTokens }) =>
  Number(
    (
      promptTokens * INPUT_TOKEN_COST_PER_TOKEN +
      completionTokens * OUTPUT_TOKEN_COST_PER_TOKEN
    ).toFixed(6),
  );

const createTraceSpans = ({
  profile,
  profileIndex,
  traceIndex,
  threadIndex,
  threadTurnIndex,
  traceCount,
  environment,
  isForceSuccess,
}) => {
  const traceId = getHexId(16);
  const workflowSpanId = getHexId(8);
  const llmSpanId = getHexId(8);
  const toolSpanId = getHexId(8);
  const traceGroupIdentifier = `otel-seed-${profile.workflowName}`;
  const threadIdentifier = `${profile.threadPrefix}-${String(
    threadIndex + 1,
  ).padStart(4, "0")}`;
  const isError =
    !isForceSuccess && (traceIndex + profileIndex) % 13 === 0;
  const latestEndTimeMs = Date.now() - 60_000;
  const traceSpacingMs = 2 * 1_000;
  const startTimeMs =
    latestEndTimeMs -
    (traceCount - traceIndex - 1) * traceSpacingMs -
    profileIndex * 17_000;
  const workflowDurationMs = 2_400 + ((traceIndex + profileIndex) % 8) * 460;
  const toolDurationMs = profile.hasToolSpan
    ? 220 + ((traceIndex + profileIndex) % 5) * 90
    : 0;
  const llmDurationMs = workflowDurationMs - toolDurationMs - 480;
  const promptTokens = 180 + ((traceIndex + 3 * profileIndex) % 9) * 47;
  const completionTokens = 70 + ((traceIndex + profileIndex) % 7) * 31;
  const reasoningTokens =
    profile.provider === "openai" ? 12 + (traceIndex % 5) * 6 : 0;
  const totalTokens = promptTokens + completionTokens + reasoningTokens;
  const isStreaming = traceIndex % 3 === 0;
  const llmLatencySeconds = llmDurationMs / 1_000;
  const tokensPerSecond = Number(
    (completionTokens / llmLatencySeconds).toFixed(2),
  );
  const timeToFirstToken = isStreaming
    ? Number((0.24 + ((traceIndex + profileIndex) % 5) * 0.08).toFixed(2))
    : 0;
  const cost = getSyntheticCost({ promptTokens, completionTokens });
  const turnPrompt =
    `${profile.prompt} Synthetic conversation turn ${threadTurnIndex + 1}.`;
  const turnOutput = isError
    ? "Model call timed out."
    : `${profile.output} Synthetic conversation turn ${threadTurnIndex + 1}.`;
  const commonAttributes = createCommonAttributes({
    profile,
    traceIndex,
    threadIdentifier,
    traceGroupIdentifier,
    environment,
    isError,
  });

  const workflowSpan = createSpan({
    traceId,
    spanId: workflowSpanId,
    name: profile.workflowName,
    kind: SPAN_KIND_INTERNAL,
    startTimeMs,
    endTimeMs: startTimeMs + workflowDurationMs,
    isError,
    attributes: [
      ...commonAttributes,
      createAttribute("traceloop.span.kind", "workflow"),
      createAttribute("traceloop.workflow.name", profile.workflowName),
      createAttribute("traceloop.entity.path", profile.workflowName),
      createAttribute(
        "traceloop.entity.input",
        JSON.stringify({ prompt: turnPrompt, thread_identifier: threadIdentifier }),
      ),
      createAttribute(
        "traceloop.entity.output",
        JSON.stringify({ summary: turnOutput, routed_to_human: isError }),
      ),
      createAttribute("workflow.step_count", profile.hasToolSpan ? 3 : 2),
    ],
  });

  const toolSpan = profile.hasToolSpan
    ? createSpan({
        traceId,
        spanId: toolSpanId,
        parentSpanId: workflowSpanId,
        name: `${profile.workflowName}.lookup_context`,
        kind: SPAN_KIND_CLIENT,
        startTimeMs: startTimeMs + 260,
        endTimeMs: startTimeMs + 260 + toolDurationMs,
        isError: false,
        attributes: [
          ...commonAttributes,
          createAttribute("traceloop.span.kind", "tool"),
          createAttribute(
            "traceloop.entity.path",
            `${profile.workflowName}.lookup_context`,
          ),
          createAttribute("tool.name", "customer_context_lookup"),
          createAttribute("tool.result_count", 3 + (traceIndex % 4)),
          createAttribute("db.system", "postgresql"),
        ],
      })
    : null;

  const llmStartTimeMs = startTimeMs + 420 + toolDurationMs;
  const llmSpan = createSpan({
    traceId,
    spanId: llmSpanId,
    parentSpanId: workflowSpanId,
    name: `${profile.workflowName}.llm_call`,
    kind: SPAN_KIND_CLIENT,
    startTimeMs: llmStartTimeMs,
    endTimeMs: llmStartTimeMs + llmDurationMs,
    isError,
    attributes: [
      ...commonAttributes,
      createAttribute("respan.entity.log_type", "chat"),
      createAttribute("traceloop.entity.path", `${profile.workflowName}.llm_call`),
      createAttribute("traceloop.entity.input", turnPrompt),
      createAttribute("traceloop.entity.output", turnOutput),
      createAttribute("gen_ai.prompt.0.role", "user"),
      createAttribute("gen_ai.prompt.0.content", turnPrompt),
      createAttribute("gen_ai.completion.0.role", "assistant"),
      createAttribute("gen_ai.completion.0.content", turnOutput),
      createAttribute("gen_ai.system", profile.provider),
      createAttribute("gen_ai.request.model", profile.model),
      createAttribute("gen_ai.response.model", profile.model),
      createAttribute(
        "gen_ai.request.temperature",
        0.2 + ((traceIndex + profileIndex) % 4) * 0.1,
      ),
      createAttribute("gen_ai.request.max_tokens", 1_024),
      createAttribute("gen_ai.usage.prompt_tokens", promptTokens),
      createAttribute("gen_ai.usage.completion_tokens", completionTokens),
      createAttribute("prompt_tokens", promptTokens),
      createAttribute("completion_tokens", completionTokens),
      createAttribute("total_request_tokens", totalTokens),
      createAttribute("llm.usage.total_tokens", totalTokens),
      createAttribute("gen_ai.usage.total_tokens", totalTokens),
      createAttribute("llm.usage.reasoning_tokens", reasoningTokens),
      createAttribute("reasoning_tokens", reasoningTokens),
      createAttribute("llm.request.type", "chat"),
      createAttribute("llm.is_streaming", isStreaming),
      createAttribute("stream", isStreaming),
      createAttribute("time_to_first_token", timeToFirstToken),
      createAttribute(
        "llm.openai.chat_completions.streaming_time_to_first_token",
        timeToFirstToken,
      ),
      createAttribute("tokens_per_second", tokensPerSecond),
      createAttribute("latency", llmLatencySeconds),
      createAttribute("cost", cost),
      createAttribute("status_code", isError ? LOG_STATUS_CODE_ERROR : LOG_STATUS_CODE_OK),
    ],
  });

  return [workflowSpan, toolSpan, llmSpan].filter(Boolean);
};

const main = async () => {
  const apiKey = getRequiredEnvironmentValue("RESPAN_API_KEY");
  const endpoint = process.env.RESPAN_OTLP_ENDPOINT || DEFAULT_OTLP_ENDPOINT;
  const traceCount = getPositiveIntegerEnvironmentValue(
    "RESPAN_OTEL_TRACE_COUNT",
    DEFAULT_TRACE_COUNT,
  );
  const threadCount = getPositiveIntegerEnvironmentValue(
    "RESPAN_OTEL_THREAD_COUNT",
    DEFAULT_THREAD_COUNT,
  );
  if (threadCount > traceCount) {
    throw new Error(
      "RESPAN_OTEL_THREAD_COUNT must be less than or equal to RESPAN_OTEL_TRACE_COUNT.",
    );
  }
  const environment = process.env.RESPAN_OTEL_ENVIRONMENT || DEFAULT_ENVIRONMENT;
  const isForceSuccess = getBooleanEnvironmentValue(
    "RESPAN_OTEL_FORCE_SUCCESS",
    false,
  );
  const seedRunId = getOptionalSeedRunId();
  const spans = Array.from({ length: traceCount }, (_, traceIndex) => {
    const threadIndex = traceIndex % threadCount;
    const threadTurnIndex = Math.floor(traceIndex / threadCount);
    const profileIndex = threadIndex % customIdentifierProfiles.length;
    const profile = getProfileForThread(threadIndex, seedRunId);

    return createTraceSpans({
      profile,
      profileIndex,
      traceIndex,
      threadIndex,
      threadTurnIndex,
      traceCount,
      environment,
      isForceSuccess,
    });
  }).flat();

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            createAttribute("service.name", "respan-otel-seed"),
            createAttribute("service.version", "1.0.0"),
            createAttribute("deployment.environment", environment),
          ],
        },
        scopeSpans: [
          {
            scope: {
              name: "scripts/send-respan-otel-traces.mjs",
              version: "1.0.0",
            },
            spans,
          },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Respan OTLP export failed with ${response.status} ${response.statusText}: ${responseText}`,
    );
  }

  const customIdentifierCount = getDistinctStringAttributeCount(
    spans,
    RESPAN_CUSTOM_IDENTIFIER_ATTRIBUTE,
  );
  const sentThreadCount = getDistinctStringAttributeCount(
    spans,
    RESPAN_THREAD_IDENTIFIER_ATTRIBUTE,
  );
  const sentUserCount = getDistinctStringAttributeCount(
    spans,
    RESPAN_CUSTOMER_IDENTIFIER_ATTRIBUTE,
  );

  console.log(
    `Sent synthetic logs to ${endpoint}.\n` +
      `Expected page coverage after ingestion:\n` +
      `  Spans: ${spans.length}\n` +
      `  Traces: ${traceCount}\n` +
      `  Threads: ${sentThreadCount}\n` +
      `  Users: ${sentUserCount}\n` +
      `  Custom ID: ${customIdentifierCount}`,
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
