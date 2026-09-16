import type { Kysely } from "kysely";
import type { Db } from "../connection.js";
import type { Database } from "../schema.js";

export interface AdministrativeAreaSummary {
  id: string;
  code: number;
  name_th: string;
  name_en: string | null;
}

/** GET /api/v1/administrative-areas/provinces (docs/api-contracts.md §3). */
export async function listProvinces(db: Kysely<Database>): Promise<AdministrativeAreaSummary[]> {
  return db
    .selectFrom("reference.administrative_area")
    .select(["id", "code", "name_th", "name_en"])
    .where("level", "=", "PROVINCE")
    .where("valid_to", "is", null)
    .orderBy("code")
    .execute();
}

/** GET /api/v1/administrative-areas/districts?province_id=... */
export async function listDistricts(
  db: Kysely<Database>,
  provinceId: string,
): Promise<AdministrativeAreaSummary[]> {
  return db
    .selectFrom("reference.administrative_area")
    .select(["id", "code", "name_th", "name_en"])
    .where("level", "=", "DISTRICT")
    .where("parent_id", "=", provinceId)
    .where("valid_to", "is", null)
    .orderBy("code")
    .execute();
}

/** GET /api/v1/administrative-areas/subdistricts?district_id=... */
export async function listSubdistricts(
  db: Kysely<Database>,
  districtId: string,
): Promise<AdministrativeAreaSummary[]> {
  return db
    .selectFrom("reference.administrative_area")
    .select(["id", "code", "name_th", "name_en"])
    .where("level", "=", "SUBDISTRICT")
    .where("parent_id", "=", districtId)
    .where("valid_to", "is", null)
    .orderBy("code")
    .execute();
}

/**
 * Confirms that a subdistrict really sits inside that district, inside that province.
 *
 * The intake form can only offer consistent choices, but the form is not the only way to reach the
 * API. Without this check a crafted request produces an analysis whose resolved target names a
 * place that does not exist — a subdistrict from one province under a district from another — and
 * the screen presents it as fact. Trusting the client here would put a false statement on the one
 * screen this system exists to keep honest.
 */
export async function administrativeChainIsValid(
  db: Db,
  provinceId: string,
  districtId: string,
  subdistrictId: string,
): Promise<boolean> {
  const row = await db
    .selectFrom("reference.administrative_area as sub")
    .innerJoin("reference.administrative_area as dis", "dis.id", "sub.parent_id")
    .innerJoin("reference.administrative_area as prov", "prov.id", "dis.parent_id")
    .select("sub.id")
    .where("sub.id", "=", subdistrictId)
    .where("sub.level", "=", "SUBDISTRICT")
    .where("sub.valid_to", "is", null)
    .where("dis.id", "=", districtId)
    .where("dis.level", "=", "DISTRICT")
    .where("prov.id", "=", provinceId)
    .where("prov.level", "=", "PROVINCE")
    .executeTakeFirst();
  return row !== undefined;
}

/**
 * A place the reader can pick, with what is actually known about it.
 *
 * The counts exist so nobody chooses an area and only then discovers the system has nothing to say
 * about it. They are counts of published figures, nothing more: an area with more of them is
 * better documented, not better to invest in, and no ordering here may be read as a ranking of
 * places (docs/output-policy.md).
 */
export interface AreaChoice {
  subdistrict_id: string;
  subdistrict_name_th: string;
  district_id: string;
  district_name_th: string;
  province_id: string;
  province_name_th: string;
  /** Named buildings priced in this subdistrict or the district containing it. */
  condominium_figures: number;
  /** Land units priced in this subdistrict or the district containing it. */
  land_figures: number;
  /** Whether this subdistrict has its own population figures, rather than only its province's. */
  has_own_population: boolean;
  /**
   * A building here whose name contains what was typed, when that — not the area's name — is why
   * this area matched. People say "พัทยา" and "บางแสน"; the administrative names are หนองปรือ and
   * แสนสุข, so a search that only reads area names fails the words readers actually use.
   */
  matched_building_th: string | null;
}

/**
 * Counts property-price figures reachable from each subdistrict — its own and its district's,
 * which is the same widening the evidence stage performs, so the badge cannot promise more than
 * the run will find. Province-level figures are excluded: every area in Thailand has those, so
 * counting them would tell the reader nothing about the place they picked.
 */
