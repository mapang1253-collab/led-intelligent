import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ConceptUnderTest, LegalRulePack } from "@reis/contracts";
import { describe, expect, it } from "vitest";
import { type LegalValidationTarget, validateLegal } from "./legal-validator.js";
import { computePackHash, verifyPackIntegrity } from "./pack-integrity.js";

/**
 * The real pack, executed. These tests exist to catch an encoding error in the rules themselves —
 * a threshold typed wrong, an applicability band that overlaps or leaves a gap — which unit tests
 * of the engine cannot see.
 */

const PACK_PATH = fileURLToPath(
  new URL("../../../database/reviewed-packs/th-cba-mr55-v1.json", import.meta.url),
);
const pack = JSON.parse(readFileSync(PACK_PATH, "utf8")) as LegalRulePack;

const TARGET: LegalValidationTarget = { area_codes: [20], effective_on: "2026-09-16" };

function reviewed(): LegalRulePack {
  // Reviewing is a human act; for tests the record is synthesised so the rules can be exercised.
  // The hash is deliberately not filled in here — integrity is verified in its own tests.
  return {
    ...pack,
    lifecycle_state: "ACADEMIC_REVIEWED",
    review: {
      reviewers: ["ทดสอบ"],
      reviewed_on: "2026-09-16",
      content_hash: "test",
      evidence_basis_th: "ทดสอบ",
      limitations_th: ["ทดสอบ"],
    },
  } as LegalRulePack;
}

function concept(overrides: Partial<ConceptUnderTest> = {}): ConceptUnderTest {
  return {
    concept_id: "c1",
    label_th: "แนวคิดทดสอบ",
    activity_ids: [],
    characteristics: {},
    inputs: {},
    ...overrides,
  };
}

