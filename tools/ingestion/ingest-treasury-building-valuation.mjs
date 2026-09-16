#!/usr/bin/env node
/**
 * Bulk ingestion: Treasury assessed construction values, nationwide.
 *
 * One CSV, 77 provinces × 69 building types. Runs off the interactive path
 * (docs/technology-stack.md §15); an analysis run reads what this writes.
 *
 * The caveat is carried on every observation and repeated on the product, because a figure in baht
 * per square metre reads like a construction cost and is not one: it is what the state assesses for
 * tax, and it sits well below both market price and real build cost.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/ingest-treasury-building-valuation.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  BUILDING_VALUATION_MEASURE_ID,
  BUILDING_VALUATION_SOURCE_PRODUCT_ID,
  BUILDING_VALUATION_URL,
  fetchBuildingValuation,
} from "../../packages/source-adapters/dist/index.js";
import { registerProduct, registerVersion, upsertObservations } from "./lib/registry.mjs";

const PRODUCT = {
  product_id: BUILDING_VALUATION_SOURCE_PRODUCT_ID,
  owner_id: "treasury",
  owner_name_th: "กรมธนารักษ์ กระทรวงการคลัง",
  owner_contact: "pvb@treasury.go.th",
  title_th: "ราคาประเมินสิ่งปลูกสร้าง",
  access_url: BUILDING_VALUATION_URL,
  catalogue_url: "https://data.go.th/dataset/building-valuation",
  licence_id: "Open Data Common",
  attribution_th: "ที่มา: กรมธนารักษ์ (ราคาประเมินสิ่งปลูกสร้าง)",
  may_acquire: true,
  may_store: true,
  may_transform: true,
  may_display: true,
  coverage_level: "PROVINCE",
  coverage_note_th: "ครอบคลุม 77 จังหวัด × 69 ประเภทสิ่งปลูกสร้าง ระดับจังหวัดเท่านั้น",
  refresh_frequency: "รายปี (รอบบัญชีประเมินราคาทุก 4 ปี)",
  must_not_become_th:
    "เป็นราคาประเมินเพื่อการจัดเก็บภาษีตามพระราชบัญญัติภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562 เท่านั้น ห้ามใช้แทนราคาซื้อขายในตลาด ห้ามใช้แทนต้นทุนก่อสร้างจริง และห้ามใช้ประเมินมูลค่าทรัพย์สินรายแปลง",
};

const PARSER_VERSION = "treasury-building-valuation@1.0.0";
const UNIT_CODE = "THB_PER_SQM";
const FETCH_TIMEOUT_MS = 120_000;

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL is not set.");
  process.exit(1);
}

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
  console.log(`fetching ${BUILDING_VALUATION_URL}`);
  const started = Date.now();
  const result = await fetchBuildingValuation({ timeoutMs: FETCH_TIMEOUT_MS });
  if (result.outcome !== "SUCCESS") {
    console.error(
      `acquisition failed: ${result.outcome} (retryable=${result.retryable}) — ${result.reason}`,
    );
    process.exit(1);
  }
  const observations = result.observations;
  console.log(
    `parsed ${observations.length} observations in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const provinces = (
      await client.query(
        `SELECT id, code FROM reference.administrative_area
          WHERE level = 'PROVINCE' AND valid_to IS NULL`,
      )
    ).rows;
    const idByCode = new Map(provinces.map((row) => [Number(row.code), row.id]));

    const rows = [];
    const unmatched = new Set();
    for (const observation of observations) {
      const adminAreaId = idByCode.get(observation.geography_code);
      if (!adminAreaId) {
        // A province code with no counterpart is recorded, never mapped to a neighbour.
        unmatched.add(observation.geography_code);
        continue;
      }
      rows.push({
        key: observationKey(observation),
        populationTh: observation.population,
        adminAreaId,
        geographyLevel: "PROVINCE",
        value: observation.value,
        periodStartYear: observation.period_start_year,
        periodEndYear: observation.period_end_year,
        sourceVintage: String(observation.period_end_year + 543),
        epistemicStatus: observation.epistemic_status,
        locator: `${BUILDING_VALUATION_URL}#province=${observation.geography_code}`,
        extractionMethod: "csv-row",
        reliability: "AUTHORITATIVE",
        completeness: "COMPLETE",
        sourceNoteTh: observation.source_note,
      });
    }
    console.log(`matched ${rows.length} rows to ${idByCode.size} provinces`);
    if (unmatched.size > 0) {
      console.log(`  province codes with no reference match: ${[...unmatched].join(", ")}`);
    }

    if (dryRun) {
      console.log("--dry-run: nothing written");
      return;
    }

    await client.query("BEGIN");
    const product = await registerProduct(client, PRODUCT);
    const payloadHash = createHash("sha256")
      .update(observations.map((o) => `${o.geography_code}|${o.population}|${o.value}`).join("\n"))
      .digest("hex");
    const version = await registerVersion(client, product.id, {
      label: `sha256:${payloadHash.slice(0, 16)}`,
      recordCount: rows.length,
      sha256: payloadHash,
      bytes: 0,
      parseStatus: unmatched.size === 0 ? "PARSED" : "PARTIAL",
      parserVersion: PARSER_VERSION,
    });

    const counts = await upsertObservations(client, {
      measureId: BUILDING_VALUATION_MEASURE_ID,
      unitCode: UNIT_CODE,
      currency: "THB",
      statistic: "SINGLE",
      versionId: version.id,
      retrievedAt: version.retrieved_at,
      // One file, the whole country: anything this run did not write is no longer standing.
      retireMissing: true,
      rows,
    });
    await client.query("COMMIT");

    console.log(
      `ingest done — ${counts.inserted} new observation version(s), ${counts.superseded} superseded, ${counts.unchanged} unchanged, ${counts.retired} retired`,
    );
    const state = product.activation_state;
    const stateNote =
      state === "ACTIVE" ? "" : " — analysis runs will not use it until it is activated";
    console.log(`product ${PRODUCT.product_id} is ${state}${stateNote}`);
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
