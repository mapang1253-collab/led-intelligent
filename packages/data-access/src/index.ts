/**
 * @reis/data-access — the only package that owns SQL and transaction boundaries
 * (docs/technology-stack.md §4). SQL migrations under database/migrations/ are the schema
 * authority, not this file.
 */
export { createDb } from "./connection.js";
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
