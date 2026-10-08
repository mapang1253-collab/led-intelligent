import type { Kysely } from "kysely";
import type { Database } from "../schema.js";

type Db = Kysely<Database>;

/**
 * Stored parcel-layer metadata (docs/adr/0009, migration 0014).
 *
 * Two of the three requests a cold parcel lookup makes answer the same question every time: which
 * layer of a province's service holds the parcels, and how that layer spells and types its
 * columns. That is published metadata about the department's own service, identical for every
 * reader, so it is read once and kept. Only the parcel query still goes out on every lookup, which
 * is why nothing here can be traced to a reader: the ระวาง and the เลขที่ดิน they typed are never
 * written.
 */
export interface ParcelLayerReference {
  readonly layer_id: number;
  readonly land_field: string;
  readonly land_quoted: boolean;
  readonly map2_quoted: boolean;
  readonly area_field: string | null;
  readonly province_field: string | null;
  readonly district_field: string | null;
  readonly subdistrict_field: string | null;
}

export async function loadParcelLayer(
  db: Db,
  provinceCode: string,
): Promise<ParcelLayerReference | null> {
  if (!/^\d{2}$/.test(provinceCode)) {
    return null;
  }
  const { rows } = await db.executeQuery<ParcelLayerReference>({
    sql: `SELECT layer_id, land_field, land_quoted, map2_quoted,
                 area_field, province_field, district_field, subdistrict_field
            FROM reference.dpt_parcel_layer
           WHERE province_code = $1`,
    parameters: [provinceCode],
    query: { kind: "SelectQueryNode" } as never,
  });
  return rows[0] ?? null;
}

/**
 * Records how a province's parcel layer is addressed.
 *
 * `DO NOTHING` on conflict, as the zone reference does: two readers can look the same province up
 * at the same moment, and the first answer is as good as the second. A department that renumbers
 * its layers is a deliberate refresh, not something a race should perform.
 */
export async function saveParcelLayer(
  db: Db,
  provinceCode: string,
  layer: ParcelLayerReference,
): Promise<void> {
  if (!/^\d{2}$/.test(provinceCode)) {
    return;
  }
  await db.executeQuery({
    sql: `INSERT INTO reference.dpt_parcel_layer
            (province_code, layer_id, land_field, land_quoted, map2_quoted,
             area_field, province_field, district_field, subdistrict_field)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (province_code) DO NOTHING`,
    parameters: [
      provinceCode,
      layer.layer_id,
      layer.land_field,
      layer.land_quoted,
      layer.map2_quoted,
      layer.area_field,
      layer.province_field,
      layer.district_field,
      layer.subdistrict_field,
    ],
    query: { kind: "InsertQueryNode" } as never,
  });
}

/**
 * Forgets what we knew about a province's layer, so it is read again.
 *
 * Kept deliberately available rather than left to a timer. The stored row is only wrong in one
 * situation — the department renumbered a layer or renamed a column — and that situation looks
 * exactly like a parcel that does not exist: the query comes back rejected, the screen says it
 * could not search, and it would say that for everyone, for as long as the row stood. Dropping
 * the row on that specific failure is what turns a permanent outage into one slow lookup.
 */
export async function forgetParcelLayer(db: Db, provinceCode: string): Promise<void> {
  if (!/^\d{2}$/.test(provinceCode)) {
    return;
  }
  await db.executeQuery({
    sql: "DELETE FROM reference.dpt_parcel_layer WHERE province_code = $1",
    parameters: [provinceCode],
    query: { kind: "DeleteQueryNode" } as never,
  });
}
