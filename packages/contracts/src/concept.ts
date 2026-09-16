/**
 * AI-proposed use concepts (docs/ai-architecture.md §3).
 *
 * A concept is a *proposal*. Nothing here is a permission, a valuation or a validation result — the
 * deterministic engines decide those. The shape exists so a proposal can be checked mechanically:
 * closed vocabularies, citations that must exist in the context the model was given, and Thai
 * display fields that are verified to be Thai before anything reaches a screen.
 */

export const CONCEPT_SCHEMA_VERSION = "1.0.0";

/**
 * Controlled activity vocabulary. The model may only choose from these; an activity it cannot map
 * stays UNMAPPED and its legal status stays UNKNOWN, rather than being bent to the nearest ID
 * (docs/validation-architecture.md §1).
 */
export const ACTIVITY_IDS = [
  "activity.residence",
  "activity.multi_family_residence",
  "activity.short_stay_lodging",
  "activity.retail",
  "activity.food_and_beverage",
  "activity.office",
  "activity.warehouse",
  "activity.light_manufacturing",
  "activity.community_facility",
  "activity.parking",
  "activity.open_space_recreation",
] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

/**
 * Building types named by กฎกระทรวง ฉบับที่ 55 (พ.ศ. 2543) ข้อ 1. They are the vocabulary the legal
 * pack's applicability is written against, so a concept that states one can actually be screened.
 */
export const BUILDING_TYPES_TH = [
  "อาคารอยู่อาศัย",
  "อาคารอยู่อาศัยรวม",
  "ห้องแถว",
  "ตึกแถว",
  "บ้านแถว",
  "บ้านแฝด",
  "อาคารพาณิชย์",
  "โรงงาน",
  "คลังสินค้า",
  "อาคารสาธารณะ",
] as const;
export type BuildingTypeTh = (typeof BUILDING_TYPES_TH)[number];

export interface DemandHypothesis {
  /** Who the occupants or customers are. Not "the area is growing". */
  readonly population_th: string;
  readonly mechanism_th: string;
  /** Evidence IDs from the brief that would support it; must exist in the brief. */
  readonly supporting_evidence_ids: readonly string[];
  /** What would weaken it — required, so a hypothesis states its own falsifier. */
  readonly counter_evidence_th: string;
}

export interface PotentialUseConcept {
  readonly schema_version: string;
  readonly locale: "th-TH";
  readonly concept_id: string;
  readonly label_th: string;
  readonly description_th: string;
  readonly supporting_reason_th: string;
  /** What the proposal is unsure about. Required: a concept with no stated uncertainty is refused. */
  readonly uncertainty_th: string;
  readonly activity_ids: readonly ActivityId[];
  /** Activities the model could not map to the vocabulary; carried, never coerced. */
  readonly unmapped_activities_th: readonly string[];
  readonly building_type_th: BuildingTypeTh;
  readonly supporting_evidence_ids: readonly string[];
  readonly demand_hypotheses: readonly DemandHypothesis[];
}

/** The bounded, rights-filtered projection the model is given (docs/ai-architecture.md §3). */
export interface EvidenceCard {
  readonly evidence_id: string;
  readonly measure_th: string;
  readonly population_th: string;
  readonly value: string;
  readonly unit_th: string;
  readonly area_th: string;
  readonly geography_level_th: string;
  readonly period_th: string;
  readonly caveat_th: string;
}

export interface OpportunityBrief {
  readonly schema_version: string;
  readonly locale: "th-TH";
  readonly target_th: string;
  readonly effective_on: string;
  readonly output_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  readonly evidence_cards: readonly EvidenceCard[];
  /** Questions the corpus cannot answer for this target; the model must not paper over them. */
  readonly critical_gaps_th: readonly string[];
  readonly allowed_activity_ids: readonly ActivityId[];
  readonly allowed_building_types_th: readonly BuildingTypeTh[];
}

/** Stable reason codes; user-facing Thai is selected from these, never from provider text. */
export type AiFailureCode =
  | "AI_OUTPUT_INVALID"
  | "AI_QUOTA_EXHAUSTED"
  | "AI_TIMEOUT"
  /** The provider is up but temporarily overloaded — pressing again shortly usually works. */
  | "AI_PROVIDER_BUSY"
  | "AI_UNAVAILABLE"
  | "AI_DISABLED"
  | "AI_NO_DEFENSIBLE_CONCEPTS";

export type ConceptSearchStopReason =
  | "EVIDENCE_SPACE_COVERED"
  | "NO_DEFENSIBLE_CONCEPTS"
  | "AI_FAILURE"
  | "RESOURCE_TRUNCATED";

/** What was asked, what came back and why it stopped (docs/analysis-architecture.md §5). */
export interface CandidateSearchRecord {
  readonly mode: "LIVE_AI" | "RECORDED_AI" | "AI_DISABLED";
  readonly model: string;
  readonly calls_made: number;
  readonly repair_attempted: boolean;
  readonly stop_reason: ConceptSearchStopReason;
  readonly rejected_concepts: readonly { readonly reason: string; readonly detail: string }[];
  readonly duplicates_merged: number;
}

export type ConceptProposalResult =
  | {
      readonly outcome: "SUCCESS";
      readonly concepts: readonly PotentialUseConcept[];
      readonly record: CandidateSearchRecord;
    }
  | {
      readonly outcome: "FAILED";
      readonly code: AiFailureCode;
      readonly detail: string;
      readonly retryable: boolean;
      readonly record: CandidateSearchRecord;
      readonly concepts?: undefined;
    };
