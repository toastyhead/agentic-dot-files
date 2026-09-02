# E2E bootstrap (first time only)

Run this once, when `/Users/rizwan_respan/work/e2e` has no `package.json`. Create the files below, then install and verify. These files already exist if the suite was bootstrapped previously; treat this as the source of truth if any are missing.

## Files

### `e2e/package.json`

```json
{
  "name": "respan-e2e",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "report": "playwright show-report",
    "codegen": "playwright codegen http://localhost:3001"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.1",
    "@types/node": "^20.14.1",
    "dotenv": "^17.2.2",
    "typescript": "^5.4.5"
  }
}
```

### `e2e/playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const authFile = "tests/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
    },
  ],
});
```

### `e2e/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["tests/**/*.ts", "playwright.config.ts"]
}
```

### `e2e/tests/helpers/locators.ts`

`ButtonNew` exposes its variant class as the accessible name, so buttons must be matched by text. Reuse this helper in every spec.

```ts
import { Page } from "@playwright/test";

/**
 * respan-frontend buttons (ButtonNew) expose their variant class as the
 * accessible name (e.g. "button-md-default"), so getByRole("button", { name })
 * will not match the visible label. Match on visible text content instead.
 * Mirrors respan-frontend/tests/helpers/locators.ts.
 */
export const getButtonByText = (page: Page, text: string | RegExp) =>
  page.locator("button").filter({ hasText: text }).first();
```

### `e2e/tests/auth.setup.ts`

Logs in once with the test account and saves `storageState` so specs start authenticated. Mirrors the `respan-frontend` login flow: "Continue with Email" -> email -> "Continue with Email" -> password -> "Log in".

```ts
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
```

### `e2e/tests/smoke/app-loads.spec.ts`

A foundational smoke test that proves auth and routing work end-to-end. Keep this; it is not a trivial presence check.

```ts
import { test, expect } from "@playwright/test";

test.describe("app smoke", () => {
  test("authenticated user reaches the platform", async ({ page }) => {
    await page.goto("/platform");
    await expect(page).toHaveURL(/\/platform\//);
  });
});
```

### `e2e/.env.example`

```bash
# Base URL for the app under test (defaults to http://localhost:3001).
# Uncomment and change only when explicitly targeting port 3000.
# PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test account credentials
E2E_EMAIL=rizwan@respan.ai
E2E_PASSWORD=your-password-here
```

### `e2e/.env` (gitignored)

```bash
E2E_EMAIL=rizwan@respan.ai
E2E_PASSWORD=your-password-here
```

If `.env` already exists, leave it intact. If `.env` is missing and the password is not available from current local context, ask the user for `E2E_PASSWORD`; do not copy a plaintext password into the skill or chat output.

### `e2e/.gitignore`

```gitignore
node_modules/
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
tests/.auth/
.env
```

## Install and verify

```bash
cd /Users/rizwan_respan/work/e2e
npm install
npx playwright install chromium
# With the dev server running on http://localhost:3001:
npm test
```

A green smoke test confirms login, `storageState`, and routing are wired correctly. New feature specs then reuse this foundation automatically.
