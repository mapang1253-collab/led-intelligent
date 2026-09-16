import type {
  ConceptUnderTest,
  LegalRule,
  LegalRulePack,
  RuleFamily,
  RulePredicate,
} from "@reis/contracts";
import { describe, expect, it } from "vitest";
import { type LegalValidationTarget, packIsExecutable, validateLegal } from "./legal-validator.js";

/**
 * Fixture rules, not real law. The engine is what is under test here; the pack it executes is
 * curated separately and reviewed separately (docs/validation-architecture.md §4).
 */

const SOURCE = {
  issuing_authority_th: "หน่วยงานทดสอบ",
  instrument_th: "กฎทดสอบ",
  clause_th: "ข้อ 1",
  citation_th: "ทดสอบ",
  source_url: "https://example.invalid/rule",
  hierarchy: "MINISTERIAL_REGULATION",
  promulgated_on: "2000-01-01",
  effective_from: "2000-01-01",
  repealed_on: null,
  amended_by_th: [],
} as const;

function rule(overrides: Partial<LegalRule> = {}): LegalRule {
  return {
    rule_id: "rule.test",
    version: "1.0.0",
    title_th: "กฎทดสอบ",
    statement_th: "ข้อความของกฎ",
    family: "DEVELOPMENT_INTENSITY",
    effect: "REQUIREMENT",
    criticality: "CRITICAL",
    source: SOURCE,
    jurisdiction: { scope: "NATIONWIDE", area_codes: [], coverage_note_th: "ทั่วประเทศ" },
    applicability: { activity_ids: [], required_characteristics: [], note_th: "" },
    inputs: [
      { input_id: "plot_area", label_th: "เนื้อที่ดิน", unit: "ตร.ว.", obtained_from_th: "โฉนด" },
    ],
    predicate: { kind: "NUMERIC", input_id: "plot_area", op: "gte", value: "50", unit: "ตร.ว." },
    failure_message_th: "ไม่ผ่าน",
    ...overrides,
  };
}

function pack(rules: LegalRule[], overrides: Partial<LegalRulePack> = {}): LegalRulePack {
  return {
    pack_id: "pack.test",
    version: "1.0.0",
    title_th: "ชุดกฎทดสอบ",
    lifecycle_state: "ACADEMIC_REVIEWED",
    jurisdiction_coverage_th: "ทั่วประเทศ",
    declared_critical_families: ["DEVELOPMENT_INTENSITY"] as RuleFamily[],
    review: {
      reviewers: ["ผู้ตรวจ"],
      reviewed_on: "2026-09-16",
      content_hash: "abc",
      evidence_basis_th: "เอกสารทดสอบ",
      limitations_th: [],
    },
    rules,
    ...overrides,
  };
}

function concept(overrides: Partial<ConceptUnderTest> = {}): ConceptUnderTest {
  return {
    concept_id: "concept.test",
    label_th: "แนวคิดทดสอบ",
    activity_ids: ["activity.residence"],
    characteristics: {},
    inputs: { plot_area: "100" },
    ...overrides,
  };
}

const TARGET: LegalValidationTarget = {
  area_codes: [20, 2001, 200101],
  effective_on: "2026-09-16",
};

describe("pack governance", () => {
  it("refuses to execute a pack that is not ACADEMIC_REVIEWED", () => {
    const draft = pack([rule()], { lifecycle_state: "DRAFT" });
    expect(packIsExecutable(draft)).toBe(false);

    const result = validateLegal(draft, concept(), TARGET);
    // Not a crash and not a pass: a governance state the reader must see.
    expect(result.status).toBe("UNKNOWN");
    expect(result.outcomes).toEqual([]);
    expect(result.status_reason_th).toContain("ยังไม่ผ่านการตรวจทาน");
  });

  it("refuses a reviewed pack that carries no review record", () => {
    expect(packIsExecutable(pack([rule()], { review: null }))).toBe(false);
  });

  it("refuses a RETIRED pack", () => {
    expect(packIsExecutable(pack([rule()], { lifecycle_state: "RETIRED" }))).toBe(false);
  });
});

