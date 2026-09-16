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
import { registerProduct, registerVersion, upsertObservations } from "./lib/registry.mjs";

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
    const product = await registerProduct(client, PRODUCT);

    const versionLabel = `sha256:${payloadSha256.slice(0, 16)}`;
    const version = await registerVersion(client, product.id, {
      label: versionLabel,
      recordCount: total,
      sha256: payloadSha256,
      bytes: payloadBytes,
      parseStatus: noRecord.length === 0 ? "PARSED" : "PARTIAL",
      parserVersion: PARSER_VERSION,
    });

    const counts = await upsertObservations(client, {
      measureId: SES_INCOME_MEASURE_ID,
      unitCode: UNIT_CODE,
      currency: "THB",
      statistic: "MEAN",
      versionId: version.id,
      retrievedAt: version.retrieved_at,
      rows: parsed.flatMap(({ province, observations }) =>
        observations.map((observation) => ({
          key: observationKey(observation),
          populationTh: observation.population,
          adminAreaId: province.id,
          geographyLevel: observation.geography_level,
          value: observation.value,
          periodStartYear: observation.period_start_year,
          periodEndYear: observation.period_end_year,
          // Buddhist-era label kept alongside the converted CE years so a reader can find the figure
          // in the source's own vocabulary.
          sourceVintage: String(observation.period_end_year + BE_CE_OFFSET),
          epistemicStatus: observation.epistemic_status,
          locator:
            `${SES_INCOME_URL}#province=${encodeURIComponent(province.name_th)}` +
            `&year=${observation.period_end_year + BE_CE_OFFSET}`,
          extractionMethod: EXTRACTION_METHOD,
          reliability: "OFFICIAL_SURVEY",
          // The publication covers only the socio-economic classes it surveys; it has no
          // all-households row (docs/adr/0002-no-fabricated-provincial-averages.md).
          completeness: "PARTIAL",
          sourceNoteTh: observation.source_note,
        })),
      ),
    });

    await client.query("COMMIT");
    console.log(
      `ingest done — ${counts.inserted} new observation version(s), ` +
        `${counts.superseded} superseded, ${counts.unchanged} unchanged`,
    );
    const state = product.activation_state;
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
