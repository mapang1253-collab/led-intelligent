import { describe, expect, it } from "vitest";
import { parseRetryAfter, readBudgetLimits } from "./budgeted-client.js";

/**
 * The budget exists to stop a loop from spending a day's free allowance in a minute. These tests
 * pin the two ways that protection can be lost quietly: limits that were never recorded being
 * treated as "no limit", and a provider's reset instant being misread.
 */

describe("readBudgetLimits", () => {
  it("reads a fully recorded budget", () => {
    const limits = readBudgetLimits({
      GEMINI_RPM_LIMIT: "15",
      GEMINI_TPM_LIMIT: "250000",
      GEMINI_RPD_LIMIT: "1000",
      AI_DAILY_RESERVE_PERCENT: "20",
    });
    expect(limits).toEqual({ rpm: 15, tpm: 250000, rpd: 1000, dailyReservePercent: 20 });
  });

  it("refuses a partially recorded budget rather than assuming the rest", () => {
    // An unrecorded limit is not "unlimited"; it is a budget that cannot be enforced.
    expect(readBudgetLimits({ GEMINI_RPM_LIMIT: "15" })).toBeNull();
    expect(
      readBudgetLimits({
        GEMINI_RPM_LIMIT: "15",
        GEMINI_TPM_LIMIT: "250000",
        GEMINI_RPD_LIMIT: "",
      }),
    ).toBeNull();
    expect(readBudgetLimits({})).toBeNull();
  });

  it("refuses zero or nonsense limits", () => {
    expect(
      readBudgetLimits({ GEMINI_RPM_LIMIT: "0", GEMINI_TPM_LIMIT: "1", GEMINI_RPD_LIMIT: "1" }),
    ).toBeNull();
    expect(
      readBudgetLimits({ GEMINI_RPM_LIMIT: "many", GEMINI_TPM_LIMIT: "1", GEMINI_RPD_LIMIT: "1" }),
    ).toBeNull();
  });

  it("defaults the reserve to 20 per cent when it is not stated", () => {
    const limits = readBudgetLimits({
      GEMINI_RPM_LIMIT: "15",
      GEMINI_TPM_LIMIT: "250000",
      GEMINI_RPD_LIMIT: "1000",
    });
    expect(limits?.dailyReservePercent).toBe(20);
  });
});

describe("parseRetryAfter", () => {
  const now = new Date("2026-09-16T10:00:00.000Z");

  it("reads a delay in seconds", () => {
    expect(parseRetryAfter("30", now)).toBe("2026-09-16T10:00:30.000Z");
  });

  it("reads an absolute date", () => {
    expect(parseRetryAfter("2026-09-16T11:00:00.000Z", now)).toBe("2026-09-16T11:00:00.000Z");
  });

  it("returns nothing when the provider said nothing, rather than guessing a window", () => {
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter("soon", now)).toBeNull();
  });
});
