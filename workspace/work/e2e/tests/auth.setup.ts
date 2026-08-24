import { test as setup, expect } from "@playwright/test";
import { getButtonByText } from "./helpers/locators";

const authFile = "tests/.auth/user.json";
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

setup("authenticate", async ({ page }) => {
  if (!email || !password) {
    throw new Error("Missing E2E_EMAIL / E2E_PASSWORD. Set them in e2e/.env");
  }

  await page.goto("/login");

  await getButtonByText(page, "Continue with Email").click();

  const emailField = page.getByPlaceholder("Enter your email address...");
  await expect(emailField).toBeVisible();
  await emailField.fill(email);
  await getButtonByText(page, "Continue with Email").click();

  const passwordField = page.getByPlaceholder("Enter your password...");
  await expect(passwordField).toBeVisible();
  await passwordField.fill(password);

  await getButtonByText(page, /log\s?in/i).click();

  await page.waitForURL(/\/platform\//, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
