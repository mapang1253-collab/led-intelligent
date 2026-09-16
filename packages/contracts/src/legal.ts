/**
 * Legal rule and validation contracts (docs/validation-architecture.md §2-3, §8-9).
 *
 * Rules are data, not code. A rule carries its own source locator, effective dates, applicability
 * predicates and evaluation predicate, so the engine can execute a pack without knowing anything
 * about the law it encodes — and so every outcome can point at the clause that produced it.
 */

/** Rule families organise a pack's coverage; the list is not a fixed business catalogue. */
export type RuleFamily =
  | "LAND_USE_PLANNING"
  | "BUILDING_USE_CLASSIFICATION"
  | "DEVELOPMENT_INTENSITY"
  | "SETBACK_ACCESS"
  | "ENVIRONMENTAL_OVERLAY"
  | "TITLE_INTEREST"
  | "LICENSING_OPERATIONS"
  | "CHANGE_OF_USE";

export type RuleEffect =
  | "REQUIREMENT"
  | "PROHIBITION"
  | "PERMISSION"
  | "EXCEPTION"
  | "APPROVAL_REQUIRED";

/**
 * A critical rule can decide a concept's fate; a non-critical one is visible but cannot, on its own,
 * make a concept unvalidated (docs/validation-architecture.md §6).
 */
export type RuleCriticality = "CRITICAL" | "NON_CRITICAL";

export type LifecycleState = "DRAFT" | "ACADEMIC_REVIEWED" | "RETIRED";

export type ValidationStatus = "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN";

export type Applicability = "APPLICABLE" | "NOT_APPLICABLE" | "UNRESOLVED";

/** Where a rule came from, precisely enough for a reader to find and check it. */
export interface RuleSource {
  readonly issuing_authority_th: string;
  readonly instrument_th: string;
  /** Exact clause, e.g. "ข้อ 33 วรรคหนึ่ง". */
  readonly clause_th: string;
  /** Royal Gazette or equivalent citation. */
  readonly citation_th: string;
  readonly source_url: string;
  /** Instrument hierarchy: an act outranks a ministerial regulation, which outranks a local rule. */
  readonly hierarchy: "ACT" | "MINISTERIAL_REGULATION" | "LOCAL_ORDINANCE" | "NOTIFICATION";
  readonly promulgated_on: string;
  readonly effective_from: string;
  readonly repealed_on: string | null;
  /** Amending instruments already folded into this text, newest last. */
  readonly amended_by_th: readonly string[];
}

/** Which jurisdictions a rule reaches. Outside them it is NOT_APPLICABLE, never assumed. */
export interface RuleJurisdiction {
  readonly scope: "NATIONWIDE" | "PROVINCE" | "DISTRICT" | "SUBDISTRICT" | "LOCAL_AUTHORITY";
  /** Administrative codes the rule covers; empty means the whole scope. */
  readonly area_codes: readonly number[];
  readonly coverage_note_th: string;
}

/** An input a rule needs, and the unit it must arrive in. */
export interface RuleInput {
  readonly input_id: string;
  readonly label_th: string;
  readonly unit: string;
  /** How a user or an evidence source could supply it — shown when it is missing. */
  readonly obtained_from_th: string;
}

/**
 * A rule's test, expressed declaratively so the pack stays reviewable data.
 *
 * `RATIO` exists because building controls are routinely written as "not less than X per cent of",
 * and expanding that into two separate numeric rules would lose the clause's own shape.
 */
export type RulePredicate =
  | {
      readonly kind: "NUMERIC";
      readonly input_id: string;
      readonly op: "gte" | "lte" | "gt" | "lt" | "eq";
      /** Decimal string; money and precision-sensitive values never cross as floats. */
      readonly value: string;
      readonly unit: string;
    }
  | {
      readonly kind: "RATIO";
      readonly numerator_input_id: string;
      readonly denominator_input_id: string;
      readonly op: "gte" | "lte";
      /** Ratio as a decimal string, e.g. "0.30" for thirty per cent. */
      readonly value: string;
    }
  | {
      readonly kind: "MEMBERSHIP";
      readonly input_id: string;
      readonly allowed: readonly string[];
    };

/** What must be true of a concept for the rule to apply at all. */
export interface RuleApplicability {
  /** Concept activity IDs this rule reaches; empty means any activity. */
  readonly activity_ids: readonly string[];
  /** Characteristics that must hold, e.g. building_type = ตึกแถว. */
  readonly required_characteristics: readonly { readonly key: string; readonly value: string }[];
  readonly note_th: string;
}

export interface LegalRule {
  readonly rule_id: string;
  readonly version: string;
  readonly title_th: string;
  readonly statement_th: string;
  readonly family: RuleFamily;
  readonly effect: RuleEffect;
  readonly criticality: RuleCriticality;
  readonly source: RuleSource;
  readonly jurisdiction: RuleJurisdiction;
  readonly applicability: RuleApplicability;
  readonly inputs: readonly RuleInput[];
  /** Absent for rules that state an approval requirement rather than a measurable test. */
  readonly predicate: RulePredicate | null;
  readonly failure_message_th: string;
}

/** The immutable review record RD-4 requires before a pack may execute. */
export interface PackReviewRecord {
  readonly reviewers: readonly string[];
  readonly reviewed_on: string;
  readonly content_hash: string;
  readonly evidence_basis_th: string;
  readonly limitations_th: readonly string[];
}

export interface LegalRulePack {
  readonly pack_id: string;
  readonly version: string;
  readonly title_th: string;
  readonly lifecycle_state: LifecycleState;
  readonly jurisdiction_coverage_th: string;
  /** Families this pack claims to cover for its jurisdiction; anything else is a coverage gap. */
  readonly declared_critical_families: readonly RuleFamily[];
  readonly review: PackReviewRecord | null;
  readonly rules: readonly LegalRule[];
}

/** The concept being validated, reduced to what a legal screen can act on. */
export interface ConceptUnderTest {
  readonly concept_id: string;
  readonly label_th: string;
  readonly activity_ids: readonly string[];
  readonly characteristics: Readonly<Record<string, string>>;
  /** Measured facts, as decimal strings keyed by input_id. */
  readonly inputs: Readonly<Record<string, string>>;
}

export interface RuleOutcome {
  readonly rule_id: string;
  readonly rule_version: string;
  readonly title_th: string;
  readonly family: RuleFamily;
  readonly criticality: RuleCriticality;
  readonly applicability: Applicability;
  readonly status: ValidationStatus;
  /** Inputs the rule needed and did not get; the reason a status is UNKNOWN. */
  readonly missing_inputs: readonly RuleInput[];
  readonly explanation_th: string;
  readonly source: RuleSource;
}

export interface FamilyCoverage {
  readonly family: RuleFamily;
  readonly declared_critical: boolean;
  readonly rules_applicable: number;
  readonly rules_resolved: number;
  readonly covered: boolean;
}

export interface LegalValidationResult {
  readonly validator_version: string;
  readonly pack_id: string;
  readonly pack_version: string;
  readonly concept_id: string;
  readonly status: ValidationStatus;
  readonly status_reason_th: string;
  readonly outcomes: readonly RuleOutcome[];
  readonly coverage: readonly FamilyCoverage[];
  /** Named so the reader knows what to go and find out; never silently dropped. */
  readonly unresolved_inputs: readonly RuleInput[];
  readonly approval_required: readonly RuleOutcome[];
}
