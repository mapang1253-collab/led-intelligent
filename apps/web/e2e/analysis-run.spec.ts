import { expect, test } from "@playwright/test";
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

test("choosing a suggested area and starting a run reaches a result", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: th.intake.heading })).toBeVisible();

  // The suggestions are the front door for a reader with no place in mind, so the test comes in
  // through it rather than typing a name the fixture might stop containing.
  const firstSuggestion = page.getByRole("button", { name: /ต\.|แขวง/ }).first();
  await expect(firstSuggestion).toBeVisible();
  // innerText, not textContent: the suggestion stacks the area name, its parent chain and its
  // figure counts, and textContent runs all three together into one unbroken string.
  const chosenArea = (await firstSuggestion.innerText()).split("\n")[0]?.trim() ?? "";
  expect(chosenArea.length).toBeGreaterThan(0);
  await firstSuggestion.click();

  const submit = page.getByRole("button", { name: th.intake.submit });
  await expect(submit).toBeEnabled();
  await submit.click();

  // The run id in the path is the product's only handle on a result; without it there is no way
  // back to this page even by reload.
  await expect(page).toHaveURL(/\/runs\/[^/?#]+/);

  await expect(page.getByRole("heading", { level: 1, name: RESULT_HEADING })).toBeVisible();

  // Whatever the analysis concluded, the area it was asked about has to be on the screen: a result
  // that does not name its subject cannot be checked by the person reading it.
  await expect(page.getByText(chosenArea, { exact: false }).first()).toBeVisible();
});

test("a result URL survives being typed into the address bar", async ({ page }) => {
  // Reload rather than client-side navigation: this is served by the Worker's SPA fallback, and a
  // misconfigured `not_found_handling` turns every shared or reloaded result into a 404 while the
  // app still works perfectly from the front page.
  await page.goto("/");
  await page
    .getByRole("button", { name: /ต\.|แขวง/ })
    .first()
    .click();
  await page.getByRole("button", { name: th.intake.submit }).click();
  await expect(page).toHaveURL(/\/runs\/[^/?#]+/);

  const resultUrl = page.url();
  const response = await page.goto(resultUrl);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: RESULT_HEADING })).toBeVisible();
});