describe("aggregate status", () => {
  it("passes only when every critical applicable rule passed and every critical family is covered", () => {
    const result = validateLegal(pack([rule()]), concept(), TARGET);
    expect(result.status).toBe("PASS");
    expect(result.outcomes[0]?.status).toBe("PASS");
  });

  it("fails on one verified critical failure", () => {
    const result = validateLegal(pack([rule()]), concept({ inputs: { plot_area: "10" } }), TARGET);
    expect(result.status).toBe("FAIL");
    expect(result.status_reason_th).toContain("1");
  });

  it("never turns a missing input into a failure", () => {
    const result = validateLegal(pack([rule()]), concept({ inputs: {} }), TARGET);
    expect(result.outcomes[0]?.status).toBe("UNKNOWN");
    expect(result.status).toBe("UNKNOWN");
    // The reader is told precisely what to go and find.
    expect(result.unresolved_inputs.map((input) => input.input_id)).toEqual(["plot_area"]);
  });

  it("reports PARTIAL when some rules resolved and others could not", () => {
    const second = rule({
      rule_id: "rule.second",
      inputs: [
        { input_id: "road_width", label_th: "ความกว้างถนน", unit: "ม.", obtained_from_th: "สำรวจ" },
      ],
      predicate: { kind: "NUMERIC", input_id: "road_width", op: "gte", value: "6", unit: "ม." },
    });
    const result = validateLegal(pack([rule(), second]), concept(), TARGET);
    expect(result.status).toBe("PARTIAL");
    expect(result.unresolved_inputs.map((input) => input.input_id)).toEqual(["road_width"]);
  });

  it("does not pass when a declared critical family has no applicable rule", () => {
    // The pack promises to screen land use and then screens nothing: silence is not clearance.
    const result = validateLegal(
      pack([rule()], {
        declared_critical_families: ["DEVELOPMENT_INTENSITY", "LAND_USE_PLANNING"],
      }),
      concept(),
      TARGET,
    );
    expect(result.status).toBe("UNKNOWN");
    expect(result.status_reason_th).toContain("หมวดสำคัญ");
    expect(result.coverage.find((entry) => entry.family === "LAND_USE_PLANNING")?.covered).toBe(
      false,
    );
  });

  it("does not pass when no rule in the pack applies at all", () => {
    const notApplicable = rule({
      applicability: {
        activity_ids: ["activity.other"],
        required_characteristics: [],
        note_th: "",
      },
    });

    // With a critical family declared, the gap is reported as the pack not screening that family.
    const declared = validateLegal(pack([notApplicable]), concept(), TARGET);
    expect(declared.status).toBe("UNKNOWN");
    expect(declared.status_reason_th).toContain("หมวดสำคัญ");

    // With nothing declared critical, the gap is simply that no requirement fired. Either way,
    // silence is never clearance.
    const undeclared = validateLegal(
      pack([notApplicable], { declared_critical_families: [] }),
      concept(),
      TARGET,
    );
    expect(undeclared.status).toBe("UNKNOWN");
    expect(undeclared.status_reason_th).toContain("ไม่มีข้อกำหนด");
  });

  it("separates a gap in the pack from a fact missing about this site", () => {
    const unanswerable = rule({
      rule_id: "rule.unanswerable",
      inputs: [
        { input_id: "road_width", label_th: "ความกว้างถนน", unit: "ม.", obtained_from_th: "สำรวจ" },
      ],
      predicate: { kind: "NUMERIC", input_id: "road_width", op: "gte", value: "6", unit: "ม." },
    });
    const result = validateLegal(pack([rule(), unanswerable]), concept(), TARGET);

    // The family is screened — the pack has rules for it — but one fact about the site is missing.
    expect(result.coverage.find((entry) => entry.family === "DEVELOPMENT_INTENSITY")).toMatchObject(
      {
        covered: true,
        rules_applicable: 2,
        rules_resolved: 1,
      },
    );
    expect(result.status).toBe("PARTIAL");
  });

  it("decides a verified critical failure before an unresolved rule", () => {
    const failing = rule({ rule_id: "rule.failing" });
    const unresolvable = rule({
      rule_id: "rule.unresolvable",
      inputs: [{ input_id: "other", label_th: "อื่น", unit: "ม.", obtained_from_th: "สำรวจ" }],
      predicate: { kind: "NUMERIC", input_id: "other", op: "gte", value: "1", unit: "ม." },
    });
    const result = validateLegal(
      pack([failing, unresolvable]),
      concept({ inputs: { plot_area: "1" } }),
      TARGET,
    );
    expect(result.status).toBe("FAIL");
  });
});

