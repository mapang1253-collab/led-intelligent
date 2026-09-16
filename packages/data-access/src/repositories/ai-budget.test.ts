import { describe, expect, it } from "vitest";
import { effectiveDailyLimit } from "./ai-budget.js";

/**
 * The reserve is what stops an automated run from taking the project's very last request of the
 * day, leaving nothing for a person trying the app.
 */

describe("effectiveDailyLimit", () => {
  it("holds back the stated share of the daily allowance", () => {
    expect(effectiveDailyLimit({ rpm: 15, tpm: 1, rpd: 1000, dailyReservePercent: 20 })).toBe(800);
    expect(effectiveDailyLimit({ rpm: 15, tpm: 1, rpd: 50, dailyReservePercent: 20 })).toBe(40);
  });

  it("rounds the reserve up, so a small allowance still keeps something back", () => {
    // 20% of 10 is 2; of 7 it is 1.4, which must round up to 2 rather than down to 1.
    expect(effectiveDailyLimit({ rpm: 1, tpm: 1, rpd: 7, dailyReservePercent: 20 })).toBe(5);
  });

  it("never returns a negative ceiling", () => {
    expect(effectiveDailyLimit({ rpm: 1, tpm: 1, rpd: 1, dailyReservePercent: 100 })).toBe(0);
  });
});
