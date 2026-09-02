---
name: e2e-testing
description: Create and maintain user-flow-oriented Playwright end-to-end tests under /Users/rizwan_respan/work/e2e for the respan-frontend app, organized as one folder per page/feature. Use when Codex needs to add, write, update, run, debug, or maintain e2e/UI tests for a feature or page, or when the user mentions Playwright, end-to-end testing, browser automation, smoke tests, or the shared e2e harness.
---

# E2E testing (Playwright)

Maintain a user-focused Playwright suite for the `respan-frontend` app. All e2e tests live in `/Users/rizwan_respan/work/e2e`, with one folder per page/feature the user works on (`e2e/tests/<feature>/`).

## Golden rules

1. Test real user journeys, not implementation details. Always start from the user's primary goal on the page.
2. Use one folder per page/feature under `e2e/tests/<feature>/`.
3. Do not write trivial or ad-hoc tests, such as "is this button present" or "does the header say X". Removing a button should not require a test.
4. Keep every test isolated, deterministic, and self-cleaning.
5. Never hardcode credentials or secrets in specs, skill files, or chat output; read them from `e2e/.env`.

## Environment

- Base URL: `http://localhost:3001` by default. Use `http://localhost:3000` only when the user explicitly says so, via `PLAYWRIGHT_BASE_URL=http://localhost:3000`.
- The dev server is expected to already be running. The suite does not start it.
- App routes live under `/platform/<page>`, for example `/platform/home`, `/platform/dashboard`, `/platform/prompts`, and `/platform/datasets`. The login screen is `/login`.
- Test account email: `rizwan@respan.ai`.
- Test account password: read it from `e2e/.env` as `E2E_PASSWORD`; do not print or copy the plaintext password into durable files.
- Authentication runs once in `tests/auth.setup.ts` and is reused by every spec via `storageState`. Specs must not log in manually.

## First-time bootstrap

If `e2e/package.json` does not exist yet, scaffold the foundation before writing tests. See [bootstrap.md](bootstrap.md) for the exact file contents and commands. In short:

1. Create `package.json`, `playwright.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `.env`, `tests/helpers/locators.ts`, and `tests/auth.setup.ts`.
2. Install: `cd /Users/rizwan_respan/work/e2e && npm install && npx playwright install chromium`.
3. Confirm the harness works with the smoke test (`tests/smoke/app-loads.spec.ts`) while the dev server runs on 3001.

## Designing tests

Before writing any spec, work out the user story for the page:

1. Identify the one primary goal a user comes to this page to accomplish. Examples: Prompts page -> create and run a prompt; Dashboard -> filter metrics by a time range; Datasets -> upload/import rows and view them.
2. Map the happy path end-to-end exactly as the user experiences it, from entry to the moment they get value.
3. Add only the 1-3 most important secondary flows and failure states whose breakage would actually hurt the user, such as validation errors, empty states, permission gating, or destructive confirmations.
4. Skip cosmetic or trivial checks.

Write a test only if a break would do one of these:

- Block the user's primary goal.
- Cause data loss or show wrong data.
- Break a common secondary flow the user relies on.

If none apply, do not add the test.

### What to test vs skip

- Test: "User creates a prompt, runs it, and sees a model response" (primary goal).
- Test: "Submitting an empty prompt shows a validation message" (key failure state).
- Test: "Filtering the dashboard by last 7 days updates the charts" (primary goal).
- Skip: "The 'New prompt' button is visible" (trivial presence check).
- Skip: "The page title reads 'Prompts'" (cosmetic).

## Workflow to add tests for a page

1. Confirm the route and the primary user goal. If unclear, ask the user, or explore `/Users/rizwan_respan/work/respan-frontend/src/pages/PlatformPages/<Page>` to understand the flow.
2. Create `e2e/tests/<feature>/<feature>.spec.ts`.
3. Rely on the shared `storageState` for auth; do not log in inside the spec.
4. Build the flow with role/text/placeholder/label locators and the shared button helper.
5. Make any created data unique with a timestamp or uuid and clean it up in `afterEach`/`afterAll`.
6. Run the spec locally, remove flakiness, and confirm it passes three runs in a row.

Use `/Users/rizwan_respan/work/respan-frontend` for frontend behavior and `/Users/rizwan_respan/work/respan-backend` for API contracts or cleanup helpers when needed.

## Locator conventions

- Prefer text/placeholder/label locators: `getByText`, `getByPlaceholder`, `getByLabel`, and `getByRole` for standard roles.
- Buttons: this app's `ButtonNew` component exposes its variant class, such as `button-md-default`, as the button's accessible name, so `getByRole("button", { name })` does not match the visible label. Match buttons by text with the shared helper `getButtonByText(page, "Add credits")` from `tests/helpers/locators.ts`.
- Inputs use descriptive placeholders such as `Enter your email address...` and `Enter your password...`.
- Avoid brittle CSS chains, `nth-child`, and XPath. If nothing stable exists, ask the user before adding a `data-testid` to the app.
- Use web-first assertions (`await expect(locator).toBeVisible()`) and rely on Playwright auto-waiting.

## Best practices

- Do not use hard waits (`page.waitForTimeout`). Wait on conditions with `expect(...)` or `locator.waitFor()`.
- Use one user journey per `test`; group related journeys with `test.describe`.
- Keep each test independent and order-agnostic; never share mutable state between tests.
- Clean up entities the test creates; prefer API cleanup when a fast API path exists.
- Prefer asserting on visible UI over `waitForState("networkidle")`; use network waits only when truly needed.
- Keep specs short and readable. Extract reused steps into `tests/helpers/`, not copy-paste.
- For any screenshot assertion, mask dynamic content such as timestamps and generated names, and allow a small pixel tolerance.

## Running

```bash
cd /Users/rizwan_respan/work/e2e
npm test                                             # all tests, chromium, headless
npm run test:headed                                  # visible browser
npm run test:ui                                      # Playwright UI mode
npx playwright test tests/<feature>                  # a single feature
npx playwright show-report                           # open the last HTML report
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm test   # target port 3000 only when asked
```

## Anti-patterns

- Ad-hoc presence or cosmetic assertions.
- Hardcoded credentials or secrets in specs, skill files, or chat output.
- `waitForTimeout`, order-dependent tests, and shared mutable state.
- Assertions on implementation details such as class names or internal component state.
- Leaving created test data behind.

## Maintenance

- When a user flow changes, update the affected spec in the same change. Do not accumulate stale tests.
- Delete specs for flows that no longer exist.
- If a test is flaky, fix the root cause with a better locator or wait. Do not paper over it with sleeps.
