import type {
  CandidateSearchRecord,
  LegalValidationResult,
  PotentialUseConcept,
} from "@reis/contracts";
import { describe, expect, it } from "vitest";
import { type FinalStatusInput, decideFinalStatus } from "./final-status.js";
import {
  BASE_DISCLAIMER_TH,
  STATUS_STATEMENTS_TH,
  buildVerificationActions,
} from "./output-policy.js";

/**
 * docs/output-policy.md §10 lists the acceptance tests this policy must pass. These are those
 * tests: the wording is required, not decorative, and the statuses must never overclaim.
 */

function search(overrides: Partial<CandidateSearchRecord> = {}): CandidateSearchRecord {
  return {
    mode: "RECORDED_AI",
    model: "fixture",
    calls_made: 0,
    repair_attempted: false,
    stop_reason: "EVIDENCE_SPACE_COVERED",
    rejected_concepts: [],
    duplicates_merged: 0,
    ...overrides,
  };
}

function concept(id: string, label: string): PotentialUseConcept {
  return {
    schema_version: "1.0.0",
    locale: "th-TH",
    concept_id: id,
    label_th: label,
    description_th: "คำอธิบาย",
    supporting_reason_th: "เหตุผล",
    uncertainty_th: "ความไม่แน่นอน",
    activity_ids: ["activity.residence"],
    unmapped_activities_th: [],
    building_type_th: "อาคารอยู่อาศัย",
    supporting_evidence_ids: [],
    demand_hypotheses: [],
  };
}

function legal(status: LegalValidationResult["status"]): LegalValidationResult {
  return {
    validator_version: "legal-validator@1.0.0",
    pack_id: "th.cba.mr55",
    pack_version: "1.0.0",
    concept_id: "c1",
    status,
    status_reason_th: "เหตุผล",
    outcomes: [],
    coverage: [],
    unresolved_inputs: [],
    approval_required: [],
  };
}

const VERIFICATION = {
  output_scope: "AREA" as const,
  unresolved_legal_inputs: [],
  approvals: [],
  unresolved_applicability: [],
  area_level_measures_th: [],
  unscreened_domains_th: [],
};

function input(overrides: Partial<FinalStatusInput> = {}): FinalStatusInput {
  return {
    analysed_on: "2026-09-16",
    output_scope: "AREA",
    search: search(),
    concepts: [concept("c1", "อาคารอยู่อาศัยรวมให้เช่า")],
    legal: [legal("UNKNOWN")],
    economic_components_available: false,
    verification: VERIFICATION,
    ...overrides,
  };
}

describe("required wording", () => {
  it("carries the base disclaimer verbatim and the policy version", () => {
    const result = decideFinalStatus(input());
    if (result.kind !== "ANALYSIS") throw new Error("expected an analysis");

    expect(result.final.disclaimer_th).toBe(BASE_DISCLAIMER_TH);
    expect(result.final.disclaimer_th).toContain("ไม่ใช่คำรับรองทางกฎหมาย");
    expect(result.final.output_policy_version).toBe("academic-output-v2");
    expect(result.final.locale).toBe("th-TH");
  });

  it("renders the statement that matches the output scope", () => {
    for (const [scope, fragment] of [
      ["AREA", "ระดับพื้นที่"],
      ["PRELIMINARY_PROPERTY", "ทรัพย์เบื้องต้น"],
      ["PROPERTY", "ความแน่นอนไม่เกินกว่าหลักฐาน"],
    ] as const) {
      const result = decideFinalStatus(input({ output_scope: scope }));
      if (result.kind !== "ANALYSIS") throw new Error("expected an analysis");
      expect(result.final.scope_statement_th).toContain(fragment);
    }
  });
});

