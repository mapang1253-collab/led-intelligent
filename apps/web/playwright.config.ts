import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * `pnpm test:e2e` was a documented command with no config and no specs behind it, so it failed on
 * sight. These tests cover the one path that has to work — choose an area, start a run, read the
 * result — plus the two rules a screenshot cannot check for you: that the academic disclaimer is
 * never only inside a collapsed area (docs/output-policy.md §3), and that a result URL typed
 * straight into the address bar resolves rather than 404-ing.
 *
 * One browser, because one is what these tests need. Chromium is what the Worker's own runtime is
 * built on, and a second engine here would double the download and the wall clock for no finding
 * the first would miss.
 *
 * Against localhost by default, and `E2E_BASE_URL` points it at the deployed site instead — the
 * same specs are the post-deploy check. The dev server is reused when one is already up, so a
 * running `pnpm dev` is never killed out from under the author.
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const againstDeployment = baseURL !== "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  // A run reaches out to Supabase through Hyperdrive, so these are slower than unit tests by
  // nature. The ceiling is the documented interactive run deadline plus room to report.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // CI has no second chance to observe a flake, so retry there and nowhere else.
  retries: process.env.CI ? 2 : 0,
  // Serial on CI, and on a laptop left to Playwright's own default — which `exactOptionalPropertyTypes`
  // will not let us spell as `undefined`, so the key is omitted instead of set to nothing.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Nothing to start when the target is already on the internet.
  ...(againstDeployment
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:5173",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
