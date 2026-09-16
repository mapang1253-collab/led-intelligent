import { type Kysely, sql } from "kysely";
import type { Database } from "../schema.js";

export type RunState =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETE"
  | "PARTIAL"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "EXPIRED"
  | "CANCELLED";

export type OutputScope = "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";

export interface AnalysisRunRow {
  run_id: string;
  run_state: RunState;
  requested_scope: OutputScope;
  permitted_scope: OutputScope;
  intake: unknown;
  province_id: string;
  district_id: string;
  subdistrict_id: string;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

export interface CreateAnalysisRunInput {
  runId: string;
  capabilityDigest: string;
  requestedScope: OutputScope;
  permittedScope: OutputScope;
  intake: unknown;
  provinceId: string;
  districtId: string;
  subdistrictId: string;
}

export async function createAnalysisRun(
  db: Kysely<Database>,
  input: CreateAnalysisRunInput,
): Promise<AnalysisRunRow> {
  const row = await db
    .insertInto("analysis.analysis_run")
    .values({
      run_id: input.runId,
      capability_digest: input.capabilityDigest,
      run_state: "QUEUED",
      requested_scope: input.requestedScope,
      permitted_scope: input.permittedScope,
      intake: JSON.stringify(input.intake),
      province_id: input.provinceId,
      district_id: input.districtId,
      subdistrict_id: input.subdistrictId,
      // Must derive from the same clock as created_at's now() default: the CHECK constraint
      // requires exact equality with created_at + 24h, and a JS-side timestamp is milliseconds off.
      expires_at: sql<string>`now() + interval '24 hours'`,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return row as unknown as AnalysisRunRow;
}

/**
 * Loads a run only when the presented capability digest belongs to that exact run.
 *
 * Both the run_id and the digest are required: a capability for one run must never be able to read
 * another (docs/security-privacy-compliance.md §3). A public run_id alone returns nothing.
 */
export async function findRunForCapability(
  db: Kysely<Database>,
  runId: string,
  capabilityDigest: string,
): Promise<AnalysisRunRow | undefined> {
  const row = await db
    .selectFrom("analysis.analysis_run")
    .selectAll()
    .where("run_id", "=", runId)
    .where("capability_digest", "=", capabilityDigest)
    .executeTakeFirst();
  return row as unknown as AnalysisRunRow | undefined;
}

export async function setRunState(
  db: Kysely<Database>,
  runId: string,
  capabilityDigest: string,
  state: RunState,
): Promise<AnalysisRunRow | undefined> {
  const row = await db
    .updateTable("analysis.analysis_run")
    .set({
      run_state: state,
      completed_at: new Date().toISOString(),
    })
    .where("run_id", "=", runId)
    .where("capability_digest", "=", capabilityDigest)
    .returningAll()
    .executeTakeFirst();
  return row as unknown as AnalysisRunRow | undefined;
}

/** Names for the resolved target, read through the run's own foreign keys. */
export async function loadRunAreaNames(
  db: Kysely<Database>,
  run: AnalysisRunRow,
): Promise<{ province: string; district: string; subdistrict: string }> {
  const rows = await db
    .selectFrom("reference.administrative_area")
    .select(["id", "name_th", "level"])
    .where("id", "in", [run.province_id, run.district_id, run.subdistrict_id])
    .execute();

  const byId = new Map(rows.map((r) => [String(r.id), r.name_th]));
  return {
    province: byId.get(String(run.province_id)) ?? "",
    district: byId.get(String(run.district_id)) ?? "",
    subdistrict: byId.get(String(run.subdistrict_id)) ?? "",
  };
}