describe("status decision", () => {
  it("returns INSUFFICIENT_EVIDENCE while no economic component can support a comparison", () => {
    const result = decideFinalStatus(input());
    if (result.kind !== "ANALYSIS") throw new Error("expected an analysis");

    expect(result.final.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.final.status_reason).toBe("NO_SUPPORTED_COMMON_BASIS");
    expect(result.final.missing_basis_th.join(" ")).toContain("องค์ประกอบทางเศรษฐศาสตร์");
  });

  it("never names a leading use, and lists concepts in proposal order", () => {
    const result = decideFinalStatus(
      input({
        concepts: [concept("c1", "แนวคิดหนึ่ง"), concept("c2", "แนวคิดสอง")],
        legal: [legal("UNKNOWN"), legal("PASS")],
      }),
    );
    if (result.kind !== "ANALYSIS") throw new Error("expected an analysis");

    expect(result.final.status).not.toBe("CLEAR_RECOMMENDATION");
    expect(result.final.evaluated_concepts_th).toEqual(["แนวคิดหนึ่ง", "แนวคิดสอง"]);
    // The policy forbids the phrase near a candidate, negated or not: a skimming reader sees it
    // beside a concept name and takes the wrong meaning away.
    for (const statement of Object.values(STATUS_STATEMENTS_TH)) {
      expect(statement).not.toContain("ดีที่สุด");
    }
  });

  it("states an analytical limit without claiming the land has no possible use", () => {
    const result = decideFinalStatus(
      input({ concepts: [], legal: [], search: search({ stop_reason: "NO_DEFENSIBLE_CONCEPTS" }) }),
    );
    if (result.kind !== "ANALYSIS") throw new Error("expected an analysis");

    expect(result.final.status_reason).toBe("NO_DEFENSIBLE_CONCEPTS_GENERATED");
    expect(result.final.status_statement_th).toContain("ไม่ได้หมายความว่าที่ดินนี้ใช้ประโยชน์ไม่ได้");
  });

  it("keeps an AI failure with no concepts operational, not analytical", () => {
    const result = decideFinalStatus(
      input({ concepts: [], legal: [], search: search({ stop_reason: "AI_FAILURE" }) }),
    );
    // A run that never produced a candidate set must not be dressed up as a verdict.
    expect(result.kind).toBe("OPERATIONAL_FAILURE");
  });

  it("refuses to decide at all without a candidate search record", () => {
    expect(decideFinalStatus(input({ search: null })).kind).toBe("OPERATIONAL_FAILURE");
  });
});

describe("verification actions", () => {
  it("always names the missing financial basis as blocking", () => {
    const actions = buildVerificationActions(VERIFICATION);
    const finance = actions.find((action) => action.action_id === "finance.model");
    expect(finance?.priority).toBe("BLOCKING");
    expect(finance?.domain).toBe("MARKET_AND_FINANCE");
    expect(finance?.suggested_source_th.length).toBeGreaterThan(0);
  });

  it("asks for the parcel documents only when the scope is still an area", () => {
    const area = buildVerificationActions(VERIFICATION);
    expect(area.some((action) => action.domain === "TITLE_AND_IDENTITY")).toBe(true);

    const property = buildVerificationActions({ ...VERIFICATION, output_scope: "PROPERTY" });
    expect(property.some((action) => action.domain === "TITLE_AND_IDENTITY")).toBe(false);
  });

  it("traces each action back to the rule or measure that raised it", () => {
    const actions = buildVerificationActions({
      ...VERIFICATION,
      unresolved_legal_inputs: [
        {
          input_id: "road_width",
          label_th: "ความกว้างถนน",
          obtained_from_th: "สำรวจหน้างาน",
          rule_ids: ["mr55.c41.2.2"],
        },
      ],
      approvals: [{ title_th: "ก่อสร้างล้ำที่สาธารณะ", clause_th: "ข้อ 40" }],
      unresolved_applicability: [{ rule_id: "mr55.c42.3", title_th: "ระยะร่นจากแหล่งน้ำขนาดใหญ่" }],
      area_level_measures_th: ["รายได้เฉลี่ยต่อเดือนของครัวเรือน"],
    });

    expect(actions.find((a) => a.action_id === "legal-input.road_width")?.related_ids).toEqual([
      "mr55.c41.2.2",
    ]);
    expect(actions.find((a) => a.action_id === "approval.ข้อ 40")?.priority).toBe("BLOCKING");
    expect(actions.some((a) => a.action_id === "applicability.mr55.c42.3")).toBe(true);
    expect(actions.some((a) => a.target_th.includes("รายได้เฉลี่ยต่อเดือนของครัวเรือน"))).toBe(true);
    // Every action says what completing it could change.
    for (const action of actions) {
      expect(action.could_change_th.length).toBeGreaterThan(0);
      expect(action.why_th.length).toBeGreaterThan(0);
    }
  });

  it("flags a domain the pack does not screen as blocking, never as passed", () => {
    const actions = buildVerificationActions({
      ...VERIFICATION,
      unscreened_domains_th: ["ผังเมืองรวมและการใช้ประโยชน์ที่ดิน"],
    });
    const unscreened = actions.find((action) => action.action_id.startsWith("unscreened."));
    expect(unscreened?.priority).toBe("BLOCKING");
    expect(unscreened?.why_th).toContain("ไม่อาจถือว่าผ่าน");
  });
});