describe("applicability", () => {
  it("drops a rule only when it positively does not apply", () => {
    const result = validateLegal(
      pack([
        rule({
          applicability: {
            activity_ids: [],
            required_characteristics: [{ key: "building_type", value: "ตึกแถว" }],
            note_th: "",
          },
        }),
      ]),
      concept({ characteristics: { building_type: "บ้านเดี่ยว" } }),
      TARGET,
    );
    expect(result.outcomes[0]?.applicability).toBe("NOT_APPLICABLE");
    // NOT_APPLICABLE contributes neither PASS nor FAIL, so nothing is left to conclude from.
    expect(result.status).toBe("UNKNOWN");
  });

  it("keeps a requirement whose applicability the concept does not settle", () => {
    const result = validateLegal(
      pack([
        rule({
          applicability: {
            activity_ids: [],
            required_characteristics: [{ key: "building_type", value: "ตึกแถว" }],
            note_th: "",
          },
        }),
      ]),
      concept({ characteristics: {} }),
      TARGET,
    );
    expect(result.outcomes[0]?.applicability).toBe("UNRESOLVED");
    expect(result.status).toBe("UNKNOWN");
    expect(result.outcomes[0]?.explanation_th).toContain("ยังตัดออกไม่ได้");
  });

  it("does not apply a rule outside its jurisdiction, or one with an unplaceable scope", () => {
    const scoped = validateLegal(
      pack([rule({ jurisdiction: { scope: "PROVINCE", area_codes: [10], coverage_note_th: "" } })]),
      concept(),
      TARGET,
    );
    expect(scoped.outcomes[0]?.applicability).toBe("NOT_APPLICABLE");

    const unplaceable = validateLegal(
      pack([rule({ jurisdiction: { scope: "PROVINCE", area_codes: [], coverage_note_th: "" } })]),
      concept(),
      TARGET,
    );
    expect(unplaceable.outcomes[0]?.applicability).toBe("NOT_APPLICABLE");
  });

  it("does not apply a rule that is not yet in force, or is already repealed", () => {
    const future = validateLegal(
      pack([rule({ source: { ...SOURCE, effective_from: "2030-01-01" } })]),
      concept(),
      TARGET,
    );
    expect(future.outcomes[0]?.explanation_th).toContain("ยังไม่มีผลบังคับ");

    const repealed = validateLegal(
      pack([rule({ source: { ...SOURCE, repealed_on: "2020-01-01" } })]),
      concept(),
      TARGET,
    );
    expect(repealed.outcomes[0]?.applicability).toBe("NOT_APPLICABLE");
  });
});

describe("approval requirements", () => {
  it("records an approval as outstanding, never as passed", () => {
    const approval = rule({
      rule_id: "rule.approval",
      effect: "APPROVAL_REQUIRED",
      predicate: null,
      statement_th: "ต้องได้รับอนุญาตก่อนดำเนินการ",
    });
    const result = validateLegal(pack([approval]), concept(), TARGET);
    expect(result.outcomes[0]?.status).toBe("PARTIAL");
    expect(result.status).toBe("PARTIAL");
    expect(result.approval_required).toHaveLength(1);
    expect(result.status_reason_th).toContain("ขออนุญาต");
  });
});

