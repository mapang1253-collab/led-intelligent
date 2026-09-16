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

/** Matches database/migrations/0002_analysis_run.sql exactly. */
export interface AnalysisRunTable {
  id: Generated<string>;
  run_id: string;
  capability_digest: string;
  run_state:
    | "QUEUED"
    | "RUNNING"
    | "COMPLETE"
    | "PARTIAL"
    | "FAILED_RETRYABLE"
    | "FAILED_FINAL"
    | "EXPIRED"
    | "CANCELLED";
  requested_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  permitted_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  intake: ColumnType<unknown, string, string>;
  province_id: string;
  district_id: string;
  subdistrict_id: string;
  created_at: ColumnType<string, string | undefined, never>;
  expires_at: ColumnType<string, string, string>;
  completed_at: ColumnType<string | null, string | null | undefined, string | null>;
}

export interface Database {
  "reference.administrative_area": AdministrativeAreaTable;
  "analysis.analysis_run": AnalysisRunTable;
}
