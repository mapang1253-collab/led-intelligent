import { type Page, expect, test } from "@playwright/test";
import { BASE_DISCLAIMER_TH } from "@reis/analysis-engine";
import { th } from "@reis/i18n";

/**
 * docs/output-policy.md §3, checked in a browser.
 *
 * The rule is about placement, and placement is exactly what a unit test cannot see: the string
 * can be present in the component tree and still be behind a closed tab, below the prices, or on
 * a panel the reader never opens. These assertions are worth their runtime because the failure
 * they catch is invisible to every other kind of test in this repository.
 *
 * The topic switcher is two controls at two widths — the rail above `lg`, the tab strip below it
 * — so the rule is checked at both. A disclaimer that survives one and not the other has still
 * been lost for half the readers.
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
 * Search by name was removed, so the cascading lists are both the front door and the most stable
 * thing to drive — the three selects are always present and their options come from the reference
 * table rather than from a ranking that can reorder.
 */
async function pickAnArea(page: Page) {
  // By role, not by label: each level now carries a box that narrows its options, and that box's
  // accessible name names the level too — so a label match would find two controls, not one.
  await page
    .getByRole("combobox", { name: th.intake.provinceLabel })
    .selectOption({ label: "ชลบุรี" });
  await page
    .getByRole("combobox", { name: th.intake.districtLabel })
    .selectOption({ label: "เมืองชลบุรี" });
  await page
    .getByRole("combobox", { name: th.intake.subdistrictLabel })
    .selectOption({ label: "แสนสุข" });
}

/** Enough of the sentence to be this sentence and nothing else, short enough to survive an edit. */
const DISCLAIMER_FRAGMENT = BASE_DISCLAIMER_TH.slice(0, 40);

const TOPICS = [
  th.resultTabs.overview,
  th.resultTabs.prices,
  th.resultTabs.area,
  th.resultTabs.valuation,
  th.resultTabs.concepts,
];

async function startRun(page: Page) {
  await page.goto("/");
  await pickAnArea(page);
  await page.getByRole("button", { name: th.intake.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/runs\/[^/?#]+/);
  await expect(page.getByRole("heading", { level: 1, name: RESULT_HEADING })).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
}

function disclaimerOn(page: Page) {
  return page.getByText(DISCLAIMER_FRAGMENT, { exact: false }).first();
}

test("the academic disclaimer is on screen without opening anything", async ({ page }) => {
  await startRun(page);
  await expect(disclaimerOn(page)).toBeVisible();
});

test("the disclaimer survives every topic, switched from the top menu", async ({ page }) => {
  await startRun(page);

  // The rail this used to drive is now a bar with a panel under it, so each topic costs an open.
  // Still worth driving: it is the path a reader takes when they are on another screen and want
  // one topic of a result, and it reaches the same five views the strip does.
  const bar = page.getByRole("navigation", { name: th.nav.label });
  for (const topic of TOPICS) {
    await bar.getByRole("button", { name: th.nav.resultHeading }).click();
    await page.getByRole("link", { name: topic }).click();
    await expect(disclaimerOn(page)).toBeVisible();
  }
});

test("the disclaimer survives every topic on a phone, switched from the tab strip", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await startRun(page);

  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  const count = await tabs.count();
  expect(count).toBe(TOPICS.length);

  // An unselected tab panel is a collapsed area, which §3 forbids as the disclaimer's only home.
  // If it were inside one, switching tabs would unmount it.
  for (let i = 0; i < count; i += 1) {
    await tabs.nth(i).click();
    await expect(disclaimerOn(page)).toBeVisible();
  }
});

test("the disclaimer sits above the panel the figures are printed in", async ({ page }) => {
  await startRun(page);

  const disclaimerBox = await disclaimerOn(page).boundingBox();
  const panelBox = await page.getByRole("tabpanel").boundingBox();

  expect(disclaimerBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  // §3: above anything a financial figure could be read from. Every figure this app prints is
  // inside the topic panel, so clearing that one box clears all of them at once.
  expect((disclaimerBox?.y ?? 0) + (disclaimerBox?.height ?? 0)).toBeLessThanOrEqual(
    panelBox?.y ?? 0,
  );
});
