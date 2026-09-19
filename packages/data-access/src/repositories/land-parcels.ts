import type { Db } from "../connection.js";

/**
 * Parcel identity lookup against the Land Department's open data (docs/adr/0007).
 *
 * The one query this table exists for: a reader holds a deed, reads the ระวาง and the เลขที่ดิน off
 * it, and wants to know where that parcel is and how big. Everything here is DOL's own published
 * figure — the area they computed from the polygon, the centre they published with it.
 *
 * What a hit does NOT establish is that the parcel belongs to the reader, or that it is the one
 * they are looking at. Ownership is not in this data at all. The screen says so, and the pin the
 * lookup offers to place stays a suggestion the reader confirms.
 */

export interface LandParcel {
  readonly land_no: string;
  readonly map_sheet: string;
  readonly province_name_th: string | null;
  readonly district_name_th: string | null;
  readonly subdistrict_name_th: string | null;
  /** DOL's own area in square metres. Null where they published none. */
  readonly area_sqm: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface ParcelCoverage {
  readonly province_code: string;
  readonly province_name_th: string;
  readonly licence: string;
  readonly published_by: string;
  readonly parcels: number;
}

/** ระวาง as it is written on a deed: "5137 II 9854-09". */
const ROMAN = ["", "I", "II", "III", "IV"] as const;

/**
 * Splits a ระวาง as written into the four parts DOL stores it in.
 *
 * Deliberately forgiving about separators and about the Roman numeral's case, because a reader is
 * copying a string off a paper document and the difference between "5137 II 9854-09" and
 * "5137 ii 9854 09" is not a difference they should have to care about. Returns null when the
 * shape is not a ระวาง at all, so the caller can say so rather than search for nothing.
 */
export function parseMapSheet(input: string): {
  map1: string;
  map2: number;
  map3: string;
  map4: string;
} | null {
  const parts = input
    .trim()
    .toUpperCase()
    .split(/[\s\-/]+/)
    .filter(Boolean);
  if (parts.length < 4) return null;
  const [map1, roman, map3, map4] = parts;
  if (!map1 || !roman || !map3 || !map4) return null;
  const map2 = ROMAN.indexOf(roman as (typeof ROMAN)[number]);
  if (!/^\d{4}$/.test(map1) || map2 < 1 || !/^\d{3,4}$/.test(map3)) return null;
  // DOL pads the last part to two digits; a reader writing "9" means "09".
  return { map1, map2, map3, map4: map4.padStart(2, "0") };
}

export async function findParcel(
  db: Db,
  mapSheet: string,
  landNo: string,
): Promise<LandParcel | null> {
  const sheet = parseMapSheet(mapSheet);
  if (!sheet) return null;

  const { rows } = await db.executeQuery<LandParcel>({
    sql: `SELECT land_no,
                 utm_map_1 || ' ' ||
                   (ARRAY['','I','II','III','IV'])[utm_map_2 + 1] || ' ' ||
                   utm_map_3 || '-' || utm_map_4 AS map_sheet,
                 province_name_th, district_name_th, subdistrict_name_th,
                 area_sqm::text AS area_sqm,
                 ST_Y(centroid::geometry) AS latitude,
                 ST_X(centroid::geometry) AS longitude
            FROM reference.land_parcel
           WHERE utm_map_1 = $1 AND utm_map_2 = $2 AND utm_map_3 = $3 AND utm_map_4 = $4
             AND land_no = $5
           LIMIT 1`,
    parameters: [sheet.map1, sheet.map2, sheet.map3, sheet.map4, landNo.trim()],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows[0] ?? null;
}

/**
 * Which provinces can be searched at all, with how many parcels each holds.
 *
 * Sent to the client so the search box can say "ปทุมธานี is covered, ชลบุรี is not" before a reader
 * types, instead of letting an empty result imply their deed number is wrong.
 */
export async function parcelCoverage(db: Db): Promise<ParcelCoverage[]> {
  const { rows } = await db.executeQuery<ParcelCoverage>({
    sql: `SELECT c.province_code, c.province_name_th, c.licence, c.published_by,
                 count(p.id)::int AS parcels
            FROM reference.land_parcel_coverage c
            LEFT JOIN reference.land_parcel p ON p.province_code = c.province_code
           GROUP BY c.province_code, c.province_name_th, c.licence, c.published_by
           ORDER BY parcels DESC, c.province_name_th`,
    parameters: [],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows;
}