const AREA_CHOICE_SQL = `
  SELECT sd.id            AS subdistrict_id,
         sd.name_th       AS subdistrict_name_th,
         d.id             AS district_id,
         d.name_th        AS district_name_th,
         p.id             AS province_id,
         p.name_th        AS province_name_th,
         COALESCE(c.n, 0)::int AS condominium_figures,
         COALESCE(l.n, 0)::int AS land_figures,
         COALESCE(pop.n, 0) > 0 AS has_own_population,
         NULL::text AS matched_building_th
    FROM reference.administrative_area sd
    JOIN reference.administrative_area d ON d.id = sd.parent_id
    JOIN reference.administrative_area p ON p.id = d.parent_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS n FROM evidence.observation o
       WHERE o.is_current
         AND o.measure_id = 'assessed_condominium_value_per_sqm'
         AND o.admin_area_id IN (sd.id, d.id)
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS n FROM evidence.observation o
       WHERE o.is_current
         AND o.measure_id = 'assessed_land_value_per_sqwa'
         AND o.admin_area_id IN (sd.id, d.id)
    ) l ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS n FROM evidence.observation o
       WHERE o.is_current
         AND o.measure_id = 'registered_population'
         AND o.admin_area_id = sd.id
    ) pop ON true
   WHERE sd.level = 'SUBDISTRICT' AND sd.valid_to IS NULL
`;

/**
 * Finds places by any part of their own, their district's or their province's name, so "พัทยา",
 * "ศรีราชา" and "ชลบุรี" all reach somewhere sensible.
 */
export async function searchAreas(db: Db, query: string, limit = 20): Promise<AreaChoice[]> {
  const term = query.trim();
  if (term === "") {
    return [];
  }
  const pattern = `%${term.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
  const { rows } = await db.executeQuery<AreaChoice>({
    sql: `WITH area AS (${AREA_CHOICE_SQL}),
      -- Buildings whose own names carry the word. The cohort reads "ชื่ออาคาร · ประเภทการใช้",
      -- so only the part before the separator is a name, and one example per area is enough to
      -- show the reader why this place came back.
      by_building AS (
        SELECT o.admin_area_id,
               min(split_part(o.population_th, ' · ', 1)) AS building_th
          FROM evidence.observation o
         WHERE o.is_current
           AND o.measure_id = 'assessed_condominium_value_per_sqm'
           AND split_part(o.population_th, ' · ', 1) ILIKE $1
         GROUP BY o.admin_area_id
      )
      SELECT a.subdistrict_id, a.subdistrict_name_th, a.district_id, a.district_name_th,
             a.province_id, a.province_name_th, a.condominium_figures, a.land_figures,
             a.has_own_population,
             CASE WHEN a.subdistrict_name_th ILIKE $1 OR a.district_name_th ILIKE $1
                       OR a.province_name_th ILIKE $1
                  THEN NULL ELSE COALESCE(bs.building_th, bd.building_th) END
               AS matched_building_th
        FROM area a
        LEFT JOIN by_building bs ON bs.admin_area_id = a.subdistrict_id
        LEFT JOIN by_building bd ON bd.admin_area_id = a.district_id
       WHERE a.subdistrict_name_th ILIKE $1 OR a.district_name_th ILIKE $1
          OR a.province_name_th ILIKE $1
          OR bs.admin_area_id IS NOT NULL OR bd.admin_area_id IS NOT NULL
       -- An exact subdistrict name is what the reader typed; a province match is the loosest, and
       -- a building-name match sits between the two.
       ORDER BY (a.subdistrict_name_th = $2) DESC,
                (a.subdistrict_name_th ILIKE $1) DESC,
                (a.district_name_th ILIKE $1) DESC,
                (bs.admin_area_id IS NOT NULL) DESC,
                a.condominium_figures DESC, a.subdistrict_id
       LIMIT $3`,
    parameters: [pattern, term, limit],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows;
}

/**
 * A handful of places to start from, for a reader who does not yet have one in mind.
 *
 * Ordered by how much property evidence each has, which is a statement about this system's
 * coverage and not about the places. The screen that shows these must say so.
 */
export async function wellDocumentedAreas(db: Db, limit = 6): Promise<AreaChoice[]> {
  const { rows } = await db.executeQuery<AreaChoice>({
    sql: `${AREA_CHOICE_SQL}
     ORDER BY condominium_figures DESC, land_figures DESC, sd.code
     LIMIT $1`,
    parameters: [limit],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows;
}
