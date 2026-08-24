import { test, expect } from "@playwright/test";

test.describe("app smoke", () => {
  test("authenticated user reaches the platform", async ({ page }) => {
    await page.goto("/platform");
    await expect(page).toHaveURL(/\/platform\//);
  });
});
