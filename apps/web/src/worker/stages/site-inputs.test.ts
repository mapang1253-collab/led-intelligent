import { describe, expect, it } from "vitest";
import { conceptUnderTest, intendedInputs, siteInputs } from "./concept-generation.js";

/**
 * docs/adr/0010 draws one line through this stage: a measurement may answer a rule, and a plan may
 * only decide which rules are asked. These tests hold the two maps apart at the point they are
 * built, before the validator ever sees them.
 */

const CONCEPT = {
  concept_id: "c1",
  label_th: "อาคารอยู่อาศัยรวม",
  activity_ids: ["activity.residence"],
  building_type_th: "อาคารอยู่อาศัยรวม",
  description_th: "",
  supporting_reason_th: "",
  uncertainty_th: "",
  unmapped_activities_th: [],
  demand_hypotheses: [],
} as unknown as Parameters<typeof conceptUnderTest>[0];

describe("siteInputs", () => {
  it("takes the two facts someone standing on the land can measure", () => {
    expect(siteInputs({ road_width: 8, water_body_width: 12 })).toEqual({
      road_width: "8",
      water_body_width: "12",
    });
  });

  it("does not carry the reader's building plan", () => {
    expect(siteInputs({ intended_storey_count: 4, intended_building_height: 11 })).toEqual({});
  });
});

describe("intendedInputs", () => {
  it("maps the stated scale onto the input ids the pack reads", () => {
    expect(intendedInputs({ intended_storey_count: 4, intended_building_height: 11.5 })).toEqual({
      storey_count: "4",
      building_height: "11.5",
    });
  });

  it("treats nothing stated as nothing stated, never as zero", () => {
    expect(intendedInputs({})).toEqual({});
    expect(intendedInputs({ intended_storey_count: 0 })).toEqual({});
  });

  it("does not pick up measurements", () => {
    expect(intendedInputs({ road_width: 8 })).toEqual({});
  });
});

describe("conceptUnderTest", () => {
  it("keeps the plan out of the measured inputs", () => {
    const under = conceptUnderTest(CONCEPT, { road_width: "8" }, {}, { storey_count: "4" });
    expect(under.inputs).toEqual({ road_width: "8" });
    expect(under.intended).toEqual({ storey_count: "4" });
  });

  it("omits the field entirely when the reader stated nothing", () => {
    // `exactOptionalPropertyTypes` is on: an absent plan is an absent key, not an empty object.
    expect(conceptUnderTest(CONCEPT, { road_width: "8" })).not.toHaveProperty("intended");
  });
});
