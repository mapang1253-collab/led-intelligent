/**
 * @reis/source-adapters — the only package that calls external evidence providers
 * (docs/technology-stack.md §4). Each adapter is independently activatable per
 * docs/implementation-plan.md §4 (ownership, rights, semantics, fixtures before it may run).
 *
 * Implemented so far (each activated independently, or not at all):
 * - NSO Socio-Economic Survey household income, by province.
 * - DOPA registered population, by province and subdistrict.
 *
 * Planned next, in the free/nationwide set from docs/adr/0001-first-increment-scope.md:
 * Treasury assessed land value (CKAN), DOPA population, MOTS tourism, GISTDA historical flood,
 * and an OSM extract. OSM and GISTDA need geometry handling and are scheduled after the
 * non-spatial sources land.
 */
export { USER_AGENT, fetchJson, fetchText } from "./http.js";
export type { FetchJsonOptions, FetchJsonResult, FetchTextResult } from "./http.js";
export {
  DOPA_POPULATION_MEASURE_ID,
  DOPA_POPULATION_SOURCE_PRODUCT_ID,
  type DopaAreaCounts,
  type DopaPopulationParse,
  type DopaPopulationResult,
  type DopaSubdistrictCounts,
  dopaPopulationUrl,
  fetchDopaPopulation,
  parseDopaPopulationFile,
} from "./dopa/population.js";
export {
  SES_INCOME_MEASURE_ID,
  SES_INCOME_SOURCE_PRODUCT_ID,
  SES_INCOME_URL,
  type SesIncomeTarget,
  fetchSesIncome,
  fetchSesIncomeTable,
  parseSesIncomeRows,
} from "./nso/index.js";
