#!/usr/bin/env node
/**
 * Runs the expiry purge by hand, and reports what is outstanding
 * (docs/data-persistence-and-lifecycle.md §3).
 *
 * The deployed Worker does this hourly on a cron trigger. This exists for local development, where
 * no cron runs, and for an operator who needs to force a sweep after a failure.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/purge-expired.mjs [--dry-run]
 */
import pg from "pg";

const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL is not set.");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const before = (
    await client.query(`SELECT count(*) FILTER (WHERE expires_at <= now())::int AS expired,
                               count(*) FILTER (WHERE expires_at > now())::int AS live
                          FROM analysis.analysis_run`)
  ).rows[0];
  console.log(`หมดอายุรอลบ ${before.expired} รายการ · ยังไม่หมดอายุ ${before.live} รายการ`);

  if (dryRun) {
    console.log("--dry-run: ไม่ได้ลบอะไร");
  } else if (before.expired > 0) {
    const log = (
      await client.query(
        "INSERT INTO operations.purge_run (trigger_source) VALUES ('MANUAL') RETURNING id",
      )
    ).rows[0];
    // One statement: every run-scoped table cascades from the run row.
    const deleted = await client.query(
      "DELETE FROM analysis.analysis_run WHERE expires_at <= now() RETURNING run_id",
    );
    await client.query(
      "UPDATE operations.purge_run SET finished_at = now(), runs_deleted = $2 WHERE id = $1",
      [log.id, deleted.rowCount],
    );
    console.log(`ลบแล้ว ${deleted.rowCount} รายการ (ข้อมูลที่ผูกกับ run ถูกลบตามไปด้วยทั้งหมด)`);
  } else {
    console.log("ไม่มีอะไรต้องลบ");
  }

  const orphans = await client.query(`
    SELECT 'evidence_link' AS t, count(*)::int n FROM evidence.evidence_link l
      WHERE NOT EXISTS (SELECT 1 FROM analysis.analysis_run r WHERE r.run_id = l.run_id)
    UNION ALL
    SELECT 'potential_use_concept', count(*)::int FROM analysis.potential_use_concept c
      WHERE NOT EXISTS (SELECT 1 FROM analysis.analysis_run r WHERE r.run_id = c.run_id)
    UNION ALL
    SELECT 'final_result', count(*)::int FROM analysis.final_result f
      WHERE NOT EXISTS (SELECT 1 FROM analysis.analysis_run r WHERE r.run_id = f.run_id)
  `);
  const leftover = orphans.rows.filter((r) => r.n > 0);
  console.log(
    leftover.length === 0
      ? "ตรวจแล้ว: ไม่มีข้อมูลตกค้างที่ไม่มี run เป็นเจ้าของ"
      : `⚠ พบข้อมูลตกค้าง: ${leftover.map((r) => `${r.t}=${r.n}`).join(", ")}`,
  );
} finally {
  await client.end();
}
