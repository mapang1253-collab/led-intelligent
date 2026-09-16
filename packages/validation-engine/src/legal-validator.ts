import type {
  Applicability,
  ConceptUnderTest,
  FamilyCoverage,
  LegalRule,
  LegalRulePack,
  LegalValidationResult,
  RuleFamily,
  RuleInput,
  RuleOutcome,
  RulePredicate,
  ValidationStatus,
} from "@reis/contracts";
import Decimal from "decimal.js";

/**
 * Legal screening (docs/validation-architecture.md §3, §8).
 *
 * The engine knows nothing about Thai building law. It executes a pack of rules that carry their own
 * applicability, predicate and source, and it enforces the invariants that keep an academic screen
 * from overclaiming:
 *
 *   * Not finding a prohibition is not permission. A rule that cannot be evaluated is UNKNOWN, and
 *     UNKNOWN never becomes PASS — nor FAIL.
 *   * Unresolved applicability cannot delete a requirement. Only a rule positively determined
 *     NOT_APPLICABLE drops out of the result.
 *   * Aggregate PASS needs every critical applicable rule resolved and passed *and* every critical
 *     family the pack declares for this jurisdiction actually covered. A pack that is silent about
 *     zoning cannot produce a PASS that reads as "zoning is fine".
 *   * An approval or discretionary permit is APPROVAL_REQUIRED, never PASS.
 */

export const LEGAL_VALIDATOR_VERSION = "legal-validator@1.0.0";

/** A pack that has not been reviewed does not run. This is the gate, not a warning. */
export function packIsExecutable(pack: LegalRulePack): boolean {
  return pack.lifecycle_state === "ACADEMIC_REVIEWED" && pack.review !== null;
}

export interface LegalValidationTarget {
  /** Administrative codes of the target, coarsest first, for jurisdiction matching. */
  readonly area_codes: readonly number[];
  /** The date the screen is performed against — a rule not yet in force must not be applied. */
  readonly effective_on: string;
}

function ruleIsInForce(rule: LegalRule, on: string): boolean {
  if (rule.source.effective_from > on) {
    return false;
  }
  return rule.source.repealed_on === null || rule.source.repealed_on > on;
}

function jurisdictionCovers(rule: LegalRule, areaCodes: readonly number[]): boolean {
  if (rule.jurisdiction.scope === "NATIONWIDE") {
    return true;
  }
  if (rule.jurisdiction.area_codes.length === 0) {
    // A scoped rule with no codes cannot be placed; it must not be silently applied everywhere.
    return false;
  }
  return rule.jurisdiction.area_codes.some((code) => areaCodes.includes(code));
}

/**
 * Applicability over the concept, kept separate from the rule's own test
 * (docs/validation-architecture.md §8).
 *
 * A characteristic the concept simply does not state is UNRESOLVED, not "does not match" — the
 * difference decides whether a requirement may be dropped.
 */
function applicabilityFor(rule: LegalRule, concept: ConceptUnderTest): Applicability {
  if (
    rule.applicability.activity_ids.length > 0 &&
    !rule.applicability.activity_ids.some((id) => concept.activity_ids.includes(id))
  ) {
    return "NOT_APPLICABLE";
  }

  for (const required of rule.applicability.required_characteristics) {
    const stated = concept.characteristics[required.key];
    if (stated === undefined) {
      return "UNRESOLVED";
    }
    if (stated !== required.value) {
      return "NOT_APPLICABLE";
    }
  }

  const anyOf = rule.applicability.any_characteristics ?? [];
  if (anyOf.length > 0) {
    const matched = anyOf.some((option) => concept.characteristics[option.key] === option.value);
    if (!matched) {
      // Not matching is only decisive once every listed characteristic was actually stated.
      const allStated = anyOf.every((option) => concept.characteristics[option.key] !== undefined);
      return allStated ? "NOT_APPLICABLE" : "UNRESOLVED";
    }
  }

  for (const condition of rule.applicability.conditions ?? []) {
    const evaluation = evaluatePredicate(condition, concept.inputs);
    if (evaluation.status === "UNKNOWN") {
      // The band this clause applies to cannot be determined, so the clause cannot be ruled out.
      return "UNRESOLVED";
    }
    if (evaluation.status === "FAIL") {
      return "NOT_APPLICABLE";
    }
  }

  return "APPLICABLE";
}

