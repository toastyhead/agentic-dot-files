#!/usr/bin/env node

import { randomBytes } from "node:crypto";

const DEFAULT_GATEWAY_ENDPOINT =
  "https://staging-api.respan.ai/api/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_LOG_WAIT_MS = 20_000;
const LOG_POLL_INTERVAL_MS = 1_000;
const REDACTION_MARKER = "[REDACTED]";

const showHelp = () => {
  console.log(`
Send one synthetic PII request through the Respan gateway and verify that the
provider response and stored gateway log are redacted.

Usage:
  RESPAN_API_KEY=<temporary-key> \\
  node scripts/check-respan-gateway-pii-redaction.mjs

  node scripts/check-respan-gateway-pii-redaction.mjs --api-key-stdin

Optional environment variables:
  RESPAN_GATEWAY_ENDPOINT    Defaults to ${DEFAULT_GATEWAY_ENDPOINT}
  RESPAN_GATEWAY_MODEL       Defaults to ${DEFAULT_MODEL}
  RESPAN_GATEWAY_LOG_WAIT_MS Defaults to ${DEFAULT_LOG_WAIT_MS}
  RESPAN_GATEWAY_RUN_ID      Optional unique run identifier
`);
};

if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

const getRequiredEnvironmentValue = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const readStandardInput = () =>
  new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("").trim()));
    process.stdin.on("error", reject);
  });

const getApiKey = async () => {
  if (!process.argv.includes("--api-key-stdin")) {
    return getRequiredEnvironmentValue("RESPAN_API_KEY");
  }

  const apiKey = await readStandardInput();
  if (!apiKey) {
    throw new Error("API key standard input was empty.");
  }

  return apiKey;
};

const getPositiveIntegerEnvironmentValue = (name, defaultValue) => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
};

const getRunId = () => {
  const configuredRunId = process.env.RESPAN_GATEWAY_RUN_ID?.trim();
  if (configuredRunId) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i.test(configuredRunId)) {
      throw new Error(
        "RESPAN_GATEWAY_RUN_ID must be 2-64 letters, numbers, or hyphens.",
      );
    }
    return configuredRunId;
  }

  return `${Date.now()}-${randomBytes(3).toString("hex")}`;
};

const getGatewayUrl = () => {
  const url = new URL(
    process.env.RESPAN_GATEWAY_ENDPOINT || DEFAULT_GATEWAY_ENDPOINT,
  );

  if (url.protocol !== "https:" || !url.hostname.endsWith("respan.ai")) {
    throw new Error(
      "RESPAN_GATEWAY_ENDPOINT must be an HTTPS endpoint on respan.ai.",
    );
  }

  return url;
};

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getLog = async ({ apiKey, gatewayUrl, logId, waitMs }) => {
  const logUrl = new URL(
    `/api/request-logs/${encodeURIComponent(logId)}/`,
    gatewayUrl.origin,
  );
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    const response = await fetch(logUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status !== 404) {
      throw new Error(`Gateway log lookup failed with HTTP ${response.status}.`);
    }

    await delay(LOG_POLL_INTERVAL_MS);
  }

  throw new Error(`Gateway log was not available within ${waitMs} ms.`);
};

const assertRedacted = ({ label, value, serializedValue }) => {
  if (serializedValue.includes(value)) {
    throw new Error(`${label} remained visible after gateway redaction.`);
  }
};

const main = async () => {
  const apiKey = await getApiKey();
  const gatewayUrl = getGatewayUrl();
  const model = process.env.RESPAN_GATEWAY_MODEL || DEFAULT_MODEL;
  const logWaitMs = getPositiveIntegerEnvironmentValue(
    "RESPAN_GATEWAY_LOG_WAIT_MS",
    DEFAULT_LOG_WAIT_MS,
  );
  const runId = getRunId();
  const syntheticPii = {
    email: `gateway-check-${runId}@example.com`,
    organization: "Northstar Health",
    phone: "415-555-0198",
  };
  const customIdentifier = `pii-gateway-check-${runId}`;

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Repeat the supplied email, organization, and phone exactly, separated by pipes.",
        },
        {
          role: "user",
          content:
            `Email: ${syntheticPii.email}; ` +
            `Organization: ${syntheticPii.organization}; ` +
            `Phone: ${syntheticPii.phone}`,
        },
      ],
      max_tokens: 64,
      temperature: 0,
      respan_params: {
        custom_identifier: customIdentifier,
        metadata: {
          pii_gateway_check: "true",
          pii_gateway_check_run_id: runId,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway request failed with HTTP ${response.status}.`);
  }

  const logId = response.headers.get("x-respan-log-id");
  if (!logId) {
    throw new Error("Gateway response did not include X-Respan-Log-Id.");
  }

  const responseBody = await response.json();
  const serializedResponse = JSON.stringify(responseBody);
  const log = await getLog({ apiKey, gatewayUrl, logId, waitMs: logWaitMs });
  const serializedLog = JSON.stringify(log);

  for (const [label, value] of Object.entries(syntheticPii)) {
    assertRedacted({ label, value, serializedValue: serializedResponse });
    assertRedacted({ label, value, serializedValue: serializedLog });
  }

  if (!serializedResponse.includes(REDACTION_MARKER)) {
    throw new Error("Provider response did not contain the redaction marker.");
  }
  if (!serializedLog.includes(REDACTION_MARKER)) {
    throw new Error("Stored gateway log did not contain the redaction marker.");
  }

  console.log(
    `Gateway PII redaction check passed.\n` +
      `  Endpoint: ${gatewayUrl.origin}\n` +
      `  Model: ${model}\n` +
      `  Run ID: ${runId}\n` +
      `  Log ID: ${logId}\n` +
      `  Provider response redacted: yes\n` +
      `  Stored gateway log redacted: yes`,
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
