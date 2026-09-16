#!/usr/bin/env node
/**
 * Reports what the project has actually spent on AI today (docs/ai-architecture.md §5).
 *
 * The limits themselves are deployment facts: they come from the project's own Google AI Studio
 * rate-limit page, not from this tool, and they are recorded in apps/web/.dev.vars. What this
 * answers is the question those numbers cannot: how many calls were really made, what they cost in
 * tokens, and how many remain before the reserve is reached.
 *
 *   node --env-file=apps/web/.dev.vars tools/ingestion/ai-budget.mjs
 */
import pg from "pg";

const PROVIDER = "google-ai-studio";
const MODEL = "gemini-3.1-flash-lite";

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ??
  process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;
if (!databaseUrl) {
  console.error("No database URL. Run with --env-file=apps/web/.dev.vars");
  process.exit(1);
}

const rpm = Number(process.env.GEMINI_RPM_LIMIT);
const tpm = Number(process.env.GEMINI_TPM_LIMIT);
const rpd = Number(process.env.GEMINI_RPD_LIMIT);
const reservePercent = Number(process.env.AI_DAILY_RESERVE_PERCENT ?? 20);
const recorded = [rpm, tpm, rpd].every((v) => Number.isFinite(v) && v > 0);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const day = (
    await client.query(
      `SELECT requests_reserved, tokens_used, blocked_until
         FROM operations.ai_budget_window
        WHERE provider = $1 AND model = $2 AND window_kind = 'DAY'
          AND window_start = date_trunc('day', now())`,
      [PROVIDER, MODEL],
    )
  ).rows[0];

  const used = day?.requests_reserved ?? 0;
  const tokens = Number(day?.tokens_used ?? 0);

  console.log(`model   ${MODEL}`);
  console.log(`วันนี้    เรียกไปแล้ว ${used} ครั้ง · โทเคน ${tokens.toLocaleString("en-US")}`);

  if (recorded) {
    const reserve = Math.ceil((rpd * reservePercent) / 100);
    const ceiling = Math.max(0, rpd - reserve);
    console.log(
      `โควตา    ${rpd} ครั้ง/วัน · ${rpm} ครั้ง/นาที · ${tpm.toLocaleString("en-US")} โทเคน/นาที`,
    );
    console.log(`กันไว้    ${reserve} ครั้ง (${reservePercent}%) → เพดานที่ระบบใช้ได้ ${ceiling} ครั้ง/วัน`);
    console.log(`เหลือ    ${Math.max(0, ceiling - used)} ครั้ง`);
  } else {
    console.log("โควตา    ยังไม่ได้บันทึก — ระบบจะไม่เรียก AI จนกว่าจะกรอก");
    console.log("         ดูตัวเลขจริงที่ https://aistudio.google.com/rate-limit");
    console.log(
      "         แล้วกรอก GEMINI_RPM_LIMIT / GEMINI_TPM_LIMIT / GEMINI_RPD_LIMIT ใน apps/web/.dev.vars",
    );
  }
  if (day?.blocked_until) {
    console.log(`หยุดชั่วคราว จนถึง ${new Date(day.blocked_until).toISOString()} (ผู้ให้บริการแจ้ง 429)`);
  }

  const outcomes = await client.query(
    `SELECT outcome, count(*)::int n, round(avg(latency_ms))::int ms
       FROM operations.ai_call_log
      WHERE provider = $1 AND created_at >= date_trunc('day', now())
      GROUP BY outcome ORDER BY n DESC`,
    [PROVIDER],
  );
  if (outcomes.rowCount > 0) {
    console.log("\nผลการเรียกวันนี้:");
    for (const row of outcomes.rows) {
      console.log(
        `  ${row.outcome.padEnd(24)} ${String(row.n).padStart(4)} ครั้ง${row.ms ? `  เฉลี่ย ${row.ms} ms` : ""}`,
      );
    }
  }
} finally {
  await client.end();
}
