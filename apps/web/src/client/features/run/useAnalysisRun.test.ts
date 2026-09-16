import { describe, expect, it } from "vitest";
import { isTerminal, pollIntervalFor } from "./useAnalysisRun.js";

/** Polling schedule from docs/technology-stack.md §7. */

describe("pollIntervalFor", () => {
  const now = Date.now();

  it("polls every two seconds for the first thirty", () => {
    expect(pollIntervalFor(now, "QUEUED")).toBe(2_000);
    expect(pollIntervalFor(now - 29_000, "RUNNING")).toBe(2_000);
  });

  it("falls back to five seconds after thirty", () => {
    expect(pollIntervalFor(now - 30_000, "RUNNING")).toBe(5_000);
    expect(pollIntervalFor(now - 600_000, "RUNNING")).toBe(5_000);
  });

  it("stops on every terminal state, whatever the elapsed time", () => {
    for (const state of ["COMPLETE", "PARTIAL", "FAILED_FINAL", "EXPIRED", "CANCELLED"] as const) {
      expect(pollIntervalFor(now, state)).toBe(false);
    }
  });

  it("keeps polling while a run may still progress", () => {
    expect(isTerminal("FAILED_RETRYABLE")).toBe(false);
    expect(pollIntervalFor(now, "FAILED_RETRYABLE")).toBe(2_000);
    // No state yet (first fetch in flight) is not terminal either.
    expect(pollIntervalFor(now, undefined)).toBe(2_000);
  });
});
