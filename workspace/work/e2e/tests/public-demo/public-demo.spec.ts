import { expect, test } from "@playwright/test";
import { getButtonByText } from "../helpers/locators";

test.describe("public Logs demo", () => {
  test("a prospect filters realistic commerce logs and inspects an error safely", async ({
    page,
  }) => {
    await page.goto("/");
    const requestLogsRegion = page.getByLabel("Request logs");
    await expect(requestLogsRegion).toHaveAttribute("aria-busy", "true");
    await expect(page).toHaveURL(/\/platform\/requests/);
    await expect(page.getByText("1 - 25 of 180 logs", { exact: true })).toBeVisible();
    await expect(requestLogsRegion).toHaveAttribute("aria-busy", "false");
    await expect(page.getByText("Aisha Rahman", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/demo customer/i)).toHaveCount(0);
    await expect(page.getByText(/read[- ]only/i)).toHaveCount(0);
    const bookDemoCallout = page.getByRole("complementary", {
      name: "Book a demo",
    });
    await expect(bookDemoCallout).toBeVisible();
    await page.getByRole("button", { name: "Close book a demo" }).click();
    await expect(bookDemoCallout).not.toBeVisible();

    await getButtonByText(page, /^Errors$/).click();
    await expect(page).toHaveURL(/active_filter_set_id_logs=demo-errors/);
    await expect(page.getByText("Success", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Failed", { exact: true })).toHaveCount(22);

    await page.getByText("10000", { exact: true }).click();
    await expect(page.getByRole("tab", { name: "Messages" })).toBeVisible();
    await expect(
      page.locator("button").filter({ hasText: /^Span d0001_l$/ }),
    ).toBeVisible();
    await expect(
      page.locator("button").filter({ hasText: /^Run$/ }).first(),
    ).toBeDisabled();
    await expect(
      page.locator("button").filter({ hasText: /^Assign to$/ }),
    ).toBeDisabled();
  });

  test("a prospect follows a customer thread into its trace span tree", async ({
    page,
  }) => {
    await page.goto("/platform/threads");
    await expect(page.getByText("30 threads", { exact: true })).toBeVisible();
    await expect(page.getByText("th_005b8000", { exact: true })).toBeVisible();
    await page.getByText("th_005b8000", { exact: true }).click();
    await expect(
      page.locator("button").filter({ hasText: /^Thread th_005b$/ }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Messages" })).toBeVisible();
    await expect(page.getByText(/Can you confirm the next step/i).first()).toBeVisible();

    await page.getByText("Traces", { exact: true }).first().click();
    await expect(page).toHaveURL(/\/platform\/traces/);
    await expect(page.getByText("60 traces", { exact: true })).toBeVisible();
    await page.getByText("Order support agent", { exact: true }).first().click();
    await expect(
      page.locator("button").filter({ hasText: /^Trace tr_009f$/ }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Span" })).toBeVisible();
    await expect(page.getByText("get_shipment_status", { exact: true })).toBeVisible();
    await expect(page.getByText("Resolve delayed delivery", { exact: true })).toBeVisible();
  });

  test("locked pages and network mutations fail closed", async ({ page }) => {
    const forbiddenRequests: string[] = [];
    const webSockets: string[] = [];
    page.on("request", (request) => {
      if (
        /https?:\/\/(?:[^/]+\.)?(?:api(?:-test)?\.respan\.ai|keywordsai\.co)(?:[/:]|$)/i.test(
          request.url(),
        )
      ) {
        forbiddenRequests.push(request.url());
      }
    });
    page.on("websocket", (webSocket) => webSockets.push(webSocket.url()));

    await page.goto("/platform/requests");
    await expect(page.getByText("1 - 25 of 180 logs", { exact: true })).toBeVisible();

    for (const lockedNavigationLabel of ["Home", "Gateway"]) {
      const lockedNavigation = page.getByText(lockedNavigationLabel, {
        exact: true,
      });
      await expect(lockedNavigation).toHaveCSS("cursor", "not-allowed");
      await lockedNavigation.hover();
      await expect(
        page.getByRole("tooltip", { name: "Coming soon in demo" }),
      ).toBeVisible();
      await lockedNavigation.click({ force: true });
      await expect(page).toHaveURL(/\/platform\/requests/);
      await expect(
        page.getByText("1 - 25 of 180 logs", { exact: true }),
      ).toBeVisible();
    }

    const statuses = await page.evaluate(async () => {
      const [mutation, unknown] = await Promise.all([
        fetch("/__demo_api__/api/saved-filter/demo-errors/", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Changed" }),
        }),
        fetch("/__demo_api__/api/not-implemented/"),
      ]);
      return { mutation: mutation.status, unknown: unknown.status };
    });
    expect(statuses).toEqual({ mutation: 405, unknown: 501 });

    await page.goto("/platform/dashboard");
    await expect(page.getByText("Coming soon in demo", { exact: true })).toBeVisible();
    expect(forbiddenRequests).toEqual([]);
    const demoHost = new URL(page.url()).host;
    expect(
      webSockets.filter((url) => new URL(url).host !== demoHost),
    ).toEqual([]);
  });
});
