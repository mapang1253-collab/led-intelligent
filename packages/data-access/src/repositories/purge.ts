import { sql } from "kysely";
import type { Db } from "../connection.js";

/**
 * Expiry purge (docs/data-persistence-and-lifecycle.md §3).
 *
 * Deleting the run row is enough: every run-scoped table references it with ON DELETE CASCADE, so
 * intake, evidence links, concepts, validations and the final result go with it in one statement.
 * That is deliberate — a purge that had to remember which tables exist would eventually forget one.
 *
 * Shared observations are untouched. They are not run-scoped and have their own rights lifecycle.
 */

export interface PurgeOutcome {
  readonly runs_deleted: number;
  readonly failure_reason: string | null;
}

/** Deletes runs whose expiry has passed. Bounded per sweep so one call cannot run unboundedly. */
export async function purgeExpiredRuns(
  db: Db,
  options: { readonly limit?: number; readonly source?: "CRON" | "MANUAL" } = {},
): Promise<PurgeOutcome> {
  const limit = options.limit ?? 500;
  const source = options.source ?? "CRON";

  const started = await db
    .insertInto("operations.purge_run")
    .values({ trigger_source: source })
    .returning("id")
    .executeTakeFirstOrThrow();

  try {
    const deleted = await sql<{ run_id: string }>`
      DELETE FROM analysis.analysis_run
       WHERE run_id IN (
         SELECT run_id FROM analysis.analysis_run
          WHERE expires_at <= now()
          ORDER BY expires_at
          LIMIT ${limit}
       )
      RETURNING run_id
    `.execute(db);

    await db
      .updateTable("operations.purge_run")
      .set({ finished_at: sql<string>`now()`, runs_deleted: deleted.rows.length })
      .where("id", "=", started.id)
      .execute();

    return { runs_deleted: deleted.rows.length, failure_reason: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown purge failure";
    // Recorded and left unfinished, so the next sweep knows work remains rather than assuming
    // a clean slate.
    await db
      .updateTable("operations.purge_run")
      .set({ finished_at: sql<string>`now()`, failure_reason: reason })
      .where("id", "=", started.id)
      .execute();
    return { runs_deleted: 0, failure_reason: reason };
  }
}

export interface ExpiryStatus {
  readonly expired_awaiting_purge: number;
  readonly live_runs: number;
  readonly last_purge_at: string | null;
  readonly last_purge_deleted: number | null;
}

export async function expiryStatus(db: Db): Promise<ExpiryStatus> {
  const counts = await sql<{ expired: string; live: string }>`
    SELECT count(*) FILTER (WHERE expires_at <= now()) AS expired,
           count(*) FILTER (WHERE expires_at > now()) AS live
      FROM analysis.analysis_run
  `.execute(db);

  const last = await db
    .selectFrom("operations.purge_run")
    .select(["started_at", "runs_deleted"])
    .where("finished_at", "is not", null)
    .orderBy("started_at", "desc")
    .executeTakeFirst();

  const row = counts.rows[0];
  return {
    expired_awaiting_purge: Number(row?.expired ?? 0),
    live_runs: Number(row?.live ?? 0),
    last_purge_at: last?.started_at ?? null,
    last_purge_deleted: last?.runs_deleted ?? null,
  };
}
