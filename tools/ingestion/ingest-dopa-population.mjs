#!/usr/bin/env node
/**
 * Bulk ingestion: DOPA registered population, nationwide, by province and subdistrict.
 *
 * One file per province, fetched at ≤1 request/second — the pace the source research used, and the
 * courtesy a public statistics site is owed. Runs off the interactive path
 * (docs/technology-stack.md §15); an analysis run reads the corpus this writes.
 *
 * Two identity rules, both of which refuse rather than guess:
 *
 *   * A published subdistrict row carries a name and no code, so it is matched by name within its
 *     own province. Where a province has two subdistricts of the same name in different districts,
 *     the row cannot be attributed and **no observation is written** — the name is reported instead.
 *   * A subdistrict figure is the sum of that subdistrict's rows across every local authority
 *     covering it. That sum is arithmetic over a partition the parser verifies, so it is recorded as
 *     DERIVED, never as OBSERVED: the source published the parts, not this total.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/ingest-dopa-population.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  DOPA_POPULATION_MEASURE_ID,
  DOPA_POPULATION_SOURCE_PRODUCT_ID,
  dopaPopulationUrl,
  fetchDopaPopulation,
} from "../../packages/source-adapters/dist/index.js";
import { registerProduct, registerVersion, upsertObservations } from "./lib/registry.mjs";

/** December snapshot, Buddhist-era YYMM. The site's year index links to these annual files. */
const PERIOD_CODE = "6812";
const PERIOD_CE_YEAR = 2025;
const PERIOD_BE_YEAR = "2568";

const PRODUCT = {
  product_id: DOPA_POPULATION_SOURCE_PRODUCT_ID,
  owner_id: "dopa",
  owner_name_th: "กรมการปกครอง กระทรวงมหาดไทย",
  owner_contact: "https://stat.bora.dopa.go.th/",
  title_th: "สถิติจำนวนประชากรตามทะเบียนราษฎร (รายจังหวัดและรายตำบล)",
  access_url: "https://stat.bora.dopa.go.th/new_stat/webPage/statByProvince.php",
  catalogue_url: "https://stat.bora.dopa.go.th/new_stat/webPage/statByYear.php",
  // The publisher licenses this dataset as CC-BY on the national open-data portal (package
  // `statbyyear`); the statistics site we acquire from carries no separate licence statement of its
  // own. See docs/data-sources/dopa.md — the gap is recorded, not glossed over.
  licence_id: "Creative Commons Attributions (data.go.th: statbyyear)",
  attribution_th: "ที่มา: กรมการปกครอง กระทรวงมหาดไทย (สถิติทะเบียนราษฎร)",
  may_acquire: true,
  may_store: true,
  may_transform: true,
  may_display: true,
  coverage_level: "SUBDISTRICT",
  coverage_note_th: "ครอบคลุมทุกจังหวัด อำเภอ และตำบลทั่วประเทศ ข้อมูล ณ เดือนธันวาคมของแต่ละปี",
  refresh_frequency: "รายปี (ข้อมูล ณ เดือนธันวาคม) และมีรายเดือนแยกต่างหาก",
  must_not_become_th:
    "เป็นจำนวนผู้มีชื่อในทะเบียนบ้านเท่านั้น ห้ามใช้แทนจำนวนคนที่อาศัยอยู่จริงหรือกำลังซื้อในพื้นที่ พื้นที่ท่องเที่ยวและอุตสาหกรรมมักมีประชากรแฝงที่ไม่ถูกนับ และห้ามใช้ตัวเลขระดับตำบลแทนจำนวนครัวเรือน",
};

const PARSER_VERSION = "dopa-registered-population@1.0.0";
const UNIT_CODE = "PERSONS";
const REQUEST_PACING_MS = 1_000;
const FETCH_TIMEOUT_MS = 60_000;

const COHORTS = [
  { key: "total", population_th: "รวมทั้งสิ้น" },
  { key: "male", population_th: "ชาย" },
  { key: "female", population_th: "หญิง" },
];

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL is not set.");
  process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function observationKey(level, areaCode, cohort) {
  return [
    PRODUCT.product_id,
    DOPA_POPULATION_MEASURE_ID,
    level,
    areaCode,
    PERIOD_CE_YEAR,
    cohort,
  ].join("|");
}

