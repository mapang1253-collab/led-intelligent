import { type FetchJsonOptions, fetchJson } from "../http.js";

/**
 * Parcel lookup by ระวาง and เลขที่ดิน against กรมโยธาธิการและผังเมือง (docs/adr/0009).
 *
 * The product could already answer this question, for ปทุมธานี alone: the Land Department publishes
 * parcel shapefiles for five provinces, and one of them fills about a third of the database, so
 * four were dropped to fit. A reader in เชียงใหม่ typed a correct ระวาง off a real deed and was told
 * their province is not covered.
 *
 * DPT republishes the same cadastral layer inside its town-planning services for 57 provinces and
 * answers one parcel in about a second, so nothing has to be stored. Counted on 2026-10-07: those
 * layers hold between 6,564 (ระนอง) and 626,507 (อุดรธานี) parcels each.
 *
 * What it is NOT, exactly as the stored lookup is not (docs/adr/0007): this locates a parcel and
 * repeats the area the department computed. Ownership is not in this data at all, and it is not a
 * deed-number search — เลขที่โฉนด is a different number and is in neither source.
 */

const ARCGIS_ROOT = "https://dptgis.dpt.go.th/arcgis/rest/services/dds2";

export const DPT_PARCEL_SOURCE_ID = "dpt.parcel";

export const DPT_PARCEL_ATTRIBUTION_TH = "ข้อมูลรูปแปลงที่ดิน กรมโยธาธิการและผังเมือง (DDS Explorer)";

export const DPT_PARCEL_PUBLISHER_URL = "https://dptgis.dpt.go.th/arcgis/rest/services/dds2";

/**
 * Province codes whose DPT service carries parcels searchable by ระวาง, verified 2026-10-07.
 *
 * Checked, not assumed: all 87 possible codes were read, 62 publish a `PARCEL<code>` layer, and
 * five of those (ร้อยเอ็ด, นครพนม, อุตรดิตถ์, แพร่, พิจิตร) carry the polygons without UTMMAP columns, so a
 * ระวาง cannot address them and they are left out rather than listed and then failing. The rest of
 * the country — including กรุงเทพฯ, ชลบุรี and ปทุมธานี — publishes no parcel layer here at all.
 *
 * Nothing downstream trusts this list for correctness: a province that stops publishing answers
 * OUTSIDE_COVERAGE on its own. The list exists so the screen can name the searchable provinces
 * before a reader types, instead of letting an empty result imply the deed number is wrong.
 */
export const DPT_PARCEL_PROVINCE_CODES: readonly string[] = [
  "16",
  "17",
  "18",
  "19",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "46",
  "47",
  "50",
  "51",
  "52",
  "55",
  "56",
  "57",
  "61",
  "62",
  "63",
  "64",
  "65",
  "67",
  "71",
  "72",
  "73",
  "76",
  "77",
  "80",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
];

export interface DptParcel {
  readonly map_sheet: string;
  readonly land_no: string;
  /** Null where the layer carries no usable name; the caller knows the province from the request. */
  readonly province_name_th: string | null;
  readonly district_name_th: string | null;
  readonly subdistrict_name_th: string | null;
  /** Square metres, as the department computed from the polygon. Null where they publish none. */
  readonly area_sqm: number | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  /**
   * How many polygons carry this ระวาง and this เลขที่ดิน.
   *
   * Usually one. It is not always one — the department's own data repeats a number across split
   * polygons — and a screen that silently showed the first of three would be reporting one parcel's
   * area as the whole holding. The reader is told instead.
   */
  readonly match_count: number;
}

export type DptParcelResult =
  | { readonly outcome: "FOUND"; readonly parcel: DptParcel }
  | { readonly outcome: "NOT_FOUND" }
  /** This province publishes no searchable parcel layer. Not the same as "no such เลขที่ดิน here". */
  | { readonly outcome: "OUTSIDE_COVERAGE" }
  | { readonly outcome: "FAILED"; readonly reason: string; readonly retryable: boolean };

/**
 * What a province's parcel layer is called and how it stores the five columns a lookup needs.
 *
 * Read from the service rather than assumed, because the 57 services do not agree. The layer is
 * numbered 0 in ภูเก็ต and 26 in พิษณุโลก; นครนายก spells the column `land_no` where everyone else
 * spells it `LAND_NO`; ปัตตานี stores เลขที่ดิน as an integer, and quoting an integer is what makes
 * ArcGIS answer "Failed to execute query" rather than "no match". Discovering this costs two
 * requests per province, so the caller is expected to cache the profile.
 */
export interface DptParcelLayer {
  readonly layer_id: number;
  readonly land_field: string;
  readonly land_quoted: boolean;
  readonly map2_quoted: boolean;
  readonly area_field: string | null;
  readonly province_field: string | null;
  readonly district_field: string | null;
  readonly subdistrict_field: string | null;
}

