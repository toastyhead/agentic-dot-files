import { expect, test, type Page, type Response } from "@playwright/test";

const PLAYGROUND_STORAGE_KEY = "playgroundExperience";
const PLAYGROUND_API_PATH = "/api/playgrounds/";
const MODEL_NAME = "openrouter/qwen/qwen3.6-35b-a3b";
const SEED_RUN_ID = process.env.PLAYGROUND_E2E_SEED_RUN_ID ?? "";
const SAVED_PROMPT_ID = process.env.PLAYGROUND_E2E_PROMPT_ID ?? "";
const SAVED_PROMPT_NAME = process.env.PLAYGROUND_E2E_PROMPT_NAME ?? "";
const SEEDED_THREAD_ID = `acme-ticket-${SEED_RUN_ID}-0001`;
const SEEDED_PROMPT =
  "Summarize a billing support thread and suggest the next reply. Synthetic conversation turn 3.";

type CreatedPlayground = {
  id: string;
  apiOrigin: string;
  authorization: string;
};

const isPlaygroundCreateResponse = (response: Response) => {
  const url = new URL(response.url());
  return (
    response.request().method() === "POST" &&
    url.pathname === PLAYGROUND_API_PATH
  );
};

const captureCreatedPlayground = async (
  page: Page,
  openPlayground: () => Promise<void>,
): Promise<CreatedPlayground> => {
  const responsePromise = page.waitForResponse(isPlaygroundCreateResponse);
  await openPlayground();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  const responseBody = (await response.json()) as { id?: string };
  expect(responseBody.id).toBeTruthy();

  const authorization = response.request().headers().authorization;
  expect(authorization).toBeTruthy();

  return {
    id: responseBody.id!,
    apiOrigin: new URL(response.url()).origin,
    authorization,
  };
};

const deleteCreatedPlayground = async (
  page: Page,
  createdPlayground: CreatedPlayground | null,
) => {
  if (!createdPlayground) return;

  const response = await page.request.delete(
    `${createdPlayground.apiOrigin}${PLAYGROUND_API_PATH}${createdPlayground.id}/`,
    {
      headers: { Authorization: createdPlayground.authorization },
    },
  );

  expect(response.ok()).toBe(true);
};

const setPlaygroundExperience = async (
  page: Page,
  experience: "legacy" | "new",
) => {
  await page.goto("/platform/home");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: PLAYGROUND_STORAGE_KEY, value: experience },
  );
};

test.describe("Playground experience and cross-feature handoffs", () => {
  test("new users land in New Playground and explicit Legacy choice persists", async ({
    page,
  }) => {
    await page.goto("/platform/home");
    await page.evaluate(
      (key) => window.localStorage.removeItem(key),
      PLAYGROUND_STORAGE_KEY,
    );

    await page.goto("/platform/playground");
    await expect(page).toHaveURL(/\/platform\/playground$/);
    await expect(
      page.getByRole("button", { name: "New", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("New playground", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.getByRole("menuitem").filter({ hasText: "Legacy" }).click();
    await expect(page).toHaveURL(/\/platform\/playground$/);
    await expect(
      page.getByRole("button", { name: "Legacy", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-placeholder="Enter user message..."]'),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Legacy", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-placeholder="Enter user message..."]'),
    ).toBeVisible();

    await page.getByRole("button", { name: "Legacy", exact: true }).click();
    await page.getByRole("menuitem").filter({ hasText: "New" }).click();
    await expect(page).toHaveURL(/\/platform\/new-playground$/);
    await expect(
      page.getByRole("button", { name: "New", exact: true }),
    ).toBeVisible();
  });

  test("model catalog creates and hydrates a New Playground through the API", async ({
    page,
  }) => {
    let createdPlayground: CreatedPlayground | null = null;

    try {
      await setPlaygroundExperience(page, "new");
      await page.goto("/platform/models?model=qwen3.6-35b-a3b");
      await expect(
        page.getByText(MODEL_NAME, { exact: true }).first(),
      ).toBeVisible();

      const openButton = page.locator(
        '[data-attr="models-open-playground-button"]',
      );
      await expect(openButton).toBeVisible();
      createdPlayground = await captureCreatedPlayground(page, () =>
        openButton.click(),
      );

      await expect(page).toHaveURL(
        new RegExp(`/platform/new-playground/${createdPlayground.id}$`),
      );
      await expect(
        page.getByText(`Playground with ${MODEL_NAME}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(MODEL_NAME, { exact: true }).first(),
      ).toBeVisible();
    } finally {
      await deleteCreatedPlayground(page, createdPlayground);
    }
  });

  test("saved prompt creates and hydrates a New Playground through the API", async ({
    page,
  }) => {
    test.skip(
      !SAVED_PROMPT_ID || !SAVED_PROMPT_NAME,
      "PLAYGROUND_E2E_PROMPT_ID and PLAYGROUND_E2E_PROMPT_NAME are required",
    );
    let createdPlayground: CreatedPlayground | null = null;

    try {
      await setPlaygroundExperience(page, "new");
      await page.goto(`/platform/prompts/${SAVED_PROMPT_ID}?view=editor`);
      await expect(
        page.getByText(SAVED_PROMPT_NAME, { exact: true }),
      ).toBeVisible();

      const runButton = page
        .locator("button")
        .filter({ hasText: /^Run$/ })
        .first();
      await expect(runButton).toBeVisible();
      createdPlayground = await captureCreatedPlayground(page, () =>
        runButton.press("p"),
      );

      await expect(page).toHaveURL(
        new RegExp(`/platform/new-playground/${createdPlayground.id}$`),
      );
      await expect(
        page.getByText(`Playground from ${SAVED_PROMPT_NAME}`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("textbox").first()).toContainText(
        "evidence-based ketogenic diet coach",
      );
    } finally {
      await deleteCreatedPlayground(page, createdPlayground);
    }
  });

  test("seeded Thread hydrates its prompt in a New Playground", async ({
    page,
  }) => {
    test.skip(!SEED_RUN_ID, "PLAYGROUND_E2E_SEED_RUN_ID is required");
    let createdPlayground: CreatedPlayground | null = null;

    try {
      await setPlaygroundExperience(page, "new");
      await page.goto(
        `/platform/threads?thread_identifier=${encodeURIComponent(SEEDED_THREAD_ID)}&range=1h&sort_by=-timestamp`,
      );

      const threadRow = page
        .getByText(/Summarize a billing support thread and/)
        .last();
      await expect(threadRow).toBeVisible({ timeout: 30_000 });
      await threadRow.click();
      const metadataTab = page.getByRole("tab", {
        name: "Metadata",
        exact: true,
      });
      await expect(metadataTab).toBeVisible();
      await expect(
        page.getByText(SEEDED_THREAD_ID, { exact: true }).last(),
      ).toBeVisible();

      createdPlayground = await captureCreatedPlayground(page, () =>
        metadataTab.press("p"),
      );

      await expect(page).toHaveURL(
        new RegExp(`/platform/new-playground/${createdPlayground.id}$`),
      );
      await expect(page.getByRole("textbox").nth(1)).toContainText(SEEDED_PROMPT);
      await expect(page.getByRole("textbox").nth(2)).toContainText(
        "Customer issue classified as billing adjustment with medium urgency. Synthetic conversation turn 3.",
      );
    } finally {
      await deleteCreatedPlayground(page, createdPlayground);
    }
  });
});
