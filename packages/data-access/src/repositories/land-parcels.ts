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
  /**
   * The administrative area this parcel sits in, as ids the picker can select.
   *
   * Resolved here so a reader who found their parcel is not then asked where it is: the lookup
   * already knows, and asking twice was the single loudest complaint about this form. Null when
   * DOL's names do not match the reference table, which is the honest outcome for roughly three
   * percent of parcels and leaves the reader picking the area by hand as before.
   */
  readonly province_id: string | null;
  readonly district_id: string | null;
  readonly subdistrict_id: string | null;
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
    sql: `SELECT lp.land_no,
                 lp.utm_map_1 || ' ' ||
                   (ARRAY['','I','II','III','IV'])[lp.utm_map_2 + 1] || ' ' ||
                   lp.utm_map_3 || '-' || lp.utm_map_4 AS map_sheet,
                 lp.province_name_th, lp.district_name_th, lp.subdistrict_name_th,
                 lp.area_sqm::text AS area_sqm,
                 ST_Y(lp.centroid::geometry) AS latitude,
                 ST_X(lp.centroid::geometry) AS longitude,
                 pv.id AS province_id, d.id AS district_id, sd.id AS subdistrict_id
            FROM reference.land_parcel lp
            -- DOL annotates a district with the branch office that covers it, as
            -- "ลำลูกกา(หนองจอก)". The reference table knows the district, not the branch, so the
            -- annotation is stripped before matching; without this, one parcel in thirty resolves
            -- to nothing for a reason that has nothing to do with the parcel.
            LEFT JOIN reference.administrative_area pv
                   ON pv.level = 'PROVINCE' AND pv.valid_to IS NULL
                  AND pv.name_th = lp.province_name_th
            LEFT JOIN reference.administrative_area d
                   ON d.level = 'DISTRICT' AND d.valid_to IS NULL AND d.parent_id = pv.id
                  AND d.name_th = split_part(lp.district_name_th, '(', 1)
            LEFT JOIN reference.administrative_area sd
                   ON sd.level = 'SUBDISTRICT' AND sd.valid_to IS NULL AND sd.parent_id = d.id
                  AND sd.name_th = lp.subdistrict_name_th
           WHERE lp.utm_map_1 = $1 AND lp.utm_map_2 = $2 AND lp.utm_map_3 = $3
             AND lp.utm_map_4 = $4 AND lp.land_no = $5
           LIMIT 1`,
    parameters: [sheet.map1, sheet.map2, sheet.map3, sheet.map4, landNo.trim()],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows[0] ?? null;
}

export interface ResolvedAreaIds {
  /** The chosen province's own name, for the provinces whose parcels carry none. */
  readonly province_name_th: string | null;
  readonly province_id: string | null;
  readonly district_id: string | null;
  readonly subdistrict_id: string | null;
}

/**
 * Turns the names a live parcel lookup returns into ids the area picker can select.
 *
 * The stored lookup resolves this in its own query, because the parcel row and the reference table
 * are in the same database. A parcel located live at กรมโยธาธิการและผังเมือง arrives as three Thai
 * names and a province code instead, and without this step the form would ask a reader where their
 * land is immediately after telling them — the duplication that the stored lookup existed to end.
 *
 * Nulls are expected and are not failures. Several of DPT's provinces publish the polygons with no
 * name columns at all, and a few fill them with the import placeholder the adapter strips, so the
 * province usually resolves from its code and the two narrower levels sometimes do not.
 */
export async function resolveAreaIdsByName(
  db: Db,
  provinceCode: string,
  districtName: string | null,
  subdistrictName: string | null,
): Promise<ResolvedAreaIds> {
  if (!/^\d{1,2}$/.test(provinceCode)) {
    return { province_name_th: null, province_id: null, district_id: null, subdistrict_id: null };
  }

  const { rows } = await db.executeQuery<ResolvedAreaIds>({
    sql: `SELECT pv.name_th AS province_name_th, pv.id AS province_id,
                 d.id AS district_id, sd.id AS subdistrict_id
            FROM reference.administrative_area pv
            -- The branch-office annotation DOL writes as "ลำลูกกา(หนองจอก)" is stripped before
            -- matching, exactly as the stored lookup strips it: the reference table knows the
            -- district, not the branch that covers it.
            LEFT JOIN reference.administrative_area d
                   ON d.level = 'DISTRICT' AND d.valid_to IS NULL AND d.parent_id = pv.id
                  AND d.name_th = split_part($2, '(', 1)
            LEFT JOIN reference.administrative_area sd
                   ON sd.level = 'SUBDISTRICT' AND sd.valid_to IS NULL AND sd.parent_id = d.id
                  AND sd.name_th = $3
           WHERE pv.level = 'PROVINCE' AND pv.valid_to IS NULL AND pv.code = $1
           LIMIT 1`,
    parameters: [Number(provinceCode), districtName ?? "", subdistrictName ?? ""],
    query: { kind: "SelectQueryNode" } as never,
  });
  return (
    rows[0] ?? {
      province_name_th: null,
      province_id: null,
      district_id: null,
      subdistrict_id: null,
    }
  );
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