function predicateInputs(predicate: RulePredicate): readonly string[] {
  if (predicate.kind === "RATIO") {
    return [predicate.numerator_input_id, predicate.denominator_input_id];
  }
  return [predicate.input_id];
}

function compare(left: Decimal, op: "gte" | "lte" | "gt" | "lt" | "eq", right: Decimal): boolean {
  switch (op) {
    case "gte":
      return left.greaterThanOrEqualTo(right);
    case "lte":
      return left.lessThanOrEqualTo(right);
    case "gt":
      return left.greaterThan(right);
    case "lt":
      return left.lessThan(right);
    case "eq":
      return left.equals(right);
  }
}

const OP_TEXT_TH = {
  gte: "ต้องไม่น้อยกว่า",
  lte: "ต้องไม่เกิน",
  gt: "ต้องมากกว่า",
  lt: "ต้องน้อยกว่า",
  eq: "ต้องเท่ากับ",
} as const;

interface PredicateEvaluation {
  readonly status: Extract<ValidationStatus, "PASS" | "FAIL" | "UNKNOWN">;
  readonly explanation_th: string;
}

function evaluatePredicate(
  predicate: RulePredicate,
  inputs: Readonly<Record<string, string>>,
): PredicateEvaluation {
  if (predicate.kind === "MEMBERSHIP") {
    const value = inputs[predicate.input_id];
    if (value === undefined) {
      return { status: "UNKNOWN", explanation_th: "ยังไม่มีข้อมูลที่จำเป็นสำหรับกฎข้อนี้" };
    }
    return predicate.allowed.includes(value)
      ? { status: "PASS", explanation_th: `ค่าที่ระบุ "${value}" อยู่ในเกณฑ์ที่กฎกำหนด` }
      : { status: "FAIL", explanation_th: `ค่าที่ระบุ "${value}" ไม่อยู่ในเกณฑ์ที่กฎกำหนด` };
  }

  if (predicate.kind === "RATIO") {
    const numerator = inputs[predicate.numerator_input_id];
    const denominator = inputs[predicate.denominator_input_id];
    if (numerator === undefined || denominator === undefined) {
      return { status: "UNKNOWN", explanation_th: "ยังไม่มีข้อมูลที่จำเป็นสำหรับกฎข้อนี้" };
    }
    const bottom = new Decimal(denominator);
    if (bottom.isZero()) {
      // Dividing by a stated zero would manufacture a determination out of a degenerate input.
      return { status: "UNKNOWN", explanation_th: "ตัวหารเป็นศูนย์ จึงคำนวณสัดส่วนไม่ได้" };
    }
    const ratio = new Decimal(numerator).dividedBy(bottom);
    const threshold = new Decimal(predicate.value);
    const passed = compare(ratio, predicate.op, threshold);
    const asPercent = (value: Decimal) => value.times(100).toDecimalPlaces(2).toString();
    return {
      status: passed ? "PASS" : "FAIL",
      explanation_th:
        `สัดส่วนที่คำนวณได้ ${asPercent(ratio)}% ` +
        `${OP_TEXT_TH[predicate.op]} ${asPercent(threshold)}%`,
    };
  }

  const value = inputs[predicate.input_id];
  if (value === undefined) {
    return { status: "UNKNOWN", explanation_th: "ยังไม่มีข้อมูลที่จำเป็นสำหรับกฎข้อนี้" };
  }
  const passed = compare(new Decimal(value), predicate.op, new Decimal(predicate.value));
  return {
    status: passed ? "PASS" : "FAIL",
    explanation_th: `ค่าที่ระบุ ${value} ${predicate.unit} ${OP_TEXT_TH[predicate.op]} ${predicate.value} ${predicate.unit}`,
  };
}

