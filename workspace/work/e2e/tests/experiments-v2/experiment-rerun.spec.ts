import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPERIMENTS_PATH = "/platform/experiments-v2-beta";

const openExperimentsList = async (page: Page) => {
  await page.goto(EXPERIMENTS_PATH);
  await expect(page.getByText("Newest Test", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
};

const getExperimentRow = (page: Page, experimentName: string) => {
  const experimentNameLabel = page.getByText(experimentName, { exact: true });
  return page
    .locator("div.flex.caption.text-gray-5.relative.cursor-pointer")
    .filter({ has: experimentNameLabel, hasText: experimentName });
};

const openReplicateAction = async (page: Page, experimentName: string) => {
  const sourceRow = getExperimentRow(page, experimentName);
  await expect(sourceRow).toHaveCount(1);

  const actionsButton = sourceRow.locator('button[data-state="closed"]');
  await expect(actionsButton).toHaveCount(1);
  await actionsButton.click();

  const replicateAction = page.getByRole("menuitem").filter({
    hasText: "Replicate experiment",
  });
  await expect(replicateAction).toBeVisible();
  return replicateAction;
};

const waitForExperimentLogs = async (page: Page) => {
  await expect(page.getByText("Compare", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("Loading traces...", { exact: true }),
  ).toHaveCount(0, { timeout: 15_000 });
};

const getHeaderAggregationValues = async (headerLabel: Locator) =>
  headerLabel.evaluate((label) => {
    const headerCell = label.parentElement?.parentElement;
    if (!headerCell) return [];

    return Array.from(headerCell.children)
      .slice(1)
      .map((child) => child.textContent?.trim() ?? "")
      .filter(Boolean);
  });

test.describe("Experiment rerun and result trust", () => {
  test("submits an editable rerun with the source settings prefilled", async ({
    page,
  }) => {
    await openExperimentsList(page);

    const replicateAction = await openReplicateAction(
      page,
      "Keto Diet Answer Relevance",
    );

    let releaseExperimentDetail: (() => void) | undefined;
    let confirmExperimentDetailRequested: (() => void) | undefined;
    const experimentDetailRelease = new Promise<void>((resolve) => {
      releaseExperimentDetail = resolve;
    });
    const experimentDetailRequested = new Promise<void>((resolve) => {
      confirmExperimentDetailRequested = resolve;
    });
    await page.route("**/api/v2/experiments/*/", async (route) => {
      const requestUrl = new URL(route.request().url());
      const isExperimentDetailRequest =
        route.request().method() === "GET" &&
        /^\/api\/v2\/experiments\/[^/]+\/$/.test(requestUrl.pathname);
      if (isExperimentDetailRequest) {
        confirmExperimentDetailRequested?.();
        await experimentDetailRelease;
      }
      await route.continue();
    });

    await replicateAction.click();

    const rerunDialog = page.getByRole("dialog").filter({
      hasText: "Replicate experiment",
    });
    await expect(rerunDialog).toBeVisible();
    await experimentDetailRequested;
    await expect(
      rerunDialog.getByRole("status", {
        name: "Loading experiment settings",
      }),
    ).toBeVisible();
    await expect(
      rerunDialog.getByText("Keto Dataset", { exact: true }),
    ).toHaveCount(0);

    releaseExperimentDetail?.();
    await expect(
      rerunDialog.getByRole("status", {
        name: "Loading experiment settings",
      }),
    ).toHaveCount(0, { timeout: 15_000 });
    await expect(
      rerunDialog.getByText("Keto Dataset", { exact: true }),
    ).toBeVisible();
    await expect(
      rerunDialog.getByText("Keto Diet Prompt", { exact: true }),
    ).toBeVisible();
    await expect(
      rerunDialog.getByText("Answer relevance", { exact: true }),
    ).toBeVisible();

    const datasetSelector = rerunDialog.getByText("Keto Dataset", {
      exact: true,
    });
    await expect(datasetSelector).toHaveCount(1);
    await datasetSelector.click();

    const datasetSearch = page.getByPlaceholder("Search datasets...", {
      exact: true,
    });
    await expect(datasetSearch).toBeVisible();
    await expect(datasetSearch).toBeEditable();
    await datasetSearch.fill("DEV-10052 traces eval");
    await expect(datasetSearch).toHaveValue("DEV-10052 traces eval");

    await page.keyboard.press("Escape");
    let createRequestBody: Record<string, unknown> | undefined;
    await page.route("**/api/v2/experiments/", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "e2e-rerun-preview" }),
      });
    });

    const createButton = rerunDialog.getByText("Create", { exact: true });
    await expect(createButton).toHaveCount(1);
    await createButton.click();
    await expect(page).toHaveURL(
      /\/platform\/experiments-v2-beta\/e2e-rerun-preview\/logs/,
    );

    expect(createRequestBody).toBeDefined();
    expect(createRequestBody?.dataset_id).toBeTruthy();
    expect(createRequestBody?.workflow).toEqual(expect.any(Array));
    const evaluatorIds = [
      ...((createRequestBody?.evaluator_ids as string[] | undefined) ?? []),
      ...((createRequestBody?.evaluator_workflow_ids as string[] | undefined) ??
        []),
    ];
    expect(evaluatorIds.length).toBeGreaterThan(0);
  });

  test("preserves dataset-output workflow settings in a rerun", async ({
    page,
  }) => {
    await openExperimentsList(page);

    const replicateAction = await openReplicateAction(
      page,
      "DEV-10052 full-trace eval verify (experiment path)",
    );
    await replicateAction.click();

    const rerunDialog = page.getByRole("dialog").filter({
      hasText: "Replicate experiment",
    });
    await expect(rerunDialog).toBeVisible();
    await expect(
      rerunDialog.getByRole("status", {
        name: "Loading experiment settings",
      }),
    ).toHaveCount(0, { timeout: 15_000 });
    await expect(
      rerunDialog.getByText("Dataset outputs", { exact: true }),
    ).toBeVisible();

    let createRequestBody: Record<string, unknown> | undefined;
    await page.route("**/api/v2/experiments/", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "e2e-duplicate-rerun-preview" }),
      });
    });

    await rerunDialog.getByText("Create", { exact: true }).click();
    await expect(page).toHaveURL(
      /\/platform\/experiments-v2-beta\/e2e-duplicate-rerun-preview\/logs/,
    );
    expect(createRequestBody?.workflow).toEqual([
      {
        type: "duplicate",
        config: {
          name: "DEV-10052 passthrough (score existing traces)",
        },
      },
    ]);
  });

  test("puts evaluator results before persisted extracted fields", async ({
    page,
  }) => {
    await openExperimentsList(page);

    const completedExperiment = page.getByText("Newest Test", { exact: true });
    await expect(completedExperiment).toHaveCount(1);
    await completedExperiment.click();
    await expect(page).toHaveURL(/\/platform\/experiments-v2-beta\/[^/]+\/logs/);
    await waitForExperimentLogs(page);

    const relevanceHeader = page.getByRole("button", {
      name: "Relevance",
      exact: true,
    });
    const persistedExtractedHeader = page.getByRole("button", {
      name: "In: prompt_version",
      exact: true,
    });
    await expect(relevanceHeader).toBeVisible();
    await expect(persistedExtractedHeader).toBeVisible();
    await expect(relevanceHeader).toBeInViewport();

    const relevanceBox = await relevanceHeader.boundingBox();
    const extractedBox = await persistedExtractedHeader.boundingBox();
    expect(relevanceBox).not.toBeNull();
    expect(extractedBox).not.toBeNull();
    expect(relevanceBox!.x).toBeLessThan(extractedBox!.x);
  });

  test("does not publish evaluator aggregates while an experiment is running", async ({
    page,
  }) => {
    await openExperimentsList(page);

    const runningRowsWithEvaluators = page
      .locator("div.flex.caption.text-gray-5.relative.cursor-pointer")
      .filter({ hasText: "Running" })
      .filter({ hasText: "Relevance" });
    await expect(runningRowsWithEvaluators.first()).toBeVisible();
    expect(await runningRowsWithEvaluators.count()).toBeGreaterThan(0);
    await runningRowsWithEvaluators.first().click();
    await expect(page).toHaveURL(/\/platform\/experiments-v2-beta\/[^/]+\/logs/);
    await waitForExperimentLogs(page);
    await expect(
      page.getByLabel(
        "Running: This experiment is currently processing.",
        { exact: true },
      ),
    ).toBeVisible();

    const relevanceHeader = page.getByRole("button", {
      name: "Relevance",
      exact: true,
    });
    await expect(relevanceHeader).toBeVisible();
    await expect
      .poll(() => getHeaderAggregationValues(relevanceHeader))
      .toEqual([]);
  });

  test("publishes evaluator aggregates once a completed result is stable", async ({
    page,
  }) => {
    await openExperimentsList(page);

    const completedExperiment = page.getByText(
      "Keto Diet Answer Relevance",
      { exact: true },
    );
    await expect(completedExperiment).toHaveCount(1);
    await completedExperiment.click();
    await expect(page).toHaveURL(/\/platform\/experiments-v2-beta\/[^/]+\/logs/);
    await waitForExperimentLogs(page);
    await expect(
      page.getByLabel(
        "Completed: This experiment completed successfully.",
        { exact: true },
      ),
    ).toBeVisible();

    const answerRelevanceHeader = page.getByRole("button", {
      name: "Answer relevance",
      exact: true,
    });
    const firstExtractedFieldHeader = page.getByRole("button", {
      name: "In: max_net_carbs",
      exact: true,
    });
    const expectedOutputHeader = page.getByRole("button", {
      name: "Expected output",
      exact: true,
    });
    const latencyHeader = page.getByRole("button", {
      name: "Latency",
      exact: true,
    });
    await expect(answerRelevanceHeader).toBeVisible();
    await expect(firstExtractedFieldHeader).toBeVisible();
    await expect(expectedOutputHeader).toBeVisible();
    await expect(latencyHeader).toBeVisible();
    await expect(answerRelevanceHeader).toBeInViewport();
    await expect
      .poll(() => getHeaderAggregationValues(answerRelevanceHeader))
      .not.toEqual([]);

    const evaluatorHeaderBox = await answerRelevanceHeader.boundingBox();
    const extractedFieldHeaderBox = await firstExtractedFieldHeader.boundingBox();
    const expectedOutputHeaderBox = await expectedOutputHeader.boundingBox();
    const latencyHeaderBox = await latencyHeader.boundingBox();
    expect(evaluatorHeaderBox).not.toBeNull();
    expect(extractedFieldHeaderBox).not.toBeNull();
    expect(expectedOutputHeaderBox).not.toBeNull();
    expect(latencyHeaderBox).not.toBeNull();
    expect(evaluatorHeaderBox!.x).toBeGreaterThan(expectedOutputHeaderBox!.x);
    expect(evaluatorHeaderBox!.x).toBeLessThan(latencyHeaderBox!.x);
    expect(evaluatorHeaderBox!.x).toBeLessThan(extractedFieldHeaderBox!.x);
  });
});
