import type { ColumnType, Generated } from "kysely";

/** Matches database/migrations/0001_reference_administrative_area.sql exactly. */
export interface AdministrativeAreaTable {
  id: Generated<string>;
  level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  code: number;
  parent_id: string | null;
  name_th: string;
  name_en: string | null;
  postal_code: string | null;
  valid_from: ColumnType<string, string | undefined, never>;
  valid_to: string | null;
  source: string;
  created_at: ColumnType<string, string | undefined, never>;
}

export interface Database {
  "reference.administrative_area": AdministrativeAreaTable;
}
