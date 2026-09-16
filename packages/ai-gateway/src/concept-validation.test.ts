import { CONCEPT_SCHEMA_VERSION, type OpportunityBrief } from "@reis/contracts";
import { describe, expect, it } from "vitest";
import { isThaiVisibleText, validateConceptResponse } from "./concept-validation.js";

/**
 * These tests are the boundary between "a model said something" and "the system will act on it".
 * Each one pins a way a plausible-looking response must still be refused.
 */

const BRIEF: OpportunityBrief = {
  schema_version: "1.0.0",
  locale: "th-TH",
  target_th: "ต.บางปลาสร้อย อ.เมืองชลบุรี จ.ชลบุรี",
  effective_on: "2026-09-16",
  output_scope: "AREA",
  evidence_cards: [
    {
      evidence_id: "ev1",
      measure_th: "จำนวนประชากรตามทะเบียนราษฎร",
      population_th: "รวมทั้งสิ้น",
      value: "11996",
      unit_th: "คน",
      area_th: "บางปลาสร้อย",
      geography_level_th: "ตำบล",
      period_th: "พ.ศ. 2568",
      caveat_th: "เป็นจำนวนผู้มีชื่อในทะเบียนบ้าน",
    },
  ],
  critical_gaps_th: ["ไม่มีข้อมูลผังเมืองรวม"],
  allowed_activity_ids: ["activity.residence", "activity.retail"],
  allowed_building_types_th: ["อาคารอยู่อาศัย", "ตึกแถว"],
};

function concept(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: CONCEPT_SCHEMA_VERSION,
    locale: "th-TH",
    concept_id: "c1",
    label_th: "อาคารอยู่อาศัยให้เช่า",
    description_th: "พัฒนาเป็นอาคารอยู่อาศัยขนาดเล็กสำหรับผู้อยู่อาศัยในพื้นที่",
    supporting_reason_th: "พื้นที่มีประชากรตามทะเบียนราษฎรรองรับความต้องการที่อยู่อาศัย",
    uncertainty_th: "ยังไม่ทราบข้อกำหนดผังเมืองรวมของพื้นที่นี้",
    activity_ids: ["activity.residence"],
    unmapped_activities_th: [],
    building_type_th: "อาคารอยู่อาศัย",
    supporting_evidence_ids: ["ev1"],
    demand_hypotheses: [
      {
        population_th: "ครัวเรือนที่มีทะเบียนบ้านในตำบล",
        mechanism_th: "ผู้อยู่อาศัยเดิมที่ต้องการเช่าที่อยู่อาศัยเพิ่ม",
        supporting_evidence_ids: ["ev1"],
        counter_evidence_th: "หากอัตราว่างของที่อยู่อาศัยในพื้นที่สูง สมมติฐานนี้จะอ่อนลง",
      },
    ],
    ...overrides,
  };
}

describe("isThaiVisibleText", () => {
  it("accepts Thai carrying an official name or abbreviation", () => {
    expect(isThaiVisibleText("ที่อยู่อาศัยใกล้ท่าเรือแหลมฉบัง (Laem Chabang)")).toBe(true);
    expect(isThaiVisibleText("พื้นที่ EEC มีศักยภาพด้านอุตสาหกรรม")).toBe(true);
  });

  it("rejects English-only text and empty text", () => {
    expect(isThaiVisibleText("Residential rental development")).toBe(false);
    expect(isThaiVisibleText("")).toBe(false);
  });

  it("rejects a Latin sentence with a Thai word sprinkled in", () => {
    expect(isThaiVisibleText("A mixed use development for the ตำบล area nearby")).toBe(false);
  });
});

