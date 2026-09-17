import { expect, test } from "@playwright/test";
import { th } from "@reis/i18n";

/**
 * The status screen is the app's own answer to "prove it".
 *
 * Every "this area has no data" the product prints is checkable here, so the screen going blank
 * or erroring is not a cosmetic failure — it removes the only way a reader has of telling an
 * honest gap from a broken query.
 */

test("the status page loads from a typed URL and lists active sources", async ({ page }) => {
  // Typed, not navigated to: this is the Worker's SPA fallback again, on the one route most likely
  // to be opened cold from someone else's message.
  const response = await page.goto("/status");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: th.status.heading })).toBeVisible();

  // The summary line carries the counts the rest of the product's honesty rests on. Waiting for a
  // digit in it also waits out the query, which is slower than the page.
  const summary = page.getByText(/เปิดใช้งาน \d+ จาก \d+ แหล่ง/);
  await expect(summary).toBeVisible();

  const text = (await summary.textContent()) ?? "";
  const active = Number(text.match(/เปิดใช้งาน (\d+) จาก/)?.[1] ?? "0");
  expect(active).toBeGreaterThan(0);

  // Reviewer names are the whole basis on which a reviewed artefact is allowed to execute
  // (docs/implementation-plan.md §4), so an unattributed one is a bug, not a blank field.
  await expect(page.getByText(th.status.reviewedBy).first()).toBeVisible();
});

test("the AI section says which mode the deployment is actually in", async ({ page }) => {
  await page.goto("/status");

  await expect(page.getByRole("heading", { name: th.status.aiHeading })).toBeVisible();

  // A reader must never be left to assume a model produced what a fixture did. Whichever mode is
  // configured, the screen has to name one of them.
  const modes = Object.values(th.status.mode as Record<string, string>);
  expect(modes.length).toBeGreaterThan(0);
  const shown = page.getByText(new RegExp(modes.join("|")));
  await expect(shown.first()).toBeVisible();
});
