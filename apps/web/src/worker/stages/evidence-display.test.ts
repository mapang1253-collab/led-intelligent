import type { StoredEvidenceLink } from "@reis/data-access";
import { describe, expect, it } from "vitest";
import { groupEvidenceForDisplay } from "./evidence-acquisition.js";

/**
 * Grouping is a display convenience. These tests pin the thing it must never do: lose a caveat by
 * putting figures side by side.
 */

function link(overrides: Partial<StoredEvidenceLink> = {}): StoredEvidenceLink {
  const observation = {
    observation_id: "1",
    measure_id: "registered_population",
    population_th: "รวมทั้งสิ้น",
    geography_level: "SUBDISTRICT" as const,
    area_name_th: "บางปลาสร้อย",
    period_start_year: 2025,
    period_end_year: 2025,
    source_vintage: "2568",
    epistemic_status: "DERIVED",
    reliability: "AUTHORITATIVE",
    completeness: "COMPLETE",
    source_note_th: null,
    value: "11996",
    unit_code: "PERSONS",
    unit_name_th: "คน",
    statistic: "TOTAL",
    measure_name_th: "จำนวนประชากรตามทะเบียนราษฎร",
    source_title_th: "สถิติจำนวนประชากรตามทะเบียนราษฎร",
    attribution_th: "ที่มา: กรมการปกครอง",
    must_not_become_th: "ห้ามใช้แทนจำนวนคนที่อาศัยอยู่จริง",
    ...(overrides.observation ?? {}),
  };
  return {
    observation_id: observation.observation_id,
    requirement_id: "demand.resident_population",
    purpose_th: "ขนาดประชากรในพื้นที่",
    role: "CONTEXTUAL",
    subject_match: "EXACT",
    geography_match: "EXACT",
    temporal_match: "CURRENT",
    property_similarity: "NOT_APPLICABLE",
    purpose_fitness: "FIT_WITH_CAVEAT",
    requested_level: "AREA",
    actual_level: "AREA",
    substitution_reason: null,
    decision_impact: "CONTEXT",
    disclosure_th: "คำอธิบายของตัวเลขนี้",
    ...overrides,
    observation,
  } as StoredEvidenceLink;
}

describe("groupEvidenceForDisplay", () => {
  it("keeps each figure's own disclosure when several sit in one group", () => {
    const groups = groupEvidenceForDisplay([
      link({ disclosure_th: "คำอธิบาย ก" }),
      link({ disclosure_th: "คำอธิบาย ข" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.disclosure_th)).toEqual(["คำอธิบาย ก", "คำอธิบาย ข"]);
  });

  it("separates requirements rather than mixing measures into one list", () => {
    const groups = groupEvidenceForDisplay([
      link(),
      link({
        requirement_id: "demand.household_income_context",
        observation: { measure_name_th: "รายได้เฉลี่ยต่อเดือนของครัวเรือน" },
      } as Partial<StoredEvidenceLink>),
    ]);
    expect(groups.map((group) => group.requirement_id)).toEqual([
      "demand.resident_population",
      "demand.household_income_context",
    ]);
  });

  it("names the containing area when the evidence is a downgrade", () => {
    const [group] = groupEvidenceForDisplay([
      link({
        geography_match: "CONTAINING_AREA",
        observation: { geography_level: "PROVINCE", area_name_th: "ชลบุรี" },
      } as Partial<StoredEvidenceLink>),
    ]);
    expect(group?.geography_note_th).toContain("จังหวัด");
    expect(group?.geography_note_th).toContain("ชลบุรี");
    expect(group?.geography_note_th).toContain("ไม่ใช่ข้อมูลเฉพาะพื้นที่เป้าหมาย");
  });

  it("says plainly when the evidence is at the target's own level", () => {
    const [group] = groupEvidenceForDisplay([link()]);
    expect(group?.geography_note_th).toContain("ตรงระดับพื้นที่เป้าหมาย");
  });

  it("returns nothing for no links", () => {
    expect(groupEvidenceForDisplay([])).toEqual([]);
  });
});