function evaluateRule(
  rule: LegalRule,
  concept: ConceptUnderTest,
  target: LegalValidationTarget,
): RuleOutcome {
  const base = {
    rule_id: rule.rule_id,
    rule_version: rule.version,
    title_th: rule.title_th,
    family: rule.family,
    criticality: rule.criticality,
    source: rule.source,
  } as const;

  if (!ruleIsInForce(rule, target.effective_on)) {
    return {
      ...base,
      applicability: "NOT_APPLICABLE",
      status: "UNKNOWN",
      missing_inputs: [],
      explanation_th: "กฎข้อนี้ยังไม่มีผลบังคับ หรือถูกยกเลิกแล้ว ณ วันที่ตรวจสอบ",
    };
  }
  if (!jurisdictionCovers(rule, target.area_codes)) {
    return {
      ...base,
      applicability: "NOT_APPLICABLE",
      status: "UNKNOWN",
      missing_inputs: [],
      explanation_th: "กฎข้อนี้ไม่ครอบคลุมพื้นที่เป้าหมาย",
    };
  }

  const applicability = applicabilityFor(rule, concept);
  if (applicability === "NOT_APPLICABLE") {
    return {
      ...base,
      applicability,
      status: "UNKNOWN",
      missing_inputs: [],
      explanation_th: "กฎข้อนี้ไม่ใช้กับแนวคิดการใช้ประโยชน์นี้",
    };
  }
  if (applicability === "UNRESOLVED") {
    // The concept does not say enough to decide whether the rule bites. The requirement stays.
    return {
      ...base,
      applicability,
      status: "UNKNOWN",
      missing_inputs: [],
      explanation_th: "ยังระบุไม่ได้ว่ากฎข้อนี้ใช้กับแนวคิดนี้หรือไม่ จึงยังตัดออกไม่ได้",
    };
  }

  if (rule.effect === "APPROVAL_REQUIRED" || rule.predicate === null) {
    // A discretionary approval is a condition to satisfy, never a test that has been passed.
    return {
      ...base,
      applicability,
      status: "PARTIAL",
      missing_inputs: [],
      explanation_th: rule.statement_th,
    };
  }

  const needed = predicateInputs(rule.predicate);
  const missing = rule.inputs.filter(
    (input) => needed.includes(input.input_id) && concept.inputs[input.input_id] === undefined,
  );
  const evaluation = evaluatePredicate(rule.predicate, concept.inputs);
  return {
    ...base,
    applicability,
    status: evaluation.status,
    missing_inputs: missing,
    explanation_th: evaluation.explanation_th,
  };
}

function coverageFor(
  pack: LegalRulePack,
  outcomes: readonly RuleOutcome[],
): readonly FamilyCoverage[] {
  const families = new Set<RuleFamily>([
    ...pack.declared_critical_families,
    ...outcomes.map((outcome) => outcome.family),
  ]);

  return [...families].map((family) => {
    const inFamily = outcomes.filter(
      (outcome) => outcome.family === family && outcome.applicability === "APPLICABLE",
    );
    const resolved = inFamily.filter((outcome) => outcome.status !== "UNKNOWN");
    const declaredCritical = pack.declared_critical_families.includes(family);
    return {
      family,
      declared_critical: declaredCritical,
      rules_applicable: inFamily.length,
      rules_resolved: resolved.length,
      // Coverage asks whether the pack screens this family at all — not whether those rules could
      // be resolved. The two are separate PASS conditions (docs/validation-architecture.md §3), and
      // merging them would report an unanswerable rule as a gap in the pack rather than as a
      // missing fact about this site.
      covered: inFamily.length > 0,
    };
  });
}

/**
 * Runs one pack against one concept.
 *
 * Returns UNKNOWN rather than throwing when the pack may not execute: an unreviewed pack is a
 * governance state the reader should see, not a crash.
 */
