import { describe, expect, it } from "vitest";
import {
  comparisonStageRecord,
  conceptStageRecord,
  validationStageRecord,
} from "./analysis-runs.js";

/**
 * A stage that tried and failed is not a stage that was never switched on. The app told a user
 * "ยังไม่เปิดใช้งาน" after a provider outage, which sends them away to wait for a feature when what
 * they should do is press the button again.
 */

describe("concept stage", () => {
  it("succeeds when concepts came back", () => {
    expect(conceptStageRecord({ concepts: [{}], failure_code: null })).toEqual({
      state: "SUCCEEDED",
    });
  });

  it("reports a provider outage as failed, not as not-activated", () => {
    expect(conceptStageRecord({ concepts: [], failure_code: "AI_PROVIDER_BUSY" })).toEqual({
      state: "FAILED",
      reason: "AI_PROVIDER_BUSY",
      retryable: true,
    });
  });

  it("offers a retry only where another attempt could get past the failure", () => {
    // A busy provider, a slow one, and an answer the validator rejected: all worth another run.
    for (const code of ["AI_PROVIDER_BUSY", "AI_TIMEOUT", "AI_OUTPUT_INVALID"]) {
      expect(conceptStageRecord({ concepts: [], failure_code: code }).retryable).toBe(true);
    }
    // A spent allowance, an unconfigured budget and a provider we cannot reach fail identically
    // on a second attempt; saying "try again" would send the reader into the same wall.
    for (const code of ["AI_QUOTA_EXHAUSTED", "AI_BUDGET_NOT_CONFIGURED", "AI_UNAVAILABLE"]) {
      expect(conceptStageRecord({ concepts: [], failure_code: code }).retryable).toBe(false);
    }
  });

  it("reports an exhausted quota and an invalid answer as failures too", () => {
    expect(conceptStageRecord({ concepts: [], failure_code: "AI_QUOTA_EXHAUSTED" }).state).toBe(
      "FAILED",
    );
    expect(conceptStageRecord({ concepts: [], failure_code: "AI_OUTPUT_INVALID" }).state).toBe(
      "FAILED",
    );
  });

  it("never marks a stage that was never switched on as retryable", () => {
    expect(conceptStageRecord({ concepts: [], failure_code: "AI_DISABLED" }).retryable).toBe(
      undefined,
    );
  });

  it("keeps SKIPPED for the states that really are 'not switched on'", () => {
    expect(conceptStageRecord({ concepts: [], failure_code: "AI_DISABLED" }).state).toBe("SKIPPED");
    expect(conceptStageRecord({ concepts: [], failure_code: "NO_EVIDENCE" }).state).toBe("SKIPPED");
    // An absent code means the stage never ran at all.
    expect(conceptStageRecord({ concepts: [], failure_code: null })).toEqual({
      state: "SKIPPED",
      reason: "AI_DISABLED",
    });
  });
});

describe("validation stage", () => {
  it("succeeds when validations came back", () => {
    expect(
      validationStageRecord({ concepts: [{}], validations: [{}], failure_code: null }),
    ).toEqual({ state: "SUCCEEDED" });
  });

  it("blames the missing candidates, not the rule pack, when there are no concepts", () => {
    expect(
      validationStageRecord({ concepts: [], validations: [], failure_code: "AI_PROVIDER_BUSY" }),
    ).toEqual({ state: "SKIPPED", reason: "NO_CANDIDATES" });
  });

  it("blames the pack only when concepts existed and were not screened", () => {
    expect(
      validationStageRecord({ concepts: [{}], validations: [], failure_code: "PACK_NOT_REVIEWED" }),
    ).toEqual({ state: "SKIPPED", reason: "PACK_NOT_REVIEWED" });
  });
});

describe("comparison stage", () => {
  it("succeeds when a final analysis was decided", () => {
    // INSUFFICIENT_EVIDENCE is a decision the stage reached, not a stage that never ran.
    expect(
      comparisonStageRecord({ concepts: [{}], final: { status: "INSUFFICIENT_EVIDENCE" } }),
    ).toEqual({ state: "SUCCEEDED" });
  });

  it("does not claim there were no candidates while candidates are on the screen", () => {
    const record = comparisonStageRecord({ concepts: [{}], final: null });
    expect(record.reason).not.toBe("NO_CANDIDATES");
  });

  it("blames the missing candidates only when there really are none", () => {
    expect(comparisonStageRecord({ concepts: [], final: null })).toEqual({
      state: "SKIPPED",
      reason: "NO_CANDIDATES",
    });
  });
});
