import { type FetchJsonOptions, fetchJson } from "../http.js";

/**
 * Where to open the map for a chosen area (docs/adr/0006).
 *
 * Convenience only, and that framing decides the whole design. A wrong centre costs the reader a
 * pan; it can never cost them a wrong answer, because nothing is measured from it — distances are
 * measured from the pin the reader places. This is why a coarse fallback is acceptable here and
 * would not be acceptable anywhere else in the product.
 *
 * Probed on 2026-09-18: `อำเภอเมืองชลบุรี` and `ตำบลลำปางหลวง` both resolved to their
 * administrative areas, but `ตำบลแสนสุข` returned a health centre — OSM carries roughly 12% of
 * Thai tambon boundaries (docs/data-sources/osm.md). So the search runs most specific first and
 * accepts only an administrative match, falling back to the district and then the province rather
 * than accepting whatever POI happens to share the name.
 */

export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

export interface AreaCentre {
  readonly latitude: number;
  readonly longitude: number;
  /** Which level actually answered, so the caller can pick a sensible zoom. */
  readonly level: "SUBDISTRICT" | "DISTRICT" | "PROVINCE";
}

interface NominatimRow {
  readonly lat?: string;
  readonly lon?: string;
  readonly class?: string;
  readonly type?: string;
}

/**
 * True for a row describing an administrative area rather than something that merely sits in one.
 *
 * Preferred, not required. Insisting on it returned nothing at all for ชลบุรี: `ตำบลแสนสุข
 * อำเภอเมืองชลบุรี` matches a health centre, and `อำเภอเมืองชลบุรี ชลบุรี` matches the town of
 * ชลบุรี as `class=place, type=town` rather than as a boundary. The town is the right place to
 * open the map on, so rejecting it bought nothing and cost the reader a pan across the country.
 * A boundary is still preferred where one exists, because its centre is the area's centre rather
 * than a point somewhere inside it.
 */
function isAdministrative(row: NominatimRow): boolean {
  return row.class === "boundary" || row.type === "administrative";
}

async function lookup(query: string, options: FetchJsonOptions): Promise<NominatimRow[]> {
  const url = `${NOMINATIM_ENDPOINT}?format=json&limit=5&countrycodes=th&q=${encodeURIComponent(query)}`;
  const response = await fetchJson(url, { timeoutMs: 15_000, ...options });
  if (response.outcome !== "SUCCESS" || !Array.isArray(response.payload)) {
    return [];
  }
  return response.payload as NominatimRow[];
}

function toCentre(row: NominatimRow, level: AreaCentre["level"]): AreaCentre | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude, level }
    : null;
}

export async function geocodeArea(
  names: {
    readonly subdistrict_th: string;
    readonly district_th: string;
    readonly province_th: string;
  },
  options: FetchJsonOptions = {},
): Promise<AreaCentre | null> {
  // Bangkok's divisions are named differently, and a query built with the wrong words finds
  // nothing rather than finding the wrong thing.
  const bangkok = names.province_th === "กรุงเทพมหานคร";
  const subdistrict = `${bangkok ? "แขวง" : "ตำบล"}${names.subdistrict_th} ${bangkok ? "เขต" : "อำเภอ"}${names.district_th}`;
  const district = `${bangkok ? "เขต" : "อำเภอ"}${names.district_th} ${names.province_th}`;

  // Most specific first, stopping at the first level that answers. Each miss costs one request,
  // and the result is cached by the caller so an area is asked about once.
  const attempts: readonly [string, AreaCentre["level"]][] = [
    [subdistrict, "SUBDISTRICT"],
    [district, "DISTRICT"],
    [names.province_th, "PROVINCE"],
  ];

  // The best non-administrative match seen so far, kept from the most specific level that
  // returned anything, and used only if no level yields a boundary.
  let fallback: AreaCentre | null = null;

  for (const [query, level] of attempts) {
    const rows = await lookup(query, options);
    const administrative = rows.find(isAdministrative);
    if (administrative) {
      const centre = toCentre(administrative, level);
      if (centre) {
        return centre;
      }
    }
    const first = rows[0];
    if (!fallback && first) {
      fallback = toCentre(first, level);
    }
  }
  return fallback;
}
