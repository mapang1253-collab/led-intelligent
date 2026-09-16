/**
 * @reis/data-access — the only package that owns SQL and transaction boundaries
 * (docs/technology-stack.md §4). SQL migrations under database/migrations/ are the schema
 * authority, not this file.
 */
export { type Db, createDb } from "./connection.js";
export type { Database } from "./schema.js";
export {
  type AnalysisRunRow,
  type CreateAnalysisRunInput,
  type OutputScope,
  type RunState,
  createAnalysisRun,
  findRunForCapability,
  loadRunAreaNames,
  setRunState,
} from "./repositories/analysis-runs.js";
export {
  type AdministrativeAreaSummary,
  listDistricts,
  listProvinces,
  listSubdistricts,
} from "./repositories/administrative-areas.js";
export {
  type ActiveSourceSummary,
  type EvidenceRequest,
  type StoredEvidenceLink,
  listActiveSources,
  loadActiveObservations,
  loadRunEvidence,
  saveEvidenceLinks,
} from "./repositories/evidence.js";
export {
  type SavedConceptSet,
  loadConceptSet,
  saveConceptSet,
} from "./repositories/concepts.js";
export {
  type BudgetDecision,
  type BudgetLimits,
  type BudgetStatus,
  type CallRecord,
  budgetStatus,
  effectiveDailyLimit,
  recordCall,
  reserveCall,
} from "./repositories/ai-budget.js";
