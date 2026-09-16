/**
 * Evidence contracts — the subset of docs/data-architecture.md §4 and docs/api-contracts.md §5-6
 * needed by the current increment (docs/adr/0001-first-increment-scope.md). Fields are added as
 * work packages need them; nothing here is provider-specific.
 */

/** How a value came to be known. Never widened silently (docs/data-architecture.md §4). */
export type EpistemicStatus =
  | "OBSERVED"
  | "USER_ASSERTED"
  | "DERIVED"
  | "ESTIMATED"
  | "BENCHMARK"
  | "MODEL_ASSUMPTION";

/** Administrative granularity an observation actually describes. */
export type GeographyLevel = "PROVINCE" | "DISTRICT" | "SUBDISTRICT";

/**
 * A target-independent fact. It is NOT yet applied to an analysis target — that is EvidenceLink's
 * job (docs/data-architecture.md §5). Missing is represented by the absence of an Observation plus
 * a reason, never by zero.
 */
/**
 * Exactly one representation per figure. A range is not a scalar and must never be flattened into
 * one (database/migrations/0003, evidence.observation_value), so the two forms are alternatives the
 * compiler keeps apart rather than three fields a caller may fill in any combination.
 */
export type ObservationFigure =
  | { readonly value: string; readonly value_low?: undefined; readonly value_high?: undefined }
  | { readonly value?: undefined; readonly value_low: string; readonly value_high: string };

export type Observation = ObservationFacts & ObservationFigure;

interface ObservationFacts {
  readonly measure_id: string;
  /** The exact population/cohort this figure describes; never dropped when aggregating. */
  readonly population: string;
  readonly unit: string;
  readonly geography_level: GeographyLevel;
  /** Stable administrative code (DOPA-style) of the subject area. */
  readonly geography_code: number;
  /** Inclusive calendar-year bounds in CE, converted from any source-native calendar. */
  readonly period_start_year: number;
  readonly period_end_year: number;
  readonly epistemic_status: EpistemicStatus;
  readonly source_product_id: string;
  /** Source-stated caveat carried verbatim (e.g. "sample value is zero"), if any. */
  readonly source_note: string | null;
}

/**
 * Outcome of one acquisition attempt (docs/api-contracts.md §5). An empty record set is never used
 * to represent every outcome — NO_RECORD, OUTSIDE_COVERAGE and failures stay distinguishable.
 */
export type AcquisitionOutcome =
  | "SUCCESS"
  | "NO_RECORD"
  | "OUTSIDE_COVERAGE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "ACCESS_DENIED"
  | "INVALID_RESPONSE";

export type AcquisitionResult =
  | { readonly outcome: "SUCCESS"; readonly observations: readonly Observation[] }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS">;
      readonly reason: string;
      /**
       * Retry classification, kept separate from the outcome exactly as docs/api-contracts.md §5
       * requires. A source being briefly unreachable (5xx, reset connection, timeout) is retryable;
       * a malformed payload or a permission failure is not, and must reach an operator instead of
       * spinning in a retry loop.
       */
      readonly retryable: boolean;
      readonly observations?: undefined;
    };
