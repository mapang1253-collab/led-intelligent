import { describe, expect, it } from "vitest";
import methodFile from "../../../database/reviewed-packs/th-feasibility-assumption-v1.json" with {
  type: "json",
};
import {
  type FeasibilityAssumptions,
  type FeasibilityMethodPack,
  computeFeasibility,
} from "./feasibility.js";

/**
 * Comparing concepts with the reviewed method, which is what the comparison panel does N times.
 *
 * These pin the properties the screen depends on rather than the screen itself: that differentiating
 * the inputs is what makes a comparison, that identical inputs are arithmetic rather than a finding,
 * and that a concept which cannot pay for itself reports no return instead of a bad one.
 */

const METHOD = methodFile as unknown as FeasibilityMethodPack;

/** Shared across concepts, because it is the same piece of land. */
const SHARED = {
  landValueBaht: 5_000_000,
  occupancyRate: 0.8,
  operatingCostRate: 0.3,
};

const concept = (over: Partial<FeasibilityAssumptions>): FeasibilityAssumptions => ({
  ...SHARED,
  floorAreaSqm: 1_000,
  constructionCostPerSqm: 20_000,
  rentPerSqmPerMonth: 300,
  ...over,
});

function yieldOf(a: FeasibilityAssumptions): number {
  const result = computeFeasibility(METHOD, a);
  if (result.outcome !== "COMPUTED" || result.simple_yield_percent === null) {
    throw new Error("expected a computed yield");
  }
  return Number(result.simple_yield_percent);
}

describe("comparing concepts on one set of assumptions", () => {
  it("gives identical concepts identical results", () => {
    // The panel warns when this happens. It is arithmetic, not a finding that the uses are equal.
    expect(yieldOf(concept({}))).toBe(yieldOf(concept({})));
  });

  it("separates concepts once their costs and rents differ", () => {
    const apartment = yieldOf(concept({ rentPerSqmPerMonth: 300 }));
    const warehouse = yieldOf(concept({ constructionCostPerSqm: 8_000, rentPerSqmPerMonth: 150 }));
    expect(apartment).not.toBe(warehouse);
  });

  it("reports no return for a concept that cannot cover its own capital", () => {
    // Rent so low the net income is positive but the payback is enormous is still a number; rent
    // that produces no net income at all is not, and must not be rendered as a very large one.
    const result = computeFeasibility(METHOD, concept({ operatingCostRate: 1 }));
    if (result.outcome !== "COMPUTED") throw new Error("expected a computed result");
    expect(result.payback_years).toBeNull();
    expect(result.simple_yield_percent).toBeNull();
  });

  it("ranks on the assumptions, which is why the panel does not rank", () => {
    // The same two concepts swap places on a rent assumption the reader guessed. A table sorted by
    // return would present that guess as a finding about the land.
    const a = concept({ rentPerSqmPerMonth: 300 });
    const b = concept({ constructionCostPerSqm: 8_000, rentPerSqmPerMonth: 150 });
    expect(yieldOf(a) > yieldOf(b)).toBe(true);

    const bWithBetterRent = { ...b, rentPerSqmPerMonth: 260 };
    expect(yieldOf(a) > yieldOf(bWithBetterRent)).toBe(false);
  });

  it("uses the same reviewed method for every concept", () => {
    const first = computeFeasibility(METHOD, concept({}));
    const second = computeFeasibility(METHOD, concept({ floorAreaSqm: 2_000 }));
    if (first.outcome !== "COMPUTED" || second.outcome !== "COMPUTED") {
      throw new Error("expected computed results");
    }
    expect(first.method_version).toBe(second.method_version);
  });

  it("computes nothing at all from an unreviewed method, for every concept alike", () => {
    const draft = { ...METHOD, lifecycle_state: "DRAFT" as const };
    const result = computeFeasibility(draft, concept({}));
    expect(result).toEqual({
      outcome: "NOT_COMPUTED",
      reason: "FEASIBILITY_METHOD_NOT_REVIEWED",
    });
  });
});