interface EsriField {
  readonly name?: unknown;
  readonly type?: unknown;
}

/** DPT's two spellings for the same column, in the order they are preferred. */
const PROVINCE_FIELDS = ["PRO_NME", "PROV_NAME"] as const;
const DISTRICT_FIELDS = ["APM_NME", "APDOL_NAME"] as const;
const SUBDISTRICT_FIELDS = ["TAM_NME", "TBDOL_NAME"] as const;
const LAND_FIELDS = ["LAND_NO", "land_no"] as const;

function isTextField(fields: Map<string, string>, name: string): boolean {
  return fields.get(name) === "esriFieldTypeString";
}

function firstPresent(fields: Map<string, string>, candidates: readonly string[]): string | null {
  for (const candidate of candidates) {
    if (fields.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Reads a province's service and reports how to query its parcels, or null if it cannot be queried.
 *
 * Null covers three different situations that all mean the same thing to a reader — no parcel
 * layer, a parcel layer without UTMMAP columns, a service that is switched off — and the caller
 * turns it into OUTSIDE_COVERAGE.
 */
export async function describeParcelLayer(
  provinceCode: string,
  options: FetchJsonOptions = {},
): Promise<DptParcelLayer | null> {
  if (!/^\d{2}$/.test(provinceCode)) {
    return null;
  }

  const service = await fetchJson(`${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer?f=json`, options);
  if (service.outcome !== "SUCCESS") {
    return null;
  }
  const layers = (service.payload as { layers?: { id?: unknown; name?: unknown }[] }).layers;
  if (!Array.isArray(layers)) {
    return null;
  }
  const parcelLayer = layers.find(
    (layer) =>
      typeof layer.id === "number" && typeof layer.name === "string" && /PARCEL/i.test(layer.name),
  );
  if (!parcelLayer || typeof parcelLayer.id !== "number") {
    return null;
  }

  const layerId = parcelLayer.id;
  const meta = await fetchJson(
    `${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer/${layerId}?f=json`,
    options,
  );
  if (meta.outcome !== "SUCCESS") {
    return null;
  }

  const fields = new Map<string, string>();
  for (const field of (meta.payload as { fields?: EsriField[] }).fields ?? []) {
    if (typeof field.name === "string" && typeof field.type === "string") {
      fields.set(field.name, field.type);
    }
  }

  const landField = firstPresent(fields, LAND_FIELDS);
  const addressable = ["UTMMAP1", "UTMMAP2", "UTMMAP3", "UTMMAP4"].every((name) =>
    fields.has(name),
  );
  if (!landField || !addressable) {
    return null;
  }

  return {
    layer_id: layerId,
    land_field: landField,
    land_quoted: isTextField(fields, landField),
    map2_quoted: isTextField(fields, "UTMMAP2"),
    area_field: fields.has("AREA") ? "AREA" : null,
    province_field: firstPresent(fields, PROVINCE_FIELDS),
    district_field: firstPresent(fields, DISTRICT_FIELDS),
    subdistrict_field: firstPresent(fields, SUBDISTRICT_FIELDS),
  };
}

const ROMAN = ["", "I", "II", "III", "IV"] as const;

/**
 * Splits a ระวาง as written on a deed into the four columns DPT stores it in.
 *
 * The same split and the same tolerance as the stored lookup (docs/adr/0007): a reader copying off
 * a paper document should not have to care whether they typed "4625 II 2488-02" or "4625 ii 2488
 * 02". Returns null when the shape is not a ระวาง at all, so the caller can say so rather than
 * search for nothing.
 */
export function parseDptMapSheet(
  input: string,
): { map1: string; map2: number; map3: string; map4: string } | null {
  const parts = input
    .trim()
    .toUpperCase()
    .split(/[\s\-/]+/)
    .filter(Boolean);
  if (parts.length < 4) {
    return null;
  }
  const [map1, roman, map3, map4] = parts;
  if (!map1 || !roman || !map3 || !map4) {
    return null;
  }
  const map2 = ROMAN.indexOf(roman as (typeof ROMAN)[number]);
  if (!/^\d{4}$/.test(map1) || map2 < 1 || !/^\d{3,4}$/.test(map3) || !/^\d{1,2}$/.test(map4)) {
    return null;
  }
  // DOL and DPT both pad the last part to two digits; a reader writing "2" means "02".
  return { map1, map2, map3, map4: map4.padStart(2, "0") };
}

/**
 * Placeholders the department's own import left behind, which are not names.
 *
 * นครราชสีมา and เชียงใหม่ fill every row's ตำบล with "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน"
 * and the province with "ไม่มีจังหวัด". Printed under "ที่ตั้ง" that reads as an answer; dropped, the
 * screen falls back to the province the reader chose, which is at least true.
 */
function realName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (text === "" || text.startsWith("ไม่มี") || text.includes("เพื่อการนำเข้าข้อมูล")) {
    return null;
  }
  return text;
}

/** A parcel's centre, averaged over the outline DPT returns. Enough to drop a pin on. */
function centreOf(geometry: unknown): { latitude: number; longitude: number } | null {
  const rings = (geometry as { rings?: unknown } | undefined)?.rings;
  if (!Array.isArray(rings) || !Array.isArray(rings[0]) || rings[0].length === 0) {
    return null;
  }
  const points = rings[0] as [number, number][];
  const longitude = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const latitude = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  // Thailand, generously bounded. A ring in the wrong SR lands in the Gulf of Guinea, and a pin
  // offered there is worse than no pin.
  const inThailand = latitude > 5 && latitude < 21 && longitude > 97 && longitude < 106;
  return Number.isFinite(latitude) && inThailand ? { latitude, longitude } : null;
}

export async function findDptParcel(
  provinceCode: string,
  mapSheet: string,
  landNo: string,
  layer: DptParcelLayer,
  options: FetchJsonOptions = {},
): Promise<DptParcelResult> {
  const sheet = parseDptMapSheet(mapSheet);
  const land = landNo.trim();
  if (!sheet || !/^\d{1,12}$/.test(land) || !/^\d{2}$/.test(provinceCode)) {
    return { outcome: "NOT_FOUND" };
  }

  /**
   * Built only from values already proved to be digits and a Roman numeral.
   *
   * This is a SQL-ish `where` clause on someone else's server, assembled from two strings that
   * came out of a text box. `parseDptMapSheet` and the digits-only test above are the control that
   * makes that safe — every part is matched against a numeric pattern before it is interpolated, so
   * nothing a reader can type reaches the service as syntax. Quoting is for the column's type, not
   * for safety: ปัตตานี stores เลขที่ดิน as an integer and rejects a quoted one outright.
   */
  const quote = (value: string, quoted: boolean) => (quoted ? `'${value}'` : value);
  const where = [
    `UTMMAP1='${sheet.map1}'`,
    `UTMMAP2=${quote(String(sheet.map2), layer.map2_quoted)}`,
    `UTMMAP3='${sheet.map3}'`,
    `UTMMAP4='${sheet.map4}'`,
    `${layer.land_field}=${quote(land, layer.land_quoted)}`,
  ].join(" AND ");

  const outFields = [
    layer.land_field,
    layer.area_field,
    layer.province_field,
    layer.district_field,
    layer.subdistrict_field,
  ].filter((field): field is string => field !== null);

  const url = new URL(`${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer/${layer.layer_id}/query`);
  for (const [key, value] of Object.entries({
    where,
    outFields: outFields.join(","),
    returnGeometry: "true",
    outSR: "4326",
    // About 0.1m of ground. Any more is transferring noise for a pin a reader confirms by eye.
    geometryPrecision: "6",
    f: "json",
  })) {
    url.searchParams.set(key, value);
  }

  const result = await fetchJson(url.toString(), options);
  if (result.outcome !== "SUCCESS") {
    return { outcome: "FAILED", reason: result.reason, retryable: result.retryable };
  }

  // ArcGIS answers a stopped or missing service with HTTP 200 and an error body.
  const error = (result.payload as { error?: { message?: unknown } }).error;
  if (error) {
    const message = typeof error.message === "string" ? error.message : "query failed";
    return /not found|could not find service|service may be stopped/i.test(message)
      ? { outcome: "OUTSIDE_COVERAGE" }
      : { outcome: "FAILED", reason: message, retryable: false };
  }

  const features = (result.payload as { features?: unknown[] }).features;
  const first = Array.isArray(features) ? features[0] : undefined;
  if (!first) {
    return { outcome: "NOT_FOUND" };
  }

  const attributes = (first as { attributes?: Record<string, unknown> }).attributes ?? {};
  const centre = centreOf((first as { geometry?: unknown }).geometry);
  const area = layer.area_field ? Number(attributes[layer.area_field]) : Number.NaN;
  const name = (field: string | null) => (field ? realName(attributes[field]) : null);

  return {
    outcome: "FOUND",
    parcel: {
      map_sheet: `${sheet.map1} ${ROMAN[sheet.map2]} ${sheet.map3}-${sheet.map4}`,
      land_no: land,
      province_name_th: name(layer.province_field),
      district_name_th: name(layer.district_field),
      subdistrict_name_th: name(layer.subdistrict_field),
      area_sqm: Number.isFinite(area) && area > 0 ? area : null,
      latitude: centre?.latitude ?? null,
      longitude: centre?.longitude ?? null,
      match_count: (features ?? []).length,
    },
  };
}