describe("validateConceptResponse", () => {
  it("accepts a well-formed concept", () => {
    const result = validateConceptResponse([concept()], BRIEF);
    expect(result.ok).toBe(true);
    expect(result.ok && result.concepts).toHaveLength(1);
  });

  it("rejects a response that is not an array, or is empty", () => {
    expect(validateConceptResponse({ concepts: [] }, BRIEF).ok).toBe(false);
    expect(validateConceptResponse([], BRIEF).ok).toBe(false);
  });

  it("rejects a citation to evidence that was never in the brief", () => {
    const result = validateConceptResponse(
      [concept({ supporting_evidence_ids: ["ev1", "ev99"] })],
      BRIEF,
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.reason === "CITATION")).toBe(true);
  });

  it("rejects an invented citation inside a demand hypothesis too", () => {
    const result = validateConceptResponse(
      [
        concept({
          demand_hypotheses: [
            {
              population_th: "นักท่องเที่ยว",
              mechanism_th: "ความต้องการที่พักระยะสั้น",
              supporting_evidence_ids: ["ev_tourism"],
              counter_evidence_th: "หากจำนวนนักท่องเที่ยวลดลง สมมติฐานนี้จะอ่อนลง",
            },
          ],
        }),
      ],
      BRIEF,
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.reason === "CITATION")).toBe(true);
  });

  it("rejects an activity outside the supplied vocabulary rather than snapping it to a near one", () => {
    const result = validateConceptResponse(
      [concept({ activity_ids: ["activity.data_centre"] })],
      BRIEF,
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.reason === "UNKNOWN_ACTIVITY")).toBe(true);
  });

  it("rejects a building type the legal pack cannot screen", () => {
    const result = validateConceptResponse([concept({ building_type_th: "อาคารสูง" })], BRIEF);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.reason === "UNKNOWN_BUILDING_TYPE")).toBe(true);
  });

  it("rejects English visible text even when the structure is perfect", () => {
    const result = validateConceptResponse(
      [concept({ label_th: "Residential rental building" })],
      BRIEF,
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.reason === "LANGUAGE")).toBe(true);
  });

  it("rejects a concept that states no uncertainty", () => {
    const result = validateConceptResponse([concept({ uncertainty_th: "" })], BRIEF);
    expect(result.ok).toBe(false);
  });

  it("rejects a concept with no demand hypothesis", () => {
    expect(validateConceptResponse([concept({ demand_hypotheses: [] })], BRIEF).ok).toBe(false);
  });

  it("rejects a hypothesis with no counter-evidence, so every claim states its own falsifier", () => {
    const result = validateConceptResponse(
      [
        concept({
          demand_hypotheses: [
            {
              population_th: "ครัวเรือนในพื้นที่",
              mechanism_th: "ความต้องการที่อยู่อาศัย",
              supporting_evidence_ids: ["ev1"],
              counter_evidence_th: "",
            },
          ],
        }),
      ],
      BRIEF,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong schema version rather than guessing at compatibility", () => {
    expect(validateConceptResponse([concept({ schema_version: "0.9.0" })], BRIEF).ok).toBe(false);
    expect(validateConceptResponse([concept({ locale: "en-US" })], BRIEF).ok).toBe(false);
  });

  it("merges concepts that differ only in wording, and keeps genuinely different shapes", () => {
    const merged = validateConceptResponse(
      [concept(), concept({ concept_id: "c2", label_th: "ที่พักอาศัยปล่อยเช่า" })],
      BRIEF,
    );
    expect(merged.ok && merged.concepts).toHaveLength(1);
    expect(merged.ok && merged.duplicates_merged).toBe(1);

    const distinct = validateConceptResponse(
      [
        concept(),
        concept({
          concept_id: "c3",
          label_th: "ตึกแถวค้าปลีก",
          activity_ids: ["activity.retail"],
          building_type_th: "ตึกแถว",
        }),
      ],
      BRIEF,
    );
    expect(distinct.ok && distinct.concepts).toHaveLength(2);
  });

  it("keeps good concepts when a sibling is rejected, and records why", () => {
    const result = validateConceptResponse(
      [concept({ concept_id: "bad", supporting_evidence_ids: ["nope"] }), concept()],
      BRIEF,
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.concepts.map((c) => c.concept_id)).toEqual(["c1"]);
    expect(result.issues.some((issue) => issue.reason === "CITATION")).toBe(true);
  });

  it("carries an unmapped activity through instead of dropping it", () => {
    const result = validateConceptResponse(
      [concept({ unmapped_activities_th: ["ศูนย์ข้อมูลคอมพิวเตอร์"] })],
      BRIEF,
    );
    expect(result.ok && result.concepts[0]?.unmapped_activities_th).toEqual(["ศูนย์ข้อมูลคอมพิวเตอร์"]);
  });
});
