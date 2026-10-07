/**
 * @reis/source-adapters — the only package that calls external evidence providers
 * (docs/technology-stack.md §4). Each adapter is independently activatable per
 * docs/implementation-plan.md §4 (ownership, rights, semantics, fixtures before it may run).
 *
 * Implemented so far (each activated independently, or not at all):
 * - NSO Socio-Economic Survey household income, by province.
 * - DOPA registered population, by province and subdistrict.
 * - Treasury assessed construction values, by province and building type.
 *
 * Planned next, in the free/nationwide set from docs/adr/0001-first-increment-scope.md:
 * Treasury assessed land value (CKAN), DOPA population, MOTS tourism, GISTDA historical flood,
 * and an OSM extract. OSM and GISTDA need geometry handling and are scheduled after the
 * non-spatial sources land.
 */
export { USER_AGENT, fetchBytes, fetchJson, fetchText } from "./http.js";
export type { FetchJsonOptions, FetchJsonResult, FetchTextResult } from "./http.js";
export {
  BUILDING_VALUATION_MEASURE_ID,
  BUILDING_VALUATION_SOURCE_PRODUCT_ID,
  BUILDING_VALUATION_URL,
  type BuildingValuationResult,
  fetchBuildingValuation,
  parseBuildingValuationCsv,
  splitCsvLine,
} from "./treasury/building-valuation.js";
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
export {
  CONDOMINIUM_VALUATION_MEASURE_ID,
  CONDOMINIUM_VALUATION_SOURCE_PRODUCT_ID,
  CONDOMINIUM_VALUATION_URL,
  type CondominiumValuationResult,
  areaCodeOf,
  fetchCondominiumValuation,
  parseCondominiumValuationCsv,
} from "./treasury/condominium-valuation.js";
export {
  LAND_VALUATION_MEASURE_ID,
  LAND_VALUATION_SOURCE_PRODUCT_ID,
  LAND_VALUATION_URL,
  type LandValuationResult,
  fetchLandValuation,
  parseLandValuationCsv,
} from "./treasury/land-valuation.js";

/**
 * OSM proximity (docs/adr/0006). Deliberately not grouped with the evidence adapters above: it
 * produces context for display, never an Observation, and the activation gates that govern the
 * others do not apply to it for exactly that reason.
 */
export {
  OSM_ATTRIBUTION_TH,
  OVERPASS_ENDPOINT,
  POI_RADIUS_METRES,
  PROXIMITY_SOURCE_ID,
  ROAD_RADIUS_METRES,
  type ProximityCategory,
  type ProximityFeature,
  type ProximityResult,
  buildQuery,
  categorise,
  fetchProximity,
  nearestByCategory,
} from "./osm/proximity.js";
export {
  NOMINATIM_ENDPOINT,
  type AreaCentre,
  type PlaceMatch,
  geocodeArea,
  searchPlaces,
} from "./osm/geocode.js";

/**
 * DPT city plan zoning (docs/adr/0008). Like proximity above, context for display with a citation
 * — never an Observation, and never a legal clearance.
 */
export {
  ZONING_ATTRIBUTION_TH,
  ZONING_PUBLISHER_URL,
  ZONING_SOURCE_ID,
  type ZoneReference,
  type ZoneStore,
  type ZoningOptions,
  type ZoningPlan,
  type ZoningResult,
  extractConditionText,
  fetchZoning,
  toHexColour,
  zoneKey,
  zoningTileTemplate,
} from "./dpt/zoning.js";

/**
 * DPT parcel outlines (docs/adr/0009). The same question the stored DOL lookup answers, for the 57
 * provinces DOL does not publish openly — located live, so the database does not grow by a row.
 */
export {
  DPT_PARCEL_ATTRIBUTION_TH,
  DPT_PARCEL_PROVINCE_CODES,
  DPT_PARCEL_PUBLISHER_URL,
  DPT_PARCEL_SOURCE_ID,
  type DptParcel,
  type DptParcelLayer,
  type DptParcelLayerResult,
  type DptParcelResult,
  describeParcelLayer,
  findDptParcel,
  parseDptMapSheet,
} from "./dpt/parcels.js";
