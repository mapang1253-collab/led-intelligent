#!/usr/bin/env node
/**
 * Bulk ingestion: Treasury assessed condominium values, nationwide.
 *
 * One TIS-620 CSV of 122,112 floor-by-floor prices, collapsed by the adapter into one figure per
 * building per use category. Runs off the interactive path (docs/technology-stack.md §15).
 *
 * Unlike every other source here, the cohort of each figure names a real building. That is the whole
 * point — it is what lets the app answer "what property is here and what is it worth" — and it is
 * also why the caveat is repeated on the product and on every observation: an assessed value is set
 * to levy tax and sits well below a market price.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/ingest-treasury-condominium-valuation.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  CONDOMINIUM_VALUATION_MEASURE_ID,
  CONDOMINIUM_VALUATION_SOURCE_PRODUCT_ID,
  CONDOMINIUM_VALUATION_URL,
  fetchCondominiumValuation,
} from "../../packages/source-adapters/dist/index.js";
import { registerProduct, registerVersion, upsertObservations } from "./lib/registry.mjs";

const PRODUCT = {
  product_id: CONDOMINIUM_VALUATION_SOURCE_PRODUCT_ID,
  owner_id: "treasury",
  owner_name_th: "กรมธนารักษ์ กระทรวงการคลัง",
  owner_contact: "pvb@treasury.go.th",
  title_th: "ราคาประเมินอาคารชุด",
  access_url: CONDOMINIUM_VALUATION_URL,
  catalogue_url: "https://catalog.treasury.go.th/dataset/condominium-valuation",
  licence_id: "Open Data Common",
  attribution_th: "ที่มา: กรมธนารักษ์ (ราคาประเมินอาคารชุด)",
  may_acquire: true,
  may_store: true,
  may_transform: true,
  may_display: true,
  coverage_level: "SUBDISTRICT",
  coverage_note_th:
    "ครอบคลุมอาคารชุดที่จดทะเบียนแล้ว 7,906 แห่ง ใน 51 จาก 77 จังหวัด ไม่ครอบคลุมบ้านเดี่ยว ทาวน์เฮาส์ ที่ดินเปล่า หรืออาคารที่ไม่ได้จดทะเบียนอาคารชุด อีก 26 จังหวัดไม่มีข้อมูล ซึ่งไม่ได้แปลว่าไม่มีอาคารชุด",
  refresh_frequency: "รายรอบบัญชีประเมินราคา (ทุก 4 ปี)",
  must_not_become_th:
    "เป็นราคาประเมินเพื่อการจัดเก็บภาษีเท่านั้น ห้ามใช้แทนราคาซื้อขายในตลาดหรือราคาเสนอขาย ห้ามใช้ประเมินมูลค่าห้องชุดใดห้องชุดหนึ่งโดยเฉพาะเพราะช่วงราคาไม่ได้ระบุว่าชั้นใดมีราคาเท่าใด ห้ามใช้เป็นหลักฐานว่ามีหรือไม่มีดีมานด์ และห้ามนำราคาของอาคารต่าง ๆ มาเฉลี่ยเป็นราคาอาคารชุดของพื้นที่",
};

const PARSER_VERSION = "treasury-condominium-valuation@1.0.0";
const UNIT_CODE = "THB_PER_SQM";
const FETCH_TIMEOUT_MS = 180_000;

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
    observation.geography_level,
    observation.geography_code,
    observation.period_end_year,
    observation.population,
  ].join("|");
}

async function main() {
  console.log(`fetching ${CONDOMINIUM_VALUATION_URL}`);
  const started = Date.now();
  const result = await fetchCondominiumValuation({ timeoutMs: FETCH_TIMEOUT_MS });
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
    // Both levels are looked up: a building whose row named no subdistrict is placed in its
    // district rather than guessed into one of that district's children.
    const areas = (
      await client.query(
        `SELECT id, code, level FROM reference.administrative_area
          WHERE level IN ('SUBDISTRICT', 'DISTRICT') AND valid_to IS NULL`,
      )
    ).rows;
    const idByLevelCode = new Map(areas.map((row) => [`${row.level}|${Number(row.code)}`, row.id]));

    const rows = [];
    const unmatched = new Set();
    for (const observation of observations) {
      const adminAreaId = idByLevelCode.get(
        `${observation.geography_level}|${observation.geography_code}`,
      );
      if (!adminAreaId) {
        // Recorded by code, never mapped to a neighbouring area to make the count look complete.
        unmatched.add(`${observation.geography_level}:${observation.geography_code}`);
        continue;
      }
      rows.push({
        key: observationKey(observation),
        populationTh: observation.population,
        adminAreaId,
        geographyLevel: observation.geography_level,
        value: observation.value,
        valueLow: observation.value_low,
        valueHigh: observation.value_high,
        periodStartYear: observation.period_start_year,
        periodEndYear: observation.period_end_year,
        sourceVintage: String(observation.period_end_year + 543),
        epistemicStatus: observation.epistemic_status,
        locator: `${CONDOMINIUM_VALUATION_URL}#${observation.geography_level.toLowerCase()}=${observation.geography_code}`,
        // Says plainly which figures were read straight off a row and which summarise several.
        extractionMethod: observation.value !== undefined ? "csv-row" : "csv-rows-min-max",
        reliability: "AUTHORITATIVE",
        completeness: "COMPLETE",
        sourceNoteTh: observation.source_note,
      });
    }

    const subdistrictRows = rows.filter((r) => r.geographyLevel === "SUBDISTRICT").length;
    console.log(
      `matched ${rows.length} observations — ${subdistrictRows} to a subdistrict, ` +
        `${rows.length - subdistrictRows} to a district`,
    );
    if (unmatched.size > 0) {
      console.log(`  area codes with no reference match: ${unmatched.size}`);
      console.log(`  ${[...unmatched].slice(0, 20).join(", ")}`);
    }

    if (dryRun) {
      console.log("--dry-run: nothing written");
      return;
    }

    await client.query("BEGIN");
    const product = await registerProduct(client, PRODUCT);
    const payloadHash = createHash("sha256")
      .update(
        observations
          .map(
            (o) =>
              `${o.geography_level}|${o.geography_code}|${o.population}|${o.value ?? `${o.value_low}-${o.value_high}`}`,
          )
          .join("\n"),
      )
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
      measureId: CONDOMINIUM_VALUATION_MEASURE_ID,
      unitCode: UNIT_CODE,
      currency: "THB",
      statistic: "RANGE",
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
