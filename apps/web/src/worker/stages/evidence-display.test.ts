import type { StoredEvidenceLink } from "@reis/data-access";
import type { LinkTarget } from "@reis/evidence-engine";
import { describe, expect, it } from "vitest";
import { groupEvidenceForDisplay } from "./evidence-acquisition.js";

/** The run's target: the place the reader asked about, which a figure's clauses have to name. */
const BANGKOK: LinkTarget = {
  province_name_th: "กรุงเทพมหานคร",
  district_name_th: "พระนคร",
  subdistrict_name_th: "พระบรมมหาราชวัง",
  level: "SUBDISTRICT",
  requested_scope: "AREA",
};

const TARGET: LinkTarget = {
  province_name_th: "ชลบุรี",
  district_name_th: "เมืองชลบุรี",
  subdistrict_name_th: "บางปลาสร้อย",
  level: "SUBDISTRICT",
  requested_scope: "AREA",
};

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
    const groups = groupEvidenceForDisplay(
      [
        link({ observation_id: "a", disclosure_th: "คำอธิบาย ก" }),
        link({ observation_id: "b", disclosure_th: "คำอธิบาย ข" }),
      ],
      TARGET,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.disclosure_th)).toEqual(["คำอธิบาย ก", "คำอธิบาย ข"]);
  });

  it("separates requirements rather than mixing measures into one list", () => {
    const groups = groupEvidenceForDisplay(
      [
        link(),
        link({
          requirement_id: "demand.household_income_context",
          observation: { measure_name_th: "รายได้เฉลี่ยต่อเดือนของครัวเรือน" },
        } as Partial<StoredEvidenceLink>),
      ],
      TARGET,
    );
    // Two questions, two groups; their order is settled by geography, asserted separately below.
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((group) => group.requirement_id))).toEqual(
      new Set(["demand.resident_population", "demand.household_income_context"]),
    );
  });

  it("names the containing area when the evidence is a downgrade", () => {
    const [group] = groupEvidenceForDisplay(
      [
        link({
          geography_match: "CONTAINING_AREA",
          observation: { geography_level: "PROVINCE", area_name_th: "ชลบุรี" },
        } as Partial<StoredEvidenceLink>),
      ],
      TARGET,
    );
    expect(group?.geography_note_th).toContain("จังหวัด");
    expect(group?.geography_note_th).toContain("ชลบุรี");
    expect(group?.geography_note_th).toContain("ไม่ใช่ข้อมูลเฉพาะพื้นที่เป้าหมาย");
  });

  it("says plainly when the evidence is at the target's own level", () => {
    const [group] = groupEvidenceForDisplay([link()], TARGET);
    expect(group?.geography_note_th).toContain("ตรงระดับพื้นที่เป้าหมาย");
  });

  it("returns nothing for no links", () => {
    expect(groupEvidenceForDisplay([], TARGET)).toEqual([]);
  });
});

describe("scope separation", () => {
  it("never puts two areas under one scope caveat", () => {
    const groups = groupEvidenceForDisplay(
      [
        link({ observation_id: "sub" }),
        link({
          observation_id: "prov",
          geography_match: "CONTAINING_AREA",
          observation: { geography_level: "PROVINCE", area_name_th: "ชลบุรี" },
        } as Partial<StoredEvidenceLink>),
      ],
      TARGET,
    );

    // One requirement, two areas, two groups — each with a header true of its own rows.
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.area_label_th)).toEqual(["ต.บางปลาสร้อย", "จ.ชลบุรี"]);
    expect(groups[0]?.geography_note_th).toContain("ตรงระดับพื้นที่เป้าหมาย");
    expect(groups[1]?.geography_note_th).toContain("ไม่ใช่ข้อมูลเฉพาะพื้นที่เป้าหมาย");
  });

  it("reads the target's own area before the area containing it", () => {
    const groups = groupEvidenceForDisplay(
      [
        link({
          observation_id: "prov",
          observation: { geography_level: "PROVINCE", area_name_th: "ชลบุรี" },
        } as Partial<StoredEvidenceLink>),
        link({ observation_id: "sub" }),
      ],
      TARGET,
    );
    expect(groups.map((group) => group.area_label_th)).toEqual(["ต.บางปลาสร้อย", "จ.ชลบุรี"]);
  });

  it("gives every row a key that is unique across areas and periods", () => {
    const groups = groupEvidenceForDisplay(
      [link({ observation_id: "1" }), link({ observation_id: "2" })],
      TARGET,
    );
    const ids = groups.flatMap((group) => group.items.map((item) => item.observation_id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Bangkok naming", () => {
  it("labels a Bangkok group with แขวง and เขต, never ต. or อ.", () => {
    const [group] = groupEvidenceForDisplay(
      [
        link({
          observation: { geography_level: "SUBDISTRICT", area_name_th: "พระบรมมหาราชวัง" },
        } as Partial<StoredEvidenceLink>),
      ],
      BANGKOK,
    );
    expect(group?.area_label_th).toBe("แขวงพระบรมมหาราชวัง");
  });

  it("calls the containing area a เขต, not an อำเภอ", () => {
    const [group] = groupEvidenceForDisplay(
      [
        link({
          geography_match: "CONTAINING_AREA",
          observation: { geography_level: "DISTRICT", area_name_th: "พระนคร" },
        } as Partial<StoredEvidenceLink>),
      ],
      BANGKOK,
    );
    expect(group?.geography_note_th).toContain("ข้อมูลระดับเขต");
    expect(group?.geography_note_th).not.toContain("อำเภอ");
  });
});

describe("no redundant naming", () => {
  it("does not repeat the name when the level and the area are the same", () => {
    const [group] = groupEvidenceForDisplay(
      [
        link({
          geography_match: "CONTAINING_AREA",
          observation: { geography_level: "PROVINCE", area_name_th: "กรุงเทพมหานคร" },
        } as Partial<StoredEvidenceLink>),
      ],
      BANGKOK,
    );
    expect(group?.geography_note_th).toContain("ข้อมูลระดับกรุงเทพมหานคร ครอบคลุม");
    expect(group?.geography_note_th).not.toContain("(กรุงเทพมหานคร)");
  });

  it("keeps the parenthetical where it distinguishes one area from another", () => {
    const [group] = groupEvidenceForDisplay(
      [
        link({
          geography_match: "CONTAINING_AREA",
          observation: { geography_level: "PROVINCE", area_name_th: "ชลบุรี" },
        } as Partial<StoredEvidenceLink>),
      ],
      TARGET,
    );
    expect(group?.geography_note_th).toContain("ข้อมูลระดับจังหวัด (ชลบุรี)");
  });
});