async function main() {
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
      console.error("no provinces in reference — run pnpm db:seed:reference first");
      process.exit(1);
    }

    // Subdistricts keyed by province, with the count of districts sharing each name: more than one
    // means a published row cannot be attributed to a single subdistrict.
    const subdistrictRows = (
      await client.query(
        `SELECT p.code AS province_code, s.id, s.name_th,
                count(*) OVER (PARTITION BY p.id, s.name_th) AS name_uses
           FROM reference.administrative_area s
           JOIN reference.administrative_area d ON d.id = s.parent_id
           JOIN reference.administrative_area p ON p.id = d.parent_id
          WHERE s.level = 'SUBDISTRICT' AND s.valid_to IS NULL`,
      )
    ).rows;
    const byProvince = new Map();
    for (const row of subdistrictRows) {
      const key = String(row.province_code);
      if (!byProvince.has(key)) byProvince.set(key, new Map());
      byProvince.get(key).set(row.name_th, { id: row.id, uses: Number(row.name_uses) });
    }

    const observations = [];
    const hash = createHash("sha256");
    let bytes = 0;
    const ambiguous = [];
    const unmatched = [];
    let blocksChecked = 0;

    for (const [index, province] of provinces.entries()) {
      const url = dopaPopulationUrl(PERIOD_CODE, province.code);
      const result = await fetchDopaPopulation(PERIOD_CODE, province.code, {
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      if (result.outcome !== "SUCCESS") {
        console.error(
          `${province.name_th}: ${result.outcome} (retryable=${result.retryable}) — ${result.reason}`,
        );
        process.exit(1);
      }
      const { parse } = result;
      blocksChecked += parse.blocks_checked;
      // Hashing the parsed figures rather than raw bytes: 77 files make one logical publication, and
      // this is what the version label has to identify.
      hash.update(JSON.stringify(parse));
      bytes += JSON.stringify(parse).length;

      for (const cohort of COHORTS) {
        observations.push({
          key: observationKey("PROVINCE", province.code, cohort.key),
          populationTh: cohort.population_th,
          adminAreaId: province.id,
          geographyLevel: "PROVINCE",
          value: String(parse.province[cohort.key]),
          periodStartYear: PERIOD_CE_YEAR,
          periodEndYear: PERIOD_CE_YEAR,
          sourceVintage: PERIOD_BE_YEAR,
          // Read straight off the published province row.
          epistemicStatus: "OBSERVED",
          locator: url,
          extractionMethod: "pipe-delimited-province-row",
          reliability: "AUTHORITATIVE",
          completeness: "COMPLETE",
          sourceNoteTh: null,
        });
      }

      const reference = byProvince.get(String(province.code));
      for (const subdistrict of parse.subdistricts) {
        const match = reference?.get(subdistrict.name_th);
        if (!match) {
          unmatched.push(`${province.name_th}/${subdistrict.name_th}`);
          continue;
        }
        if (match.uses > 1) {
          // Two subdistricts of this name in the province; the published row says which local
          // authority, not which district. Attributing it would be a guess.
          ambiguous.push(`${province.name_th}/${subdistrict.name_th}`);
          continue;
        }
        const note =
          subdistrict.row_count > 1
            ? `รวมจากพื้นที่การปกครองท้องถิ่น ${subdistrict.row_count} แห่งที่ครอบคลุมตำบลนี้`
            : null;
        for (const cohort of COHORTS) {
          observations.push({
            key: observationKey(
              "SUBDISTRICT",
              `${province.code}:${subdistrict.name_th}`,
              cohort.key,
            ),
            populationTh: cohort.population_th,
            adminAreaId: match.id,
            geographyLevel: "SUBDISTRICT",
            value: String(subdistrict[cohort.key]),
            periodStartYear: PERIOD_CE_YEAR,
            periodEndYear: PERIOD_CE_YEAR,
            sourceVintage: PERIOD_BE_YEAR,
            // A sum over the published partition, not a figure the source printed.
            epistemicStatus: "DERIVED",
            locator: url,
            extractionMethod: "sum-of-local-authority-rows",
            reliability: "AUTHORITATIVE",
            completeness: "COMPLETE",
            sourceNoteTh: note,
          });
        }
      }

      if (index % 10 === 0 || index === provinces.length - 1) {
        console.log(`  ${index + 1}/${provinces.length} ${province.name_th}`);
      }
      if (index < provinces.length - 1) {
        await wait(REQUEST_PACING_MS);
      }
    }

    console.log(
      `parsed ${provinces.length} provinces, ${blocksChecked} local-authority blocks reconciled, ` +
        `${observations.length} observations`,
    );
    if (ambiguous.length > 0) {
      console.log(
        `  skipped ${ambiguous.length} ambiguous subdistrict name(s): ${ambiguous.slice(0, 5).join(", ")}${ambiguous.length > 5 ? " …" : ""}`,
      );
    }
    if (unmatched.length > 0) {
      console.log(
        `  ${unmatched.length} published name(s) not in the reference table: ${unmatched.join(", ")}`,
      );
    }

    if (dryRun) {
      console.log("--dry-run: nothing written");
      return;
    }

    await client.query("BEGIN");
    const product = await registerProduct(client, PRODUCT);
    const version = await registerVersion(client, product.id, {
      label: `${PERIOD_CODE}:${hash.digest("hex").slice(0, 16)}`,
      recordCount: observations.length,
      sha256: createHash("sha256").update(`${PERIOD_CODE}:${observations.length}`).digest("hex"),
      bytes,
      // PARTIAL whenever any published row could not be attributed — the record says so rather than
      // implying a clean sweep.
      parseStatus: ambiguous.length + unmatched.length === 0 ? "PARSED" : "PARTIAL",
      parserVersion: PARSER_VERSION,
    });

    const counts = await upsertObservations(client, {
      measureId: DOPA_POPULATION_MEASURE_ID,
      unitCode: UNIT_CODE,
      currency: null,
      statistic: "TOTAL",
      versionId: version.id,
      retrievedAt: version.retrieved_at,
      rows: observations,
    });
    await client.query("COMMIT");

    console.log(
      `ingest done — ${counts.inserted} new observation version(s), ${counts.superseded} superseded, ${counts.unchanged} unchanged`,
    );
    const stateNote =
      product.activation_state === "ACTIVE"
        ? ""
        : " — analysis runs will not use it until it is activated";
    console.log(`product ${PRODUCT.product_id} is ${product.activation_state}${stateNote}`);
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
