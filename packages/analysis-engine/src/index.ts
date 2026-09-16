/**
 * @reis/analysis-engine — the pipeline orchestration described in docs/architecture.md §1 and
 * docs/analysis-architecture.md: candidate generation/dedup, comparison, and final-status decision
 * (CLEAR_RECOMMENDATION / INCONCLUSIVE / INSUFFICIENT_EVIDENCE). No provider calls.
 *
 * Built so far: the final-status decision and the deterministic Thai rendering required by
 * docs/output-policy.md. Comparison and the economic registry remain unbuilt, which is why no run
 * can yet reach CLEAR_RECOMMENDATION.
 */
export {
  BASE_DISCLAIMER_TH,
  SCOPE_STATEMENTS_TH,
  STATUS_STATEMENTS_TH,
  type FinalAnalysisInput,
  type VerificationInput,
  buildVerificationActions,
  renderFinalAnalysis,
} from "./output-policy.js";
export {
  type FinalStatusInput,
  type FinalStatusOutcome,
  decideFinalStatus,
} from "./final-status.js";
