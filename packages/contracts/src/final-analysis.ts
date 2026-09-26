/**
 * Final presentation contracts (docs/output-policy.md `academic-output-v2`,
 * docs/analysis-architecture.md §9).
 *
 * Every field a reader sees is produced by deterministic Thai templates. The AI may not supply,
 * weaken or remove any of it — the policy exists precisely because a model asked to summarise a
 * cautious result will tend to make it sound more certain than it is.
 */

export const OUTPUT_POLICY_VERSION = "academic-output-v2";

export type FinalStatus = "CLEAR_RECOMMENDATION" | "INCONCLUSIVE" | "INSUFFICIENT_EVIDENCE";

export type FinalStatusReason =
  | "NO_SUPPORTED_COMMON_BASIS"
  | "NO_DEFENSIBLE_CONCEPTS_GENERATED"
  | "NO_FEASIBLE_CANDIDATE"
  | "DOMINANCE_REVERSIBLE"
  | "SEARCH_TRUNCATED";

/** The five groups docs/output-policy.md §7 requires verification actions to be presented under. */
export type VerificationDomain =
  | "TITLE_AND_IDENTITY"
  | "LAW_AND_PLANNING"
  | "SURVEY_AND_SITE"
  | "MARKET_AND_FINANCE"
  | "SOURCE_CURRENCY";

export type VerificationPriority = "BLOCKING" | "MATERIAL" | "ADVISORY";

/** A named thing to go and find out, and what it would change (docs/output-policy.md §7). */
export interface VerificationAction {
  readonly action_id: string;
  readonly domain: VerificationDomain;
  readonly priority: VerificationPriority;
  /** The fact, rule or parameter to verify. */
  readonly target_th: string;
  /** Why it can change the conclusion. Never generic. */
  readonly why_th: string;
  /** Who or what source category could answer it. */
  readonly suggested_source_th: string;
  readonly related_ids: readonly string[];
  /** Whether completing it could change scope, validation coverage or the recommendation. */
  readonly could_change_th: string;
}

export interface FinalAnalysis {
  readonly schema_version: string;
  readonly locale: "th-TH";
  readonly output_policy_version: string;
  readonly analysed_on: string;
  readonly status: FinalStatus;
  readonly status_reason: FinalStatusReason;
  readonly output_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  /** Required base disclaimer, verbatim from the policy. */
  readonly disclaimer_th: string;
  /** Scope-specific statement, selected by output_scope. */
  readonly scope_statement_th: string;
  /** Status-specific statement, selected by status and reason. */
  readonly status_statement_th: string;
  /** What is missing, in Thai, for INSUFFICIENT_EVIDENCE. */
  readonly missing_basis_th: readonly string[];
  readonly verification_actions: readonly VerificationAction[];
  /** Concept labels evaluated, so the reader can see the search scope. Never ranked. */
  readonly evaluated_concepts_th: readonly string[];
}
