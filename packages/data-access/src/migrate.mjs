#!/usr/bin/env node
// Applies SQL migrations in database/migrations/ against MIGRATION_DATABASE_URL, in filename order,
// tracking applied migrations in public.schema_migrations. SQL migrations are the schema authority
// (docs/database-design.md §1) — this runner never generates or infers schema.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../../../database/migrations");

const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "MIGRATION_DATABASE_URL is not set. Copy apps/web/.env.migration.example to " +
      "apps/web/.env.migration and fill in the real Supabase connection string.",
  );
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query("SELECT filename FROM public.schema_migrations")).rows.map(
      (r) => r.filename,
    ),
  );

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log("db:migrate — no .sql migrations found in database/migrations/.");
    return;
  }

  let ranCount = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`skip  ${filename} (already applied)`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    console.log(`apply ${filename} ...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO public.schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      ranCount += 1;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`FAILED ${filename}:`, err.message);
      throw err;
    }
  }

  console.log(`db:migrate — done. ${ranCount} migration(s) applied, ${files.length} total.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
