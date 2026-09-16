#!/usr/bin/env node
/**
 * Bulk ingestion: NSO Socio-Economic Survey household income, nationwide.
 *
 * Runs OFF the interactive path (docs/technology-stack.md §15). A normal analysis run never calls
 * NSO; it reads the Observations this tool wrote. That matters here for a concrete reason: the
 * published table is ~10MB and takes ~18 seconds to transfer, which no request-time budget allows.
 *
 * What it does NOT do: activate the source. Ingesting evidence and being allowed to use it are
 * separate decisions (docs/implementation-plan.md §4) — run tools/ingestion/activate-source.mjs for
 * that, with named reviewers.
 *
 * Idempotent: re-running with an unchanged publication rewrites nothing but provenance. A changed
 * value appends a new observation version and supersedes the old one; history is never overwritten.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/ingest-nso-ses-income.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  SES_INCOME_MEASURE_ID,
  SES_INCOME_SOURCE_PRODUCT_ID,
  SES_INCOME_URL,
  fetchSesIncomeTable,
  parseSesIncomeRows,
} from "../../packages/source-adapters/dist/index.js";

const PRODUCT = {
  product_id: SES_INCOME_SOURCE_PRODUCT_ID,
  owner_id: "nso",
  owner_name_th: "สำนักงานสถิติแห่งชาติ",
  owner_contact: "esesnso@nso.go.th",
  title_th: "รายได้เฉลี่ยต่อเดือนของครัวเรือน (สำรวจภาวะเศรษฐกิจและสังคมของครัวเรือน)",
  access_url: SES_INCOME_URL,
  catalogue_url: "https://data.go.th/dataset/os_08_00007",
  // Verified live on the data.go.th package record; see docs/data-sources/nso.md.
  licence_id: "Creative Commons Attributions",
  attribution_th: "ที่มา: สำนักงานสถิติแห่งชาติ (สำรวจภาวะเศรษฐกิจและสังคมของครัวเรือน)",
  may_acquire: true,
  may_store: true,
  may_transform: true,
  may_display: true,
  coverage_level: "PROVINCE",
  coverage_note_th: "ครอบคลุม 77 จังหวัดทั่วประเทศ ระดับจังหวัดเท่านั้น ไม่มีข้อมูลระดับอำเภอหรือตำบล",
  refresh_frequency: "รายปี",
  must_not_become_th:
    "ห้ามใช้แทนรายได้ของครัวเรือนในตำบลหรืออำเภอใดโดยเฉพาะ ห้ามใช้เป็นกำลังซื้อของผู้ซื้อทรัพย์สิน และห้ามนำค่าของแต่ละกลุ่มมาเฉลี่ยรวมเป็นค่าเฉลี่ยทั้งจังหวัด",
};

const PARSER_VERSION = "nso-ses-income@1.0.0";
const UNIT_CODE = "THB_PER_MONTH";
/** Thai Buddhist Era is 543 years ahead of the Common Era. */
const BE_CE_OFFSET = 543;
const EXTRACTION_METHOD = "json-table-row";
const FETCH_TIMEOUT_MS = 180_000;

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "MIGRATION_DATABASE_URL is not set. Copy apps/web/.env.migration.example to " +
      "apps/web/.env.migration and fill in the real Supabase connection string.",
  );
  process.exit(1);
}

