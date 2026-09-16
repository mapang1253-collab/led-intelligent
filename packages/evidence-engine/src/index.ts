/**
 * @reis/evidence-engine — turns SourceRecords into Observations and EvidenceLinks, and derives
 * features/opportunity signals (docs/data-architecture.md, docs/analysis-architecture.md §3-4).
 * Takes/returns typed domain contracts only; no provider calls (that's @reis/source-adapters' job).
 */
export {
  CONDOMINIUM_PRICE_REQUIREMENT,
  LAND_PRICE_REQUIREMENT,
  CONSTRUCTION_COST_REQUIREMENT,
  HOUSEHOLD_INCOME_REQUIREMENT,
  POPULATION_REQUIREMENT,
  type EvidenceRequirement,
  type LinkTarget,
  buildEvidenceLinks,
  buildHouseholdIncomeLinks,
  temporalMatchFor,
} from "./link-policy.js";
