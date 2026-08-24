import { Page } from "@playwright/test";

/**
 * respan-frontend buttons (ButtonNew) expose their variant class as the
 * accessible name (e.g. "button-md-default"), so getByRole('button', { name })
 * will NOT match the visible label. Match on visible text content instead.
 * Mirrors respan-frontend/tests/helpers/locators.ts.
 */
export const getButtonByText = (page: Page, text: string | RegExp) =>
  page.locator("button").filter({ hasText: text }).first();
