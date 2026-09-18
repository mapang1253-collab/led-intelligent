import { type Page, expect, test } from "@playwright/test";
import { th } from "@reis/i18n";

/**
 * The path the product exists for: pick a place, start a run, read what came back.
 *
 * It asserts what the screen says rather than what the network did. A run that returns 200 and
 * renders nothing readable has still failed the person in front of it.
 */

/**
 * The heading a finished run lands on. Which of the two depends on whether the analysis reached a
 * final answer or stopped because a stage is not activated — both are correct outcomes, and both
 * mean the run is over, which is what these tests are waiting for.
 */
const RESULT_HEADING = new RegExp(`${th.finalResult.heading}|${th.notActivated.heading}`);

/**
 * How long a finished result is allowed to take.
 *
 * The analysis now runs after the acknowledgement, so the result screen opens on a progress state
 * and becomes a result a few seconds later. docs/performance-and-reliability.md §7 gives a warm
 * analysis p95 <= 30 seconds, so that plus a margin is the honest ceiling to wait — not the
 * default 15, which was only ever long enough because the work used to happen inside the POST.
 */
const RESULT_TIMEOUT = 35_000;

/**
 * Picks a place the way the product now intends: province, then district, then subdistrict.
 *
 * It typed into a search box until that box was removed, and before that it clicked whichever
 * suggestion happened to be first. The cascading lists are the front door now, and they are also
 * the most stable thing to drive: the three selects are always present, and each one's options
 * come from the reference table rather than from a search ranking that can reorder.
 */
async function pickAnArea(page: Page) {
  await page.getByLabel(th.intake.provinceLabel).selectOption({ label: "ชลบุรี" });
  await page.getByLabel(th.intake.districtLabel).selectOption({ label: "เมืองชลบุรี" });
  await page.getByLabel(th.intake.subdistrictLabel).selectOption({ label: "แสนสุข" });
}

test("choosing a suggested area and starting a run reaches a result", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: th.intake.heading })).toBeVisible();

  await pickAnArea(page);
  // The confirmation names the place that was chosen, which is what the result heading must echo.
  const chosenArea = "แสนสุข";

  const submit = page.getByRole("button", { name: th.intake.submit });
  await expect(submit).toBeEnabled();
  await submit.click();

  // The run id in the path is the product's only handle on a result; without it there is no way
  // back to this page even by reload.
  await expect(page).toHaveURL(/\/runs\/[^/?#]+/);

  await expect(page.getByRole("heading", { level: 1, name: RESULT_HEADING })).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });

  // Whatever the analysis concluded, the area it was asked about has to be on the screen: a result
  // that does not name its subject cannot be checked by the person reading it.
  await expect(page.getByText(chosenArea, { exact: false }).first()).toBeVisible();
});

test("a result URL survives being typed into the address bar", async ({ page }) => {
  // Reload rather than client-side navigation: this is served by the Worker's SPA fallback, and a
  // misconfigured `not_found_handling` turns every shared or reloaded result into a 404 while the
  // app still works perfectly from the front page.
  await page.goto("/");
  await pickAnArea(page);
  await page.getByRole("button", { name: th.intake.submit }).click();
  await expect(page).toHaveURL(/\/runs\/[^/?#]+/);

  const resultUrl = page.url();
  const response = await page.goto(resultUrl);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: RESULT_HEADING })).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
});
