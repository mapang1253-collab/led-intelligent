import type { StoredEvidenceLink } from "@reis/data-access";
import { describe, expect, it } from "vitest";
import { buildVerificationInputForTest } from "./concept-generation.js";

/**
 * A verification list is only useful if every item is genuinely outstanding. An action telling the
 * reader to obtain something the run already showed them costs the whole list its credibility.
 */

function link(measure: string, match: string, level: string): StoredEvidenceLink {
  return {
    observation_id: `${measure}:${level}`,
    requirement_id: "r",
    purpose_th: "p",
    role: "CONTEXTUAL",
    subject_match: "PROXY",
    geography_match: match,
    temporal_match: "CURRENT",
    property_similarity: "NOT_APPLICABLE",
    purpose_fitness: "CONTEXT_ONLY",
    requested_level: "AREA",
    actual_level: "AREA",
    substitution_reason: null,
    decision_impact: "CONTEXT",
    disclosure_th: "d",
    observation: { measure_name_th: measure, geography_level: level },
  } as unknown as StoredEvidenceLink;
}

describe("area-level evidence actions", () => {
  it("does not ask for a measure the run already has at the target's own level", () => {
    const result = buildVerificationInputForTest(
      [
        link("จำนวนประชากรตามทะเบียนราษฎร", "EXACT", "SUBDISTRICT"),
        link("จำนวนประชากรตามทะเบียนราษฎร", "CONTAINING_AREA", "PROVINCE"),
        link("รายได้เฉลี่ยต่อเดือนของครัวเรือน", "CONTAINING_AREA", "PROVINCE"),
      ],
      "AREA",
    );

    // Population is answered at subdistrict level; only household income is still area-only.
    expect(result.area_level_measures_th).toEqual(["รายได้เฉลี่ยต่อเดือนของครัวเรือน"]);
  });

  it("lists a measure that exists only for a containing area", () => {
    const result = buildVerificationInputForTest(
      [link("รายได้เฉลี่ยต่อเดือนของครัวเรือน", "CONTAINING_AREA", "PROVINCE")],
      "AREA",
    );
    expect(result.area_level_measures_th).toEqual(["รายได้เฉลี่ยต่อเดือนของครัวเรือน"]);
  });

  it("names the domains this pack does not screen, so silence is never read as clearance", () => {
    const result = buildVerificationInputForTest([], "AREA");
    expect(result.unscreened_domains_th.join(" ")).toContain("ผังเมืองรวม");
  });
});