/** Compares published figures as decimals, so 17019 and "17019.0" are one value, not two. */
function normalizeDecimal(value) {
  const text = String(value).trim();
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/** Natural identity of a fact: same key across publications means the same figure, restated. */
function observationKey(observation) {
  return [
    observation.source_product_id,
    observation.measure_id,
    observation.geography_code,
    observation.period_end_year,
    observation.population,
  ].join("|");
}

async function main() {
  console.log(`fetching ${SES_INCOME_URL}`);
  const started = Date.now();
  const response = await fetchSesIncomeTable({ timeoutMs: FETCH_TIMEOUT_MS });
  if (response.outcome !== "SUCCESS") {
    // The outcome and its retry classification both reach the operator; the tool never silently
    // treats an unreachable source as "no data".
    console.error(
      `acquisition failed: ${response.outcome} (retryable=${response.retryable}) — ${response.reason}`,
    );
    process.exit(1);
  }
  const payloadText = JSON.stringify(response.payload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const payloadSha256 = createHash("sha256").update(payloadText).digest("hex");
  console.log(
    `fetched ${payloadBytes} bytes in ${((Date.now() - started) / 1000).toFixed(1)}s, sha256 ${payloadSha256.slice(0, 16)}…`,
  );

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const provinces = (
      await client.query(
        `SELECT id, code, name_th FROM reference.administrative_area
          WHERE level = 'PROVINCE' AND valid_to IS NULL ORDER BY code`,
      )
    ).rows;
    if (provinces.length === 0) {
      console.error(
        "no provinces in reference.administrative_area — run pnpm db:seed:reference first",
      );
      process.exit(1);
    }

    // Parse every province from the single payload before touching the database, so a parse failure
    // anywhere leaves the corpus untouched rather than half-updated.
    const parsed = [];
    const noRecord = [];
    for (const province of provinces) {
      const result = parseSesIncomeRows(response.payload, {
        provinceNameTh: province.name_th,
        provinceCode: province.code,
      });
      if (result.outcome === "SUCCESS") {
        parsed.push({ province, observations: result.observations });
      } else if (result.outcome === "NO_RECORD") {
        // A province the publication genuinely does not cover. Recorded, never invented.
        noRecord.push({ province: province.name_th, reason: result.reason });
      } else {
        console.error(`parse failed for ${province.name_th}: ${result.outcome} — ${result.reason}`);
        process.exit(1);
      }
    }
    const total = parsed.reduce((n, p) => n + p.observations.length, 0);
    const coverageNote = noRecord.length > 0 ? `; ${noRecord.length} province(s) not covered` : "";
    console.log(`parsed ${total} observations across ${parsed.length} provinces${coverageNote}`);
    for (const entry of noRecord) console.log(`  not covered: ${entry.province} — ${entry.reason}`);

    if (dryRun) {
      console.log("--dry-run: nothing written");
      return;
    }

    await client.query("BEGIN");

    const owner = await client.query(
      `INSERT INTO source.source_owner (owner_id, name_th, contact) VALUES ($1, $2, $3)
       ON CONFLICT (owner_id) DO UPDATE SET name_th = EXCLUDED.name_th, contact = EXCLUDED.contact
       RETURNING id`,
      [PRODUCT.owner_id, PRODUCT.owner_name_th, PRODUCT.owner_contact],
    );

    // Registering or refreshing a product never changes its activation state; that is a separate,
    // reviewed decision and the columns are deliberately absent from this UPDATE.
    const product = await client.query(
      `INSERT INTO source.source_product (
         product_id, owner_id, title_th, access_url, catalogue_url, licence_id, attribution_th,
         may_acquire, may_store, may_transform, may_display,
         coverage_level, coverage_note_th, refresh_frequency, must_not_become_th
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (product_id) DO UPDATE SET
         title_th = EXCLUDED.title_th, access_url = EXCLUDED.access_url,
         catalogue_url = EXCLUDED.catalogue_url, licence_id = EXCLUDED.licence_id,
         attribution_th = EXCLUDED.attribution_th, may_acquire = EXCLUDED.may_acquire,
         may_store = EXCLUDED.may_store, may_transform = EXCLUDED.may_transform,
         may_display = EXCLUDED.may_display, coverage_level = EXCLUDED.coverage_level,
         coverage_note_th = EXCLUDED.coverage_note_th,
         refresh_frequency = EXCLUDED.refresh_frequency,
         must_not_become_th = EXCLUDED.must_not_become_th, updated_at = now()
       RETURNING id, activation_state`,
      [
        PRODUCT.product_id,
        owner.rows[0].id,
        PRODUCT.title_th,
        PRODUCT.access_url,
        PRODUCT.catalogue_url,
        PRODUCT.licence_id,
        PRODUCT.attribution_th,
        PRODUCT.may_acquire,
        PRODUCT.may_store,
        PRODUCT.may_transform,
        PRODUCT.may_display,
        PRODUCT.coverage_level,
        PRODUCT.coverage_note_th,
        PRODUCT.refresh_frequency,
        PRODUCT.must_not_become_th,
      ],
    );
    const productId = product.rows[0].id;

    // The payload hash is the version label: an unchanged publication re-uses its version row, so
    // re-running does not invent a new vintage.
    const versionLabel = `sha256:${payloadSha256.slice(0, 16)}`;
    const version = await client.query(
      `INSERT INTO source.product_version (
         source_product_id, version_label, record_count, payload_sha256, payload_bytes,
         parse_status, parser_version
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (source_product_id, version_label) DO UPDATE SET retrieved_at = now()
       RETURNING id, retrieved_at`,
      [
        productId,
        versionLabel,
        total,
        payloadSha256,
        payloadBytes,
        noRecord.length === 0 ? "PARSED" : "PARTIAL",
        PARSER_VERSION,
      ],
    );
    const versionId = version.rows[0].id;
    const retrievedAt = version.rows[0].retrieved_at;

    // Set-based, not row-by-row: one read of the standing corpus, then bulk writes. A round trip
    // per observation would be ~4,600 of them against a hosted database.
    const standing = new Map(
      (
        await client.query(
          `SELECT o.id, o.observation_key, o.observation_version,
                  v.value_scalar::text AS value_scalar, v.unit_code
             FROM evidence.observation o
             JOIN evidence.observation_value v ON v.observation_id = o.id
            WHERE o.measure_id = $1 AND o.is_current`,
          [SES_INCOME_MEASURE_ID],
        )
      ).rows.map((row) => [row.observation_key, row]),
    );

    const unchangedIds = [];
    const supersededIds = [];
    const fresh = [];

    for (const { province, observations } of parsed) {
      for (const observation of observations) {
        const key = observationKey(observation);
        const current = standing.get(key);
        // Compared as decimal strings: a numeric column round-tripped through a JS float could
        // report a changed value where the source published none.
        const sameValue =
          current !== undefined &&
          current.unit_code === UNIT_CODE &&
          normalizeDecimal(current.value_scalar) === normalizeDecimal(observation.value);

        if (sameValue) {
          unchangedIds.push(current.id);
          continue;
        }
        if (current !== undefined) {
          supersededIds.push(current.id);
        }
        fresh.push({
          key,
          version: current ? current.observation_version + 1 : 1,
          supersedes: current ? current.id : null,
          province,
          observation,
        });
      }
    }

    if (unchangedIds.length > 0) {
      // Same figure, restated by the same source: refresh provenance only. The period, and so the
      // vintage label, is part of the key and therefore cannot have changed.
      await client.query(
        `UPDATE evidence.observation
            SET retrieved_at = $2, source_product_version_id = $3
          WHERE id = ANY($1::bigint[])`,
        [unchangedIds, retrievedAt, versionId],
      );
    }
    if (supersededIds.length > 0) {
      await client.query(
        "UPDATE evidence.observation SET is_current = false WHERE id = ANY($1::bigint[])",
        [supersededIds],
      );
    }

    if (fresh.length > 0) {
      const inserted = await client.query(
        `INSERT INTO evidence.observation (
           observation_key, observation_version, supersedes_id, is_current, subject_type,
           measure_id, population_th, admin_area_id, geography_level,
           period_start_year, period_end_year, source_vintage, retrieved_at, epistemic_status,
           source_product_version_id, source_record_locator, extraction_method,
           reliability, completeness, parsing_flags, source_note_th
         )
         SELECT t.observation_key, t.observation_version, t.supersedes_id, true, 'ADMIN_AREA',
                t.measure_id, t.population_th, t.admin_area_id, t.geography_level,
                t.period_start_year, t.period_end_year, t.source_vintage, $12::timestamptz,
                t.epistemic_status, $13::bigint, t.source_record_locator, $14::text,
                'OFFICIAL_SURVEY', 'PARTIAL',
                -- Derived here rather than passed as a nested array: a source footnote is the one
                -- parsing flag this adapter can raise, and it is exactly "the note is present".
                CASE WHEN t.source_note_th IS NULL THEN '{}'::text[] ELSE ARRAY['SOURCE_FOOTNOTE'] END,
                t.source_note_th
           FROM unnest(
             $1::text[], $2::int[], $3::bigint[],
             $4::text[], $5::text[], $6::bigint[], $7::text[],
             $8::int[], $9::int[], $10::text[], $15::text[], $11::text[], $16::text[]
           ) AS t(
             observation_key, observation_version, supersedes_id,
             measure_id, population_th, admin_area_id, geography_level,
             period_start_year, period_end_year, source_vintage, epistemic_status,
             source_record_locator, source_note_th
           )
         RETURNING id, observation_key`,
        [
          fresh.map((f) => f.key),
          fresh.map((f) => f.version),
          fresh.map((f) => f.supersedes),
          fresh.map((f) => f.observation.measure_id),
          fresh.map((f) => f.observation.population),
          fresh.map((f) => f.province.id),
          fresh.map((f) => f.observation.geography_level),
          fresh.map((f) => f.observation.period_start_year),
          fresh.map((f) => f.observation.period_end_year),
          // Buddhist-era label kept alongside the converted CE years so a reader can find the figure
          // in the source's own vocabulary.
          fresh.map((f) => String(f.observation.period_end_year + BE_CE_OFFSET)),
          fresh.map(
            (f) =>
              `${SES_INCOME_URL}#province=${encodeURIComponent(f.province.name_th)}` +
              `&year=${f.observation.period_end_year + BE_CE_OFFSET}`,
          ),
          retrievedAt,
          versionId,
          EXTRACTION_METHOD,
          fresh.map((f) => f.observation.epistemic_status),
          fresh.map((f) => f.observation.source_note),
        ],
      );

      const idByKey = new Map(inserted.rows.map((row) => [row.observation_key, row.id]));
      await client.query(
        `INSERT INTO evidence.observation_value (
           observation_id, measure_id, value_scalar, unit_code, currency, statistic
         )
         SELECT * FROM unnest(
           $1::bigint[], $2::text[], $3::numeric[], $4::text[], $5::text[], $6::text[]
         )`,
        [
          fresh.map((f) => idByKey.get(f.key)),
          fresh.map((f) => f.observation.measure_id),
          fresh.map((f) => f.observation.value),
          fresh.map(() => UNIT_CODE),
          fresh.map(() => "THB"),
          fresh.map(() => "MEAN"),
        ],
      );
    }

    await client.query("COMMIT");
    console.log(
      `ingest done — ${fresh.length} new observation version(s), ` +
        `${supersededIds.length} superseded, ${unchangedIds.length} unchanged`,
    );
    const state = product.rows[0].activation_state;
    const stateNote =
      state === "ACTIVE" ? "" : " — analysis runs will not use it until it is activated";
    console.log(
      `measure ${SES_INCOME_MEASURE_ID}; product ${PRODUCT.product_id} is ${state}${stateNote}`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
