/**
 * @reis/evidence-engine — turns SourceRecords into Observations and EvidenceLinks, and derives
 * features/opportunity signals (docs/data-architecture.md, docs/analysis-architecture.md §3-4).
 * Takes/returns typed domain contracts only; no provider calls (that's @reis/source-adapters' job).
 */
export {
  HOUSEHOLD_INCOME_REQUIREMENT,
  type LinkTarget,
  buildHouseholdIncomeLinks,
  temporalMatchFor,
} from "./link-policy.js";