describe("pack shape", () => {
  it("carries a clause, a citation and a source for every rule", () => {
    expect(pack.rules.length).toBeGreaterThan(0);
    for (const rule of pack.rules) {
      expect(rule.source.clause_th).toMatch(/^ข้อ \d+/);
      expect(rule.source.instrument_th).toContain("กฎกระทรวง ฉบับที่ 55");
      expect(rule.source.source_url).toMatch(/^https:\/\//);
      expect(rule.source.effective_from).toBe("2000-08-07");
      expect(rule.statement_th.length).toBeGreaterThan(20);
    }
  });

  it("gives every predicate its inputs, and every input a way to obtain it", () => {
    for (const rule of pack.rules) {
      const declared = new Set(rule.inputs.map((input) => input.input_id));
      for (const input of rule.inputs) {
        expect(input.obtained_from_th.length).toBeGreaterThan(0);
        expect(input.unit.length).toBeGreaterThan(0);
      }
      if (rule.predicate === null) continue;
      const needed =
        rule.predicate.kind === "RATIO"
          ? [rule.predicate.numerator_input_id, rule.predicate.denominator_input_id]
          : [rule.predicate.input_id];
      for (const id of needed) {
        expect(declared, `${rule.rule_id} declares ${id}`).toContain(id);
      }
      for (const condition of rule.applicability.conditions ?? []) {
        const conditionInputs =
          condition.kind === "RATIO"
            ? [condition.numerator_input_id, condition.denominator_input_id]
            : [condition.input_id];
        for (const id of conditionInputs) {
          expect(declared, `${rule.rule_id} declares condition input ${id}`).toContain(id);
        }
      }
    }
  });

  it("has unique rule ids", () => {
    const ids = pack.rules.map((rule) => rule.rule_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("pack integrity", () => {
  it("refuses a pack whose review record is missing", async () => {
    const result = await verifyPackIntegrity({
      ...pack,
      lifecycle_state: "ACADEMIC_REVIEWED",
      review: null,
    } as LegalRulePack);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason_th).toContain("ไม่มีบันทึกการตรวจทาน");
  });

  it("keeps the committed pack self-consistent: if it is signed, the signature still matches", async () => {
    // Guards the file in the repository, whatever state it is in. A signed pack whose rules were
    // edited afterwards fails here rather than silently executing in production.
    if (pack.review === null) {
      expect(pack.lifecycle_state).not.toBe("ACADEMIC_REVIEWED");
      return;
    }
    expect(pack.review.content_hash).toBe(await computePackHash(pack));
    expect(pack.review.reviewers.length).toBeGreaterThan(0);
    expect(pack.review.limitations_th.length).toBeGreaterThan(0);
    expect((await verifyPackIntegrity(pack)).ok).toBe(true);
  });

  it("accepts a correctly signed pack and rejects it once a threshold changes", async () => {
    const hash = await computePackHash(pack);
    const signed = {
      ...reviewed(),
      review: {
        reviewers: ["ผู้ตรวจ"],
        reviewed_on: "2026-09-16",
        content_hash: hash,
        evidence_basis_th: "ทดสอบ",
        limitations_th: ["ทดสอบ"],
      },
    } as LegalRulePack;
    expect((await verifyPackIntegrity(signed)).ok).toBe(true);

    const edited = {
      ...signed,
      rules: signed.rules.map((rule, index) =>
        index === 0 && rule.predicate?.kind === "RATIO"
          ? { ...rule, predicate: { ...rule.predicate, value: "0.05" } }
          : rule,
      ),
    } as LegalRulePack;
    const after = await verifyPackIntegrity(edited);
    expect(after.ok).toBe(false);
    expect(after.ok === false && after.reason_th).toContain("ถูกแก้ไขหลังการตรวจทาน");
  });
});

describe("the road-setback bands of ข้อ 41", () => {
  const rows: [string, string][] = [
    ["5", "mr55.c41.2.1"],
    ["9.99", "mr55.c41.2.1"],
    ["10", "mr55.c41.2.2"],
    ["20", "mr55.c41.2.2"],
    ["20.01", "mr55.c41.2.3"],
    ["30", "mr55.c41.2.3"],
  ];

  it.each(rows)("a %s m road selects exactly one band: %s", (roadWidth, expected) => {
    const result = validateLegal(
      reviewed(),
      concept({
        characteristics: { building_type: "ตึกแถว" },
        inputs: {
          road_width: roadWidth,
          setback_from_road_centreline: "0",
          setback_from_road_boundary: "0",
        },
      }),
      TARGET,
    );
    const bands = result.outcomes.filter(
      (outcome) =>
        outcome.rule_id.startsWith("mr55.c41.2") && outcome.applicability === "APPLICABLE",
    );
    // Exactly one band applies at every width: the clause's ranges must neither overlap nor gap.
    expect(bands.map((band) => band.rule_id)).toEqual([expected]);
  });

  it("applies the narrow-road rule of วรรคหนึ่ง only below six metres", () => {
    const narrow = validateLegal(
      reviewed(),
      concept({ inputs: { road_width: "4", setback_from_road_centreline: "3" } }),
      TARGET,
    );
    expect(narrow.outcomes.find((outcome) => outcome.rule_id === "mr55.c41.1")?.applicability).toBe(
      "APPLICABLE",
    );

    const wide = validateLegal(
      reviewed(),
      concept({ inputs: { road_width: "8", setback_from_road_centreline: "3" } }),
      TARGET,
    );
    expect(wide.outcomes.find((outcome) => outcome.rule_id === "mr55.c41.1")?.applicability).toBe(
      "NOT_APPLICABLE",
    );
  });
});

describe("the open-space rule of ข้อ 33", () => {
  it("requires 30 per cent for a dwelling and 10 per cent for a shophouse", () => {
    const dwelling = validateLegal(
      reviewed(),
      concept({
        characteristics: { building_type: "อาคารอยู่อาศัย" },
        inputs: { open_space_area: "25", largest_floor_plate_area: "100" },
      }),
      TARGET,
    );
    const dwellingOutcome = dwelling.outcomes.find((outcome) => outcome.rule_id === "mr55.c33.1");
    expect(dwellingOutcome?.status).toBe("FAIL");
    expect(dwelling.status).toBe("FAIL");

    const shophouse = validateLegal(
      reviewed(),
      concept({
        characteristics: { building_type: "ตึกแถว" },
        inputs: { open_space_area: "25", largest_floor_plate_area: "100" },
      }),
      TARGET,
    );
    // The same 25 per cent clears the non-residential threshold.
    expect(shophouse.outcomes.find((outcome) => outcome.rule_id === "mr55.c33.2")?.status).toBe(
      "PASS",
    );
    // …and the residential rule must not also fire on it.
    expect(
      shophouse.outcomes.find((outcome) => outcome.rule_id === "mr55.c33.1")?.applicability,
    ).toBe("NOT_APPLICABLE");
  });
});

describe("a concept with nothing measured", () => {
  it("returns UNKNOWN and names every fact that would be needed", () => {
    const result = validateLegal(
      reviewed(),
      concept({ characteristics: { building_type: "อาคารอยู่อาศัย" } }),
      TARGET,
    );
    expect(result.status).toBe("UNKNOWN");
    const ids = result.unresolved_inputs.map((input) => input.input_id);
    expect(ids).toContain("open_space_area");
    expect(ids).toContain("largest_floor_plate_area");
    // Nothing was decided against the applicant for want of a measurement.
    expect(result.outcomes.every((outcome) => outcome.status !== "FAIL")).toBe(true);
  });

  it("holds the public-land approval open rather than passing it", () => {
    const result = validateLegal(reviewed(), concept(), TARGET);
    const approval = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c40");
    expect(approval?.status).toBe("PARTIAL");
    expect(result.approval_required.map((outcome) => outcome.rule_id)).toContain("mr55.c40");
  });
});

describe("what the rules require of a particular piece of land", () => {
  it("turns a proportional clause into a number once the road is measured", () => {
    const result = validateLegal(
      reviewed(),
      concept({
        characteristics: { building_type: "ตึกแถว" },
        inputs: { road_width: "12" },
      }),
      TARGET,
    );
    const band = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c41.2.2");

    // ข้อ 41 วรรคสอง (2) is "one tenth of the width of the public road" — on a 12 m road, 1.20 m.
    expect(band?.applicability).toBe("APPLICABLE");
    expect(band?.status).toBe("UNKNOWN");
    expect(band?.requirement_th).toContain("1.2");
    expect(band?.requirement_th).toContain("เมตร");
  });

  it("states a fixed threshold even when nothing about the design is known", () => {
    const result = validateLegal(
      reviewed(),
      concept({ characteristics: { building_type: "บ้านแถว" } }),
      TARGET,
    );
    const front = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c36.front");
    expect(front?.requirement_th).toContain("3");
    expect(front?.status).toBe("UNKNOWN");
  });

  it("says nothing when the threshold itself still depends on an unmeasured quantity", () => {
    const result = validateLegal(
      reviewed(),
      concept({ characteristics: { building_type: "อาคารอยู่อาศัย" } }),
      TARGET,
    );
    const openSpace = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c33.1");
    // 30 per cent of a floor plate nobody has drawn yet is not a number.
    expect(openSpace?.requirement_th).toBeNull();
  });

  it("works the open-space requirement out once the floor plate is stated", () => {
    const result = validateLegal(
      reviewed(),
      concept({
        characteristics: { building_type: "อาคารอยู่อาศัย" },
        inputs: { largest_floor_plate_area: "200" },
      }),
      TARGET,
    );
    const openSpace = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c33.1");
    expect(openSpace?.requirement_th).toContain("60");
  });

  it("gives a height ceiling from the road geometry alone", () => {
    const result = validateLegal(
      reviewed(),
      concept({ inputs: { distance_to_opposite_road_boundary: "9" } }),
      TARGET,
    );
    const height = result.outcomes.find((outcome) => outcome.rule_id === "mr55.c44");
    // ข้อ 44: no higher than twice the horizontal distance — 18 m here.
    expect(height?.requirement_th).toContain("18");
    expect(height?.requirement_th).toContain("ไม่เกิน");
  });
});
