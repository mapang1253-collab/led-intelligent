/**
 * EvidenceLink contracts (docs/data-architecture.md §5).
 *
 * An Observation is a fact about the world. An EvidenceLink is the separate, run-scoped judgement
 * of how well that fact answers one question about one target. Keeping them apart is what stops
 * area evidence from quietly becoming property evidence: the link records the downgrade instead of
 * hiding it.
 */

/** Every match dimension is recorded separately; none of them repairs another. */
export type SubjectMatch = "EXACT" | "PARTIAL" | "PROXY" | "NONE";
export type GeographyMatch = "EXACT" | "CONTAINING_AREA" | "NEIGHBOURING" | "NONE";
export type TemporalMatch = "CURRENT" | "RECENT" | "DATED" | "UNKNOWN";
export type PropertySimilarity = "NOT_APPLICABLE" | "SIMILAR" | "DISSIMILAR" | "UNKNOWN";
export type PurposeFitness = "FIT" | "FIT_WITH_CAVEAT" | "CONTEXT_ONLY" | "UNFIT";

export type EvidenceRole = "PRIMARY" | "SUPPORTING" | "CONTEXTUAL" | "CONTRADICTING" | "SUBSTITUTE";
export type DecisionImpact = "CONTEXT" | "SUPPORTS" | "CONSTRAINS" | "DECISIVE";
export type OutputScope = "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";

/** An Observation as it is read back out of the corpus, with the provenance needed to judge it. */
export interface StoredObservation {
  readonly observation_id: string;
  readonly measure_id: string;
  readonly population_th: string;
  readonly geography_level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  readonly area_name_th: string;
  readonly period_start_year: number;
  readonly period_end_year: number;
  readonly source_vintage: string;
  readonly epistemic_status: string;
  readonly reliability: string;
  readonly completeness: string;
  readonly source_note_th: string | null;
  /** Decimal string, never a float (docs/technology-stack.md §9). */
  readonly value: string;
  readonly unit_code: string;
  readonly unit_name_th: string;
  readonly statistic: string;
  readonly measure_name_th: string;
  readonly source_title_th: string;
  readonly attribution_th: string;
  readonly must_not_become_th: string;
}

/** A link the engine proposes; the repository assigns identity when it is stored. */
export interface EvidenceLinkDraft {
  readonly observation_id: string;
  readonly requirement_id: string;
  readonly purpose_th: string;
  readonly role: EvidenceRole;
  readonly subject_match: SubjectMatch;
  readonly geography_match: GeographyMatch;
  readonly temporal_match: TemporalMatch;
  readonly property_similarity: PropertySimilarity;
  readonly purpose_fitness: PurposeFitness;
  readonly requested_level: OutputScope;
  readonly actual_level: OutputScope;
  readonly substitution_reason: string | null;
  readonly decision_impact: DecisionImpact;
  /** Shown to the reader verbatim: what this evidence is, and what it cannot answer. */
  readonly disclosure_th: string;
}
