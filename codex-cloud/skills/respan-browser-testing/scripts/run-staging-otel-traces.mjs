#!/usr/bin/env node

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SOURCE_SCRIPT = fileURLToPath(
  new URL("../../../scripts/send-respan-otel-traces.mjs", import.meta.url),
);
const STAGING_ENDPOINT = "https://staging-api.respan.ai/api/v2/traces";
const STAGING_ENVIRONMENT = "staging";

const showHelp = () => {
  console.log(`
Send Respan OTEL fixtures through the staging-only wrapper.

Usage:
  RESPAN_API_KEY=<fresh-staging-key> node run-staging-otel-traces.mjs
  node run-staging-otel-traces.mjs --api-key-stdin

Wrapper options:
  --api-key-stdin  Read the API key from standard input without echoing it.
  --validate-only  Validate staging configuration without sending data.

The wrapper pins:
  RESPAN_OTLP_ENDPOINT=${STAGING_ENDPOINT}
  RESPAN_OTEL_ENVIRONMENT=${STAGING_ENVIRONMENT}

Other RESPAN_OTEL_* variables are passed to the source sender unchanged.
`);
};

const readStandardInput = async () => {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8").trim();
};

const assertStagingOverride = (name, expectedValue) => {
  const suppliedValue = process.env[name];

  if (suppliedValue && suppliedValue !== expectedValue) {
    throw new Error(
      `${name} must be ${expectedValue} when using the staging wrapper.`,
    );
  }
};

const main = async () => {
  const wrapperArguments = process.argv.slice(2);
  if (wrapperArguments.includes("--help")) {
    showHelp();
    return;
  }

  await access(SOURCE_SCRIPT);
  assertStagingOverride("RESPAN_OTLP_ENDPOINT", STAGING_ENDPOINT);
  assertStagingOverride("RESPAN_OTEL_ENVIRONMENT", STAGING_ENVIRONMENT);

  if (wrapperArguments.includes("--validate-only")) {
    console.log(
      `Staging configuration is valid: ${STAGING_ENDPOINT} (${STAGING_ENVIRONMENT}).`,
    );
    return;
  }

  const isReadingApiKeyFromStandardInput =
    wrapperArguments.includes("--api-key-stdin");
  if (isReadingApiKeyFromStandardInput && process.env.RESPAN_API_KEY) {
    throw new Error(
      "Provide the API key through either RESPAN_API_KEY or --api-key-stdin, not both.",
    );
  }

  const apiKey = isReadingApiKeyFromStandardInput
    ? await readStandardInput()
    : process.env.RESPAN_API_KEY;
  if (!apiKey) {
    throw new Error("RESPAN_API_KEY is required.");
  }

  const sourceArguments = wrapperArguments.filter(
    (argument) => argument !== "--api-key-stdin",
  );
  const child = spawn(process.execPath, [SOURCE_SCRIPT, ...sourceArguments], {
    env: {
      ...process.env,
      RESPAN_API_KEY: apiKey,
      RESPAN_OTLP_ENDPOINT: STAGING_ENDPOINT,
      RESPAN_OTEL_ENVIRONMENT: STAGING_ENVIRONMENT,
    },
    stdio: "inherit",
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Trace sender stopped by signal ${signal}.`));
        return;
      }

      resolve(code ?? 1);
    });
  });

  process.exitCode = exitCode;
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