describe("predicates", () => {
  const ratio: RulePredicate = {
    kind: "RATIO",
    numerator_input_id: "open_space",
    denominator_input_id: "floor_area",
    op: "gte",
    value: "0.30",
  };
  const ratioRule = rule({
    rule_id: "rule.ratio",
    inputs: [
      { input_id: "open_space", label_th: "ที่ว่าง", unit: "ตร.ม.", obtained_from_th: "แบบ" },
      { input_id: "floor_area", label_th: "พื้นที่อาคาร", unit: "ตร.ม.", obtained_from_th: "แบบ" },
    ],
    predicate: ratio,
  });

  it("evaluates a ratio against its threshold and shows the working", () => {
    const passing = validateLegal(
      pack([ratioRule]),
      concept({ inputs: { open_space: "35", floor_area: "100" } }),
      TARGET,
    );
    expect(passing.outcomes[0]?.status).toBe("PASS");
    expect(passing.outcomes[0]?.explanation_th).toContain("35%");

    const failing = validateLegal(
      pack([ratioRule]),
      concept({ inputs: { open_space: "20", floor_area: "100" } }),
      TARGET,
    );
    expect(failing.outcomes[0]?.status).toBe("FAIL");
  });

  it("refuses to decide a ratio with a zero denominator", () => {
    const result = validateLegal(
      pack([ratioRule]),
      concept({ inputs: { open_space: "10", floor_area: "0" } }),
      TARGET,
    );
    expect(result.outcomes[0]?.status).toBe("UNKNOWN");
  });

  it("compares decimals exactly, without floating-point drift", () => {
    const exact = rule({
      rule_id: "rule.exact",
      inputs: [{ input_id: "v", label_th: "ค่า", unit: "ม.", obtained_from_th: "สำรวจ" }],
      predicate: { kind: "NUMERIC", input_id: "v", op: "gte", value: "0.3", unit: "ม." },
    });
    // 0.1 + 0.2 is not 0.3 in binary floating point; a decimal comparison must still pass.
    const result = validateLegal(pack([exact]), concept({ inputs: { v: "0.30" } }), TARGET);
    expect(result.outcomes[0]?.status).toBe("PASS");
  });

  it("checks membership against the allowed set", () => {
    const membership = rule({
      rule_id: "rule.membership",
      inputs: [{ input_id: "zone", label_th: "ผังสี", unit: "-", obtained_from_th: "ผังเมือง" }],
      predicate: { kind: "MEMBERSHIP", input_id: "zone", allowed: ["ย.1", "ย.2"] },
    });
    expect(
      validateLegal(pack([membership]), concept({ inputs: { zone: "ย.1" } }), TARGET).outcomes[0]
        ?.status,
    ).toBe("PASS");
    expect(
      validateLegal(pack([membership]), concept({ inputs: { zone: "อ.1" } }), TARGET).outcomes[0]
        ?.status,
    ).toBe("FAIL");
  });
});

describe("outcome provenance", () => {
  it("carries the exact clause and citation on every outcome", () => {
    const result = validateLegal(pack([rule()]), concept(), TARGET);
    expect(result.outcomes[0]?.source.clause_th).toBe("ข้อ 1");
    expect(result.outcomes[0]?.source.source_url).toBe("https://example.invalid/rule");
    expect(result.outcomes[0]?.rule_version).toBe("1.0.0");
  });
});

describe("aggregate wording", () => {
  it("does not claim nothing was determined when an approval was identified", () => {
    const approval = rule({
      rule_id: "rule.approval",
      effect: "APPROVAL_REQUIRED",
      predicate: null,
      criticality: "NON_CRITICAL",
    });
    const unresolvable = rule({
      rule_id: "rule.unresolvable",
      inputs: [{ input_id: "other", label_th: "อื่น", unit: "ม.", obtained_from_th: "สำรวจ" }],
      predicate: { kind: "NUMERIC", input_id: "other", op: "gte", value: "1", unit: "ม." },
    });
    const result = validateLegal(pack([approval, unresolvable]), concept({ inputs: {} }), TARGET);

    expect(result.status).toBe("UNKNOWN");
    expect(result.status_reason_th).toContain("ต้องขออนุญาต");
    expect(result.approval_required).toHaveLength(1);
  });
});
