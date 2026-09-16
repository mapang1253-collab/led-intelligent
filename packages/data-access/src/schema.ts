import type { ColumnType, Generated } from "kysely";

/** Matches database/migrations/0001_reference_administrative_area.sql exactly. */
export interface AdministrativeAreaTable {
  id: Generated<string>;
  level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  code: number;
  parent_id: string | null;
  name_th: string;
  name_en: string | null;
  postal_code: string | null;
  valid_from: ColumnType<string, string | undefined, never>;
  valid_to: string | null;
  source: string;
  created_at: ColumnType<string, string | undefined, never>;
}

/** Matches database/migrations/0002_analysis_run.sql exactly. */
export interface AnalysisRunTable {
  id: Generated<string>;
  run_id: string;
  capability_digest: string;
  run_state:
    | "QUEUED"
    | "RUNNING"
    | "COMPLETE"
    | "PARTIAL"
    | "FAILED_RETRYABLE"
    | "FAILED_FINAL"
    | "EXPIRED"
    | "CANCELLED";
  requested_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  permitted_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  intake: ColumnType<unknown, string, string>;
  province_id: string;
  district_id: string;
  subdistrict_id: string;
  created_at: ColumnType<string, string | undefined, never>;
  expires_at: ColumnType<string, string, string>;
  completed_at: ColumnType<string | null, string | null | undefined, string | null>;
}

/** Matches database/migrations/0003_source_registry_and_evidence.sql exactly. */
export interface SourceProductTable {
  id: Generated<string>;
  product_id: string;
  owner_id: string;
  title_th: string;
  access_url: string;
  catalogue_url: string | null;
  licence_id: string;
  attribution_th: string;
  may_acquire: boolean;
  may_store: boolean;
  may_transform: boolean;
  may_display: boolean;
  rights_expires_at: string | null;
  coverage_level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT" | "POINT";
  coverage_note_th: string;
  refresh_frequency: string;
  must_not_become_th: string;
  activation_state: "INACTIVE" | "ACTIVE" | "SUSPENDED";
  activation_record_id: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, string>;
}

export interface ProductVersionTable {
  id: Generated<string>;
  source_product_id: string;
  version_label: string;
  retrieved_at: ColumnType<string, string | undefined, string>;
  record_count: number;
  payload_sha256: string;
  payload_bytes: string;
  parse_status: "PARSED" | "PARTIAL" | "QUARANTINED";
  parser_version: string;
}

export interface UnitTable {
  code: string;
  name_th: string;
  kind: "CURRENCY_PER_PERIOD" | "CURRENCY" | "COUNT" | "RATIO" | "AREA" | "LENGTH";
}

export interface MeasureDefinitionTable {
  measure_id: string;
  definition_version: number;
  name_th: string;
  measure_type: string;
  statistic: "MEAN" | "MEDIAN" | "TOTAL" | "RATE" | "SHARE" | "SINGLE";
  unit_code: string;
  note_th: string | null;
}

export interface ObservationTable {
  id: Generated<string>;
  observation_key: string;
  observation_version: number;
  supersedes_id: string | null;
  is_current: boolean;
  subject_type: "ADMIN_AREA" | "PROPERTY" | "PARCEL";
  measure_id: string;
  population_th: string;
  admin_area_id: string;
  geography_level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  period_start_year: number;
  period_end_year: number;
  source_vintage: string;
  published_at: string | null;
  retrieved_at: string;
  epistemic_status:
    | "OBSERVED"
    | "USER_ASSERTED"
    | "DERIVED"
    | "ESTIMATED"
    | "BENCHMARK"
    | "MODEL_ASSUMPTION";
  source_product_version_id: string;
  source_record_locator: string;
  extraction_method: string;
  reliability: "AUTHORITATIVE" | "OFFICIAL_SURVEY" | "COMMERCIAL" | "CROWDSOURCED" | "UNVERIFIED";
  completeness: "COMPLETE" | "PARTIAL" | "SPARSE";
  parsing_flags: string[];
  source_note_th: string | null;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface ObservationValueTable {
  observation_id: string;
  measure_id: string;
  /** `numeric` crosses the contract boundary as a decimal string; never as a JS number. */
  value_scalar: string | null;
  value_low: string | null;
  value_high: string | null;
  value_structured: unknown | null;
  unit_code: string;
  currency: string | null;
  statistic: "MEAN" | "MEDIAN" | "TOTAL" | "RATE" | "SHARE" | "SINGLE";
}

export interface EvidenceLinkTable {
  id: Generated<string>;
  run_id: string;
  observation_id: string;
  target_kind: "RUN_TARGET_AREA" | "RUN_TARGET_PROPERTY";
  target_admin_area_id: string;
  requirement_id: string;
  purpose_th: string;
  role: "PRIMARY" | "SUPPORTING" | "CONTEXTUAL" | "CONTRADICTING" | "SUBSTITUTE";
  subject_match: "EXACT" | "PARTIAL" | "PROXY" | "NONE";
  geography_match: "EXACT" | "CONTAINING_AREA" | "NEIGHBOURING" | "NONE";
  temporal_match: "CURRENT" | "RECENT" | "DATED" | "UNKNOWN";
  property_similarity: "NOT_APPLICABLE" | "SIMILAR" | "DISSIMILAR" | "UNKNOWN";
  purpose_fitness: "FIT" | "FIT_WITH_CAVEAT" | "CONTEXT_ONLY" | "UNFIT";
  requested_level: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  actual_level: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  adjustment_method: string | null;
  adjustment_version: string | null;
  substitution_reason: string | null;
  decision_impact: "CONTEXT" | "SUPPORTS" | "CONSTRAINS" | "DECISIVE";
  disclosure_th: string;
  created_at: ColumnType<string, string | undefined, never>;
}

/** Matches database/migrations/0005_concepts_and_validation.sql exactly. */
export interface CandidateSearchRecordTable {
  run_id: string;
  mode: "LIVE_AI" | "RECORDED_AI" | "AI_DISABLED";
  model: string;
  calls_made: number;
  repair_attempted: boolean;
  stop_reason:
    | "EVIDENCE_SPACE_COVERED"
    | "NO_DEFENSIBLE_CONCEPTS"
    | "AI_FAILURE"
    | "RESOURCE_TRUNCATED";
  duplicates_merged: number;
  rejected: ColumnType<unknown, string, string>;
  failure_code: string | null;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface PotentialUseConceptTable {
  id: Generated<string>;
  run_id: string;
  concept_id: string;
  label_th: string;
  concept: ColumnType<unknown, string, string>;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface ValidationResultTable {
  id: Generated<string>;
  run_id: string;
  concept_id: string;
  domain: "LEGAL" | "PHYSICAL" | "DEMAND";
  status: "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN";
  pack_id: string;
  pack_version: string;
  validator_version: string;
  result: ColumnType<unknown, string, string>;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface Database {
  "reference.administrative_area": AdministrativeAreaTable;
  "analysis.analysis_run": AnalysisRunTable;
  "source.source_product": SourceProductTable;
  "source.product_version": ProductVersionTable;
  "reference.unit": UnitTable;
  "reference.measure_definition": MeasureDefinitionTable;
  "evidence.observation": ObservationTable;
  "evidence.observation_value": ObservationValueTable;
  "evidence.evidence_link": EvidenceLinkTable;
  "analysis.candidate_search_record": CandidateSearchRecordTable;
  "analysis.potential_use_concept": PotentialUseConceptTable;
  "analysis.validation_result": ValidationResultTable;
}
