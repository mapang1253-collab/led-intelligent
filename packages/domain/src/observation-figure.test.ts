import { describe, expect, it } from "vitest";
import { figureTh, isRange } from "./observation-figure.js";

/**
 * The single rule these pin: a spread must never be rendered as one number. Its middle, its lowest
 * and its highest are all figures the publisher did not set.
 */

describe("figureTh", () => {
  it("renders a published single figure as itself", () => {
    expect(figureTh({ value: "8200" })).toBe("8200");
    expect(figureTh({ value: "8200", value_low: null, value_high: null })).toBe("8200");
  });

  it("renders a spread with both of its bounds", () => {
    expect(figureTh({ value: null, value_low: "76600", value_high: "89700" })).toBe("76600–89700");
  });

  it("does not render a spread as its middle or either end", () => {
    const shown = figureTh({ value: null, value_low: "76600", value_high: "89700" });
    expect(shown).not.toBe("83150"); // the mean
    expect(shown).not.toBe("76600");
    expect(shown).not.toBe("89700");
  });

  it("collapses bounds that are equal, because that is one figure", () => {
    expect(figureTh({ value: null, value_low: "8200", value_high: "8200" })).toBe("8200");
  });

  it("returns nothing when neither form is present, rather than zero", () => {
    expect(figureTh({ value: null })).toBeNull();
    expect(figureTh({ value: null, value_low: "100", value_high: null })).toBeNull();
    expect(figureTh({ value: null, value_low: null, value_high: "100" })).toBeNull();
  });
});

describe("isRange", () => {
  it("is true only for a genuine spread", () => {
    expect(isRange({ value: null, value_low: "1", value_high: "2" })).toBe(true);
    expect(isRange({ value: null, value_low: "1", value_high: "1" })).toBe(false);
    expect(isRange({ value: "1" })).toBe(false);
    expect(isRange({ value: null })).toBe(false);
  });
});
