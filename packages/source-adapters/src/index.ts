/**
 * @reis/source-adapters — the only package that calls external evidence providers
 * (docs/technology-stack.md §4). Each adapter is independently activatable per
 * docs/implementation-plan.md §4 (ownership, rights, semantics, fixtures before it may run).
 *
 * Implemented so far (all still INACTIVE pending their source gates):
 * - NSO Socio-Economic Survey household income, by province.
 *
 * Planned next, in the free/nationwide set from docs/adr/0001-first-increment-scope.md:
 * Treasury assessed land value (CKAN), DOPA population, MOTS tourism, GISTDA historical flood,
 * and an OSM extract. OSM and GISTDA need geometry handling and are scheduled after the
 * non-spatial sources land.
 */
export { USER_AGENT, fetchJson } from "./http.js";
export type { FetchJsonOptions, FetchJsonResult } from "./http.js";
export {
  SES_INCOME_MEASURE_ID,
  SES_INCOME_SOURCE_PRODUCT_ID,
  type SesIncomeTarget,
  fetchSesIncome,
  parseSesIncomeRows,
} from "./nso/index.js";
