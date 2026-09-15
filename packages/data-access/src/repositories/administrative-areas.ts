import type { Kysely } from "kysely";
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