export function validateLegal(
  pack: LegalRulePack,
  concept: ConceptUnderTest,
  target: LegalValidationTarget,
): LegalValidationResult {
  const base = {
    validator_version: LEGAL_VALIDATOR_VERSION,
    pack_id: pack.pack_id,
    pack_version: pack.version,
    concept_id: concept.concept_id,
  } as const;

  if (!packIsExecutable(pack)) {
    return {
      ...base,
      status: "UNKNOWN",
      status_reason_th: "ชุดกฎนี้ยังไม่ผ่านการตรวจทานเชิงวิชาการ จึงยังไม่ถูกนำมาใช้ตรวจสอบ",
      outcomes: [],
      coverage: [],
      unresolved_inputs: [],
      approval_required: [],
    };
  }

  const outcomes = pack.rules.map((rule) => evaluateRule(rule, concept, target));
  const coverage = coverageFor(pack, outcomes);

  const applicable = outcomes.filter((outcome) => outcome.applicability === "APPLICABLE");
  const unresolvedApplicability = outcomes.filter(
    (outcome) => outcome.applicability === "UNRESOLVED",
  );
  const criticalApplicable = applicable.filter((outcome) => outcome.criticality === "CRITICAL");
  const criticalFailures = criticalApplicable.filter((outcome) => outcome.status === "FAIL");
  const criticalUnresolved = criticalApplicable.filter((outcome) => outcome.status === "UNKNOWN");
  const approvalRequired = applicable.filter((outcome) => outcome.status === "PARTIAL");
  const uncoveredCriticalFamilies = coverage.filter(
    (entry) => entry.declared_critical && !entry.covered,
  );

  const unresolvedInputs = dedupeInputs(applicable.flatMap((outcome) => outcome.missing_inputs));

  const { status, status_reason_th } = aggregate({
    criticalFailureCount: criticalFailures.length,
    criticalUnresolvedCount: criticalUnresolved.length,
    unresolvedApplicabilityCount: unresolvedApplicability.length,
    uncoveredCriticalFamilyCount: uncoveredCriticalFamilies.length,
    approvalRequiredCount: approvalRequired.length,
    resolvedCount: applicable.filter((outcome) => outcome.status === "PASS").length,
  });

  return {
    ...base,
    status,
    status_reason_th,
    outcomes,
    coverage,
    unresolved_inputs: unresolvedInputs,
    approval_required: approvalRequired,
  };
}

function dedupeInputs(inputs: readonly RuleInput[]): readonly RuleInput[] {
  const seen = new Map<string, RuleInput>();
  for (const input of inputs) {
    if (!seen.has(input.input_id)) {
      seen.set(input.input_id, input);
    }
  }
  return [...seen.values()];
}

interface AggregateCounts {
  readonly criticalFailureCount: number;
  readonly criticalUnresolvedCount: number;
  readonly unresolvedApplicabilityCount: number;
  readonly uncoveredCriticalFamilyCount: number;
  readonly approvalRequiredCount: number;
  readonly resolvedCount: number;
}

/**
 * The aggregation order matters and is deliberate: a verified critical failure is decided first,
 * and PASS is reachable only when nothing at all is outstanding.
 */
function aggregate(counts: AggregateCounts): {
  status: ValidationStatus;
  status_reason_th: string;
} {
  if (counts.criticalFailureCount > 0) {
    return {
      status: "FAIL",
      status_reason_th: `ไม่ผ่านข้อกำหนดสำคัญ ${counts.criticalFailureCount} ข้อ`,
    };
  }
  if (counts.uncoveredCriticalFamilyCount > 0) {
    // The pack itself does not screen something it declared critical. Saying PASS here would read
    // as clearance for a question nobody asked.
    return {
      status: "UNKNOWN",
      status_reason_th: `ชุดกฎยังไม่ครอบคลุมหมวดสำคัญ ${counts.uncoveredCriticalFamilyCount} หมวด จึงยังสรุปไม่ได้`,
    };
  }
  if (counts.criticalUnresolvedCount > 0 || counts.unresolvedApplicabilityCount > 0) {
    const unresolved = counts.criticalUnresolvedCount + counts.unresolvedApplicabilityCount;
    if (counts.resolvedCount === 0) {
      return {
        status: "UNKNOWN",
        status_reason_th: `ยังไม่มีข้อมูลพอจะตรวจสอบข้อกำหนดใดได้เลย (ค้างอยู่ ${unresolved} ข้อ)`,
      };
    }
    return {
      status: "PARTIAL",
      status_reason_th: `ตรวจสอบได้บางส่วน ยังมีข้อกำหนดที่ยังสรุปไม่ได้ ${unresolved} ข้อ`,
    };
  }
  if (counts.approvalRequiredCount > 0) {
    return {
      status: "PARTIAL",
      status_reason_th: `ต้องขออนุญาต/ได้รับอนุมัติเพิ่มเติม ${counts.approvalRequiredCount} รายการ`,
    };
  }
  if (counts.resolvedCount === 0) {
    // No applicable rule fired at all. Silence is not clearance.
    return {
      status: "UNKNOWN",
      status_reason_th: "ไม่มีข้อกำหนดในชุดกฎนี้ที่ใช้กับแนวคิดนี้ จึงยังสรุปไม่ได้",
    };
  }
  return {
    status: "PASS",
    status_reason_th: `ผ่านข้อกำหนดที่ตรวจสอบได้ทั้งหมด ${counts.resolvedCount} ข้อ ภายในขอบเขตของชุดกฎนี้`,
  };
}
