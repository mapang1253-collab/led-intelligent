#!/usr/bin/env node
// Seeds reference.administrative_area with all 77 provinces, 928 districts and ~7436 subdistricts
// (docs/adr/0001-first-increment-scope.md: the pipeline must work for every province from day one,
// not just Chon Buri/EEC fixtures). Source: the "geothai" npm package (MIT-licensed, DOPA-style
// codes) — see packages/data-access/package.json for the pinned version, recorded per row as the
// `source` column per docs/data-architecture.md provenance requirements.
import { getAllDistricts, getAllProvinces, getAllSubdistricts, metadata } from "geothai";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "MIGRATION_DATABASE_URL is not set. Copy apps/web/.env.migration.example to " +
      "apps/web/.env.migration and fill in the real Supabase connection string.",
  );
  process.exit(1);
}

const SOURCE = `geothai@${metadata.version}`;
const BATCH_SIZE = 1000;

const client = new Client({ connectionString: databaseUrl });

/** Inserts rows in batches, returning `{code, id}` for every inserted row. */
async function batchInsert(rows, toValues) {
  const codeToId = new Map();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const columns = [];
    const params = [];
    let p = 1;
    for (const row of batch) {
      const values = toValues(row);
      columns.push(`(${values.map(() => `$${p++}`).join(", ")})`);
      params.push(...values);
    }
    const { rows: inserted } = await client.query(
      `INSERT INTO reference.administrative_area (level, code, parent_id, name_th, name_en, postal_code, source)
       VALUES ${columns.join(", ")}
       RETURNING code, id`,
      params,
    );
    for (const r of inserted) codeToId.set(r.code, r.id);
  }
  return codeToId;
}

async function main() {
  await client.connect();

  const { rows: existing } = await client.query(
    "SELECT count(*)::int AS count FROM reference.administrative_area",
  );
  if (existing[0].count > 0) {
    console.log(
      `db:seed:reference — reference.administrative_area already has ${existing[0].count} rows. Skipping (idempotent).`,
    );
    return;
  }

  const provinces = getAllProvinces();
  const districts = getAllDistricts();
  const subdistricts = getAllSubdistricts();
  console.log(
    `db:seed:reference — seeding ${provinces.length} provinces, ${districts.length} districts, ${subdistricts.length} subdistricts from ${SOURCE} ...`,
  );

  await client.query("BEGIN");
  try {
    const provinceIdByCode = await batchInsert(provinces, (p) => [
      "PROVINCE",
      p.code,
      null,
      p.name_th,
      p.name_en,
      null,
      SOURCE,
    ]);

    const districtIdByCode = await batchInsert(districts, (d) => [
      "DISTRICT",
      d.code,
      provinceIdByCode.get(d.province_code) ?? null,
      d.name_th,
      d.name_en,
      null,
      SOURCE,
    ]);

    await batchInsert(subdistricts, (s) => [
      "SUBDISTRICT",
      s.code,
      districtIdByCode.get(s.district_code) ?? null,
      s.name_th,
      s.name_en,
      String(s.postal_code),
      SOURCE,
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  console.log("db:seed:reference — done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
