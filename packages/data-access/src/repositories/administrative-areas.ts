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
