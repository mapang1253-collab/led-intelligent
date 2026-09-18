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
/**
 * A fixed handful of areas by id, for the front page's "somewhere to start" list.
 *
 * Which places appear is a product decision and lives in the client beside the familiar name each
 * is actually known by — ทองหล่อ rather than แขวงคลองตันเหนือ. This function only fills in the
 * figures, and it returns them in the order asked for rather than in any order of its own, because
 * the caller's order is the only one that carries meaning here.
 */
export async function areasByIds(db: Db, ids: readonly string[]): Promise<AreaChoice[]> {
  if (ids.length === 0) {
    return [];
  }
  const { rows } = await db.executeQuery<AreaChoice>({
    sql: `${AREA_CHOICE_SQL} AND sd.id = ANY($1)`,
    parameters: [ids as string[]],
    query: { kind: "SelectQueryNode" } as never,
  });
  const byId = new Map(rows.map((row) => [row.subdistrict_id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/** Side-by-side figures for a handful of areas, for the shortlist's comparison table. */
export interface AreaComparison {
  subdistrict_id: string;
  subdistrict_name_th: string;
  district_name_th: string;
  province_name_th: string;
  /** Lowest and highest published figure, as decimal strings. Null when the area has none. */
  condominium_low: string | null;
  condominium_high: string | null;
  condominium_count: number;
  /** Which area the figures actually describe: this subdistrict, or the district containing it. */
  condominium_level: "SUBDISTRICT" | "DISTRICT" | null;
  land_low: string | null;
  land_high: string | null;
  land_count: number;
  land_level: "SUBDISTRICT" | "DISTRICT" | null;
  population: string | null;
}

/**
 * The figures a reader is actually choosing between, for several areas at once.
 *
 * Figures for the subdistrict itself are preferred, and the district that contains it is used only
 * when the subdistrict has none of that measure — which is the ordinary case for land, published
 * district by district. Whichever it used is returned with the span, because a comparison is the
 * worst place to borrow a containing area's number silently: two subdistricts of one district would
 * show the same land price, and a reader who was not told the level would read that as a finding
 * about each place rather than as one figure covering both.
 *
 * The count travels with the span too, so an area backed by four figures is not read as though it
 * were backed by four hundred.
 *
 * A span, never a mean — docs/adr/0002. A published range contributes both of its ends, because
 * both are figures the source stated.
 */
export async function areaComparison(db: Db, ids: readonly string[]): Promise<AreaComparison[]> {
  if (ids.length === 0) {
    return [];
  }
  // One pass per measure: take the subdistrict's own figures, and fall back to the district's only
  // when there are none. `level` names which of the two the row came from.
  const spanFor = (measureId: string) => `
    SELECT low, high, n, level FROM (
      SELECT min(coalesce(ov.value_low, ov.value_scalar))  AS low,
             max(coalesce(ov.value_high, ov.value_scalar)) AS high,
             count(*)::int                                 AS n,
             o.geography_level                             AS level,
             CASE WHEN o.admin_area_id = sd.id THEN 0 ELSE 1 END AS preference
        FROM evidence.observation o
        JOIN evidence.observation_value ov ON ov.observation_id = o.id
       WHERE o.is_current
         AND o.measure_id = '${measureId}'
         AND o.admin_area_id IN (sd.id, d.id)
       GROUP BY o.geography_level, preference
       ORDER BY preference
       LIMIT 1
    ) best`;

  const { rows } = await db.executeQuery<AreaComparison>({
    sql: `
      SELECT sd.id       AS subdistrict_id,
             sd.name_th  AS subdistrict_name_th,
             d.name_th   AS district_name_th,
             p.name_th   AS province_name_th,
             c.low::text  AS condominium_low,
             c.high::text AS condominium_high,
             COALESCE(c.n, 0) AS condominium_count,
             c.level      AS condominium_level,
             l.low::text  AS land_low,
             l.high::text AS land_high,
             COALESCE(l.n, 0) AS land_count,
             l.level      AS land_level,
             pop.value::text  AS population
        FROM reference.administrative_area sd
        JOIN reference.administrative_area d ON d.id = sd.parent_id
        JOIN reference.administrative_area p ON p.id = d.parent_id
        LEFT JOIN LATERAL (${spanFor("assessed_condominium_value_per_sqm")}) c ON true
        LEFT JOIN LATERAL (${spanFor("assessed_land_value_per_sqwa")}) l ON true
        LEFT JOIN LATERAL (
          SELECT ov.value_scalar AS value
            FROM evidence.observation o
            JOIN evidence.observation_value ov ON ov.observation_id = o.id
           WHERE o.is_current
             AND o.measure_id = 'registered_population'
             AND o.admin_area_id = sd.id
           LIMIT 1
        ) pop ON true
       WHERE sd.level = 'SUBDISTRICT' AND sd.valid_to IS NULL AND sd.id = ANY($1)`,
    parameters: [ids as string[]],
    query: { kind: "SelectQueryNode" } as never,
  });
  // The caller's order is the reader's order — the sequence they starred them in.
  const byId = new Map(rows.map((row) => [row.subdistrict_id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

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

/** What a source currently contributes, for the status screen. */
export interface SourceStatus {
  product_id: string;
  title_th: string;
  attribution_th: string;
  activation_state: string;
  coverage_note_th: string | null;
  observations: number;
  reviewers: string[] | null;
  reviewed_at: string | null;
}

/**
 * Every registered source with its activation state and how many current figures it holds.
 *
 * Inactive products are included rather than filtered out: a status screen that lists only what is
 * switched on cannot answer "why is there no land price here", which is the question it exists for.
 *
 * The counts are one grouped pass over the observation table, not a correlated subquery per
 * product. Written the obvious way — a LATERAL count beside each row — this took six seconds
 * against 74,000 observations, because it walked them once per source; a status page nobody can
 * wait for cannot report on anything.
 */
export async function sourceStatuses(db: Db): Promise<SourceStatus[]> {
  const { rows } = await db.executeQuery<SourceStatus>({
    sql: `WITH counts AS (
            SELECT pv.source_product_id AS product_key, count(*)::int AS n
              FROM evidence.observation ob
              JOIN source.product_version pv ON pv.id = ob.source_product_version_id
             WHERE ob.is_current
             GROUP BY pv.source_product_id
          )
          SELECT p.product_id, p.title_th, p.attribution_th, p.activation_state,
                 p.coverage_note_th,
                 COALESCE(c.n, 0) AS observations,
                 ar.reviewer_names AS reviewers,
                 to_char(ar.reviewed_at, 'YYYY-MM-DD') AS reviewed_at
            FROM source.source_product p
            LEFT JOIN counts c ON c.product_key = p.id
            LEFT JOIN source.activation_record ar ON ar.id = p.activation_record_id
           ORDER BY p.activation_state DESC, p.product_id`,
    parameters: [],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows;
}

/** Today's AI usage against the recorded ceiling, for the status screen. */
export interface AiStatus {
  calls_today: number;
  outcomes: { outcome: string; n: number }[];
}

export async function aiStatus(db: Db): Promise<AiStatus> {
  const { rows } = await db.executeQuery<{ outcome: string; n: number }>({
    sql: `SELECT outcome, count(*)::int AS n
            FROM operations.ai_call_log
           WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok')
           GROUP BY outcome
           ORDER BY n DESC`,
    parameters: [],
    query: { kind: "SelectQueryNode" } as never,
  });
  return {
    calls_today: rows.reduce((sum, row) => sum + row.n, 0),
    outcomes: rows,
  };
}
