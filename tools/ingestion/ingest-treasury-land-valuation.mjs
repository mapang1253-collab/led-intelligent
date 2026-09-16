#!/usr/bin/env node
/**
 * Bulk ingestion: Treasury assessed land values for non-title-deed land, nationwide.
 *
 * One UTF-8 CSV of 31,999 rows priced by land unit — the position a plot occupies, such as fronting
 * a highway or lying behind the plots that do. Runs off the interactive path.
 *
 * The caveat that matters here is not the usual one. Every source in this repo has to say it is an
 * assessment and not a market price; this one must also say whose land it is about. It prices land
 * held on น.ส.3, ส.ค.1 and similar, not land held on a โฉนด, and most urban land is titled. Handing
 * it to a reader with a title deed as their land's value would be wrong twice over.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/ingest-treasury-land-valuation.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  LAND_VALUATION_MEASURE_ID,
  LAND_VALUATION_SOURCE_PRODUCT_ID,
  LAND_VALUATION_URL,
  fetchLandValuation,
} from "../../packages/source-adapters/dist/index.js";
import { registerProduct, registerVersion, upsertObservations } from "./lib/registry.mjs";

const PRODUCT = {
  product_id: LAND_VALUATION_SOURCE_PRODUCT_ID,
  owner_id: "treasury",
  owner_name_th: "กรมธนารักษ์ กระทรวงการคลัง",
  owner_contact: "pvb@treasury.go.th",
  title_th: "ราคาประเมินทุนทรัพย์ที่ดินประเภทอื่น",
  access_url: LAND_VALUATION_URL,
  catalogue_url: "https://catalog.treasury.go.th/dataset/other-land-type-valuation",
  licence_id: "Open Data Common",
  attribution_th: "ที่มา: กรมธนารักษ์ (ราคาประเมินทุนทรัพย์ที่ดินประเภทอื่น)",
  may_acquire: true,
  may_store: true,
  may_transform: true,
  may_display: true,
  coverage_level: "SUBDISTRICT",
  coverage_note_th:
    "ครอบคลุม 76 จาก 77 จังหวัด และ 5,447 จาก 7,436 ตำบล เฉพาะที่ดินที่มีเอกสารสิทธิประเภทอื่นนอกเหนือจากโฉนดที่ดินและ น.ส.3 ก. เท่านั้น ที่ดินมีโฉนดซึ่งเป็นที่ดินส่วนใหญ่ในเขตเมืองไม่มีข้อมูลในชุดนี้ การไม่มีข้อมูลจึงไม่ได้แปลว่าที่ดินนั้นไม่มีราคาประเมิน",
  refresh_frequency: "รายปี ตามรอบบัญชีประเมินราคาทุก 4 ปี",
  must_not_become_th:
    "ห้ามใช้เป็นราคาประเมินของที่ดินที่มีโฉนด เพราะชุดข้อมูลนี้ครอบคลุมเฉพาะที่ดินที่มีเอกสารสิทธิประเภทอื่น ห้ามใช้แทนราคาซื้อขายในตลาดหรือราคาเสนอขาย ห้ามใช้ประเมินมูลค่าที่ดินแปลงใดแปลงหนึ่งโดยเฉพาะเพราะราคาแยกตามหน่วยที่ดิน ไม่ใช่รายแปลง และห้ามนำราคาของหน่วยที่ดินต่าง ๆ มาเฉลี่ยเป็นราคาที่ดินของพื้นที่",
};

const PARSER_VERSION = "treasury-other-land-valuation@1.0.0";
const UNIT_CODE = "THB_PER_SQWA";
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
    observation.geography_level,
    observation.geography_code,
    observation.period_end_year,
    observation.population,
  ].join("|");
}

async function main() {
  console.log(`fetching ${LAND_VALUATION_URL}`);
  const started = Date.now();
  const result = await fetchLandValuation({ timeoutMs: FETCH_TIMEOUT_MS });
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
    let widened = 0;
    for (const observation of observations) {
      let level = observation.geography_level;
      let adminAreaId = idByLevelCode.get(`${level}|${observation.geography_code}`);

      if (!adminAreaId && level === "SUBDISTRICT") {
        // A third of this file's rows are municipalities — เทศบาลตำบลโคกตูม and the like — whose
        // sixth-digit code is a municipality number, not a subdistrict's. The district it sits in
        // is still exactly known from the first four digits, so the figure is placed there and
        // labelled district-level. Dropping it would lose real prices for real places; guessing a
        // subdistrict inside that district would invent a precision the file does not have.
        const districtCode = Math.floor(observation.geography_code / 100);
        const districtId = idByLevelCode.get(`DISTRICT|${districtCode}`);
        if (districtId) {
          level = "DISTRICT";
          adminAreaId = districtId;
          widened += 1;
        }
      }

      if (!adminAreaId) {
        // Recorded by code, never mapped to a neighbouring area to make the count look complete.
        unmatched.add(`${observation.geography_level}:${observation.geography_code}`);
        continue;
      }
      rows.push({
        key: observationKey(observation),
        populationTh: observation.population,
        adminAreaId,
        geographyLevel: level,
        value: observation.value,
        valueLow: observation.value_low,
        valueHigh: observation.value_high,
        periodStartYear: observation.period_start_year,
        periodEndYear: observation.period_end_year,
        sourceVintage: String(observation.period_end_year + 543),
        epistemicStatus: observation.epistemic_status,
        locator: `${LAND_VALUATION_URL}#${observation.geography_level.toLowerCase()}=${observation.geography_code}`,
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
        `${rows.length - subdistrictRows} to a district (${widened} widened from a municipality code)`,
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
      measureId: LAND_VALUATION_MEASURE_ID,
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
