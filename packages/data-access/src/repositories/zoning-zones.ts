import type { Kysely } from "kysely";
import type { Database } from "../schema.js";

type Db = Kysely<Database>;

/**
 * Stored city-plan zone reference (docs/adr/0008, migration 0013).
 *
 * Four of the five requests a zoning lookup makes answer the same question every time — what zone
 * 4400 of plan 1300000 is called, what colour it is drawn in, what the regulation permits and
 * forbids there. That answer is published reference data, so it is read from DPT once and kept.
 * Only the point-to-zone step still goes out on every lookup, which is why nothing in this table
 * can be traced to a reader: the coordinate they pinned is never written here.
 */
export interface ZoneReference {
  readonly zone_name_th: string;
  readonly colour: string | null;
  readonly permitted_th: string | null;
  readonly prohibited_th: readonly string[];
}

export interface ZoneKey {
  readonly planId: string;
  readonly zoneCode: string;
}

const key = (planId: string, zoneCode: string) => `${planId}\u0000${zoneCode}`;

/**
 * The zones among `keys` that are already known, as a map keyed by `plan\0zone`.
 *
 * One query for the whole set rather than one per zone: a point can fall in several plans at once
 * (สันทราย falls in a town plan and the province plan), and this runs while a reader waits.
 */
export async function loadZoneReferences(
  db: Db,
  keys: readonly ZoneKey[],
): Promise<Map<string, ZoneReference>> {
  const found = new Map<string, ZoneReference>();
  if (keys.length === 0) {
    return found;
  }

  const { rows } = await db.executeQuery<{
    plan_id: string;
    zone_code: string;
    zone_name_th: string;
    colour: string | null;
    permitted_th: string | null;
    prohibited_th: unknown;
  }>({
    sql: `SELECT plan_id, zone_code, zone_name_th, colour, permitted_th, prohibited_th
            FROM reference.dpt_zoning_zone
           WHERE (plan_id, zone_code) = ANY (
                   SELECT unnest($1::text[]), unnest($2::text[])
                 )`,
    parameters: [keys.map((k) => k.planId), keys.map((k) => k.zoneCode)],
    query: { kind: "SelectQueryNode" } as never,
  });

  for (const row of rows) {
    found.set(key(row.plan_id, row.zone_code), {
      zone_name_th: row.zone_name_th,
      colour: row.colour,
      permitted_th: row.permitted_th,
      // jsonb comes back parsed from `pg`; the guard is for a row written by something else.
      prohibited_th: Array.isArray(row.prohibited_th) ? (row.prohibited_th as string[]) : [],
    });
  }
  return found;
}

/**
 * Records what DPT said about a zone.
 *
 * `DO NOTHING` on conflict, not `DO UPDATE`: two readers can look up the same zone at the same
 * moment, and the first answer is as good as the second. A regulation that genuinely changes is a
 * deliberate refresh, not something a race should perform.
 */
export async function saveZoneReference(
  db: Db,
  planId: string,
  zoneCode: string,
  zone: ZoneReference,
): Promise<void> {
  await db.executeQuery({
    sql: `INSERT INTO reference.dpt_zoning_zone
            (plan_id, zone_code, zone_name_th, colour, permitted_th, prohibited_th)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          ON CONFLICT (plan_id, zone_code) DO NOTHING`,
    parameters: [
      planId,
      zoneCode,
      zone.zone_name_th,
      zone.colour,
      zone.permitted_th,
      JSON.stringify(zone.prohibited_th),
    ],
    query: { kind: "InsertQueryNode" } as never,
  });
}

/** How many zones are known, for the system status page. */
export async function zoneReferenceCount(db: Db): Promise<number> {
  const { rows } = await db.executeQuery<{ n: string }>({
    sql: "SELECT count(*)::text AS n FROM reference.dpt_zoning_zone",
    parameters: [],
    query: { kind: "SelectQueryNode" } as never,
  });
  return Number(rows[0]?.n ?? 0);
}
