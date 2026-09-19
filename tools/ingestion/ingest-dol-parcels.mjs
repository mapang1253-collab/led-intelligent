/**
 * Loads Land Department parcel identity for one province (docs/adr/0007).
 *
 * Run offline, like every other ingest here, because it needs the filesystem and an archive tool
 * that a Worker has neither of. `pnpm ingest:dol-parcels -- pathumthani`
 *
 * Three things about the source shape the script more than the database does.
 *
 * The files DOL publishes as `.shp` inside the dataset zip are RAR archives with the wrong
 * extension. They are unpacked with bsdtar, which ships with macOS and most Linuxes and reads RAR5
 * without a licence question.
 *
 * Only the `.dbf` is read. The polygons are in the `.shp` beside it and are not loaded: one branch
 * expands to half a gigabyte, five provinces would not fit the database this project runs on, and
 * nothing on screen draws a parcel outline. The centre point DOL already publishes in ORIGIN_X and
 * ORIGIN_Y is all a lookup needs, and it costs sixteen bytes instead of a polygon.
 *
 * Those origins are UTM zone 47N, so they are transformed to WGS84 by PostGIS on the way in rather
 * than by arithmetic here. Some rows carry no origin at all; they are kept, because the identity
 * and the area are still the answer to "which parcel is this" and a missing centre is a gap in the
 * source rather than a reason to drop a real parcel.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { readDbf } from "./lib/dbf.mjs";

/** The five provinces DOL publishes openly, with the resource that holds each one. */
const PROVINCES = {
  nonthaburi: {
    code: "12",
    name_th: "นนทบุรี",
    dataset: "landparcel-nonthaburi",
    url: "https://data.go.th/dataset/aa2ff70b-e4b5-4a2e-8f2c-1c4b1a05e3d5/resource/00000000-0000-0000-0000-000000000000/download/landparcel-nonthaburi.zip",
  },
  pathumthani: {
    code: "13",
    name_th: "ปทุมธานี",
    dataset: "landparcel-pathumthani",
    url: "https://data.go.th/dataset/5db43127-3d7c-45e5-ac34-20e5a96a514b/resource/aba9df8a-4577-40fc-acf5-914ec8b2df00/download/landparcel-pathumthani-rctn7x.zip",
  },
  samutprakan: {
    code: "11",
    name_th: "สมุทรปราการ",
    dataset: "landparcel-samutprakan",
    url: "https://data.go.th/dataset/123b194b-4232-447e-a61d-7f2777b46909/resource/8ca9a392-d0ca-4324-ad51-585513c79721/download/landparcel-samutprakan-2dbjyi.zip",
  },
  samutsakhon: {
    code: "74",
    name_th: "สมุทรสาคร",
    dataset: "landparcel-samutsakhon",
    url: "https://data.go.th/dataset/d3ed37cd-07f5-45a7-9786-11470889fdce/resource/7451f517-0296-40bf-b775-31ef9bfb2a9f/download/landparcel-samutsakhon-ha4gz3.zip",
  },
};

const SOURCE = "กรมที่ดิน open data (DGA Open Government License)";
/** Thailand west of 102°E; every one of these five provinces is in it. */
const UTM_47N = 32647;
const BATCH = 1000;

const key = process.argv[2];
const province = PROVINCES[key];
if (!province) {
  console.error(`usage: ingest-dol-parcels.mjs <${Object.keys(PROVINCES).join("|")}>`);
  process.exit(1);
}

const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL is not set (see apps/web/.env.migration)");
  process.exit(1);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "dol-parcel-"));

function unpack(zipPath) {
  // The zip holds one RAR per land office, each misnamed .shp.
  execFileSync("bsdtar", ["-xf", zipPath, "-C", workDir]);
  const inner = fs
    .readdirSync(workDir)
    .filter((name) => name.endsWith(".shp"))
    .map((name) => path.join(workDir, name));
  for (const archive of inner) {
    const into = path.join(workDir, path.basename(archive, ".shp"));
    fs.mkdirSync(into, { recursive: true });
    try {
      execFileSync("bsdtar", ["-xf", archive, "-C", into]);
    } catch {
      console.warn(`  could not unpack ${path.basename(archive)}, skipping`);
    }
  }
}

function* dbfFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* dbfFiles(full);
    else if (entry.name.toLowerCase().endsWith(".dbf")) yield full;
  }
}

/** A parcel row, or null when the record cannot identify a parcel at all. */
function toParcel(row) {
  const landNo = (row.LAND_NO ?? "").trim();
  const map1 = (row.UTMMAP1 ?? "").trim();
  const map2 = Number((row.UTMMAP2 ?? "").trim());
  const map3 = (row.UTMMAP3 ?? "").trim();
  const map4 = (row.UTMMAP4 ?? "").trim();
  // Without a sheet and a number there is nothing to look the parcel up by later.
  if (!landNo || !map1 || !map3 || !Number.isInteger(map2) || map2 < 1 || map2 > 4) {
    return null;
  }
  const x = Number(row.ORIGIN_X);
  const y = Number(row.ORIGIN_Y);
  const area = Number(row.AREA);
  return {
    map1,
    map2,
    map3,
    map4: map4 || "00",
    landNo,
    province: (row.PRO_NME ?? "").trim() || province.name_th,
    district: (row.APM_NME ?? "").trim() || null,
    subdistrict: (row.TAM_NME ?? "").trim() || null,
    area: Number.isFinite(area) && area > 0 ? area : null,
    x: Number.isFinite(x) && x !== 0 ? x : null,
    y: Number.isFinite(y) && y !== 0 ? y : null,
  };
}

async function flush(client, rows) {
  if (rows.length === 0) return 0;
  // The source repeats a (sheet, เลขที่ดิน) pair within a single file — Postgres refuses an
  // ON CONFLICT batch that touches one row twice, and it is right to: the two records disagree
  // about nothing we keep, so the later one wins and the count reflects what was written.
  const unique = new Map();
  for (const row of rows) {
    unique.set(`${row.map1}|${row.map2}|${row.map3}|${row.map4}|${row.landNo}`, row);
  }
  const deduped = [...unique.values()];
  const values = [];
  const params = [];
  deduped.forEach((r, i) => {
    const b = i * 12;
    values.push(
      `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},` +
        `CASE WHEN $${b + 11}::double precision IS NULL THEN NULL ELSE ` +
        `ST_Transform(ST_SetSRID(ST_MakePoint($${b + 11}::double precision, $${b + 12}::double precision), ${UTM_47N}), 4326)::geography END,` +
        `'${SOURCE}')`,
    );
    params.push(
      r.map1,
      r.map2,
      r.map3,
      r.map4,
      r.landNo,
      province.code,
      r.province,
      r.district,
      r.subdistrict,
      r.area,
      r.x,
      r.y,
    );
  });
  await client.query(
    `INSERT INTO reference.land_parcel
       (utm_map_1, utm_map_2, utm_map_3, utm_map_4, land_no,
        province_code, province_name_th, district_name_th, subdistrict_name_th, area_sqm,
        centroid, source)
     VALUES ${values.join(",")}
     ON CONFLICT (utm_map_1, utm_map_2, utm_map_3, utm_map_4, land_no) DO UPDATE SET
       subdistrict_name_th = EXCLUDED.subdistrict_name_th,
       district_name_th    = EXCLUDED.district_name_th,
       area_sqm            = COALESCE(EXCLUDED.area_sqm, reference.land_parcel.area_sqm),
       centroid            = COALESCE(EXCLUDED.centroid, reference.land_parcel.centroid),
       ingested_at         = now()`,
    params,
  );
  return deduped.length;
}

async function main() {
  const zipPath = process.env.PARCEL_ZIP ?? path.join(workDir, "province.zip");
  if (!process.env.PARCEL_ZIP) {
    console.log(`downloading ${province.dataset}…`);
    const response = await fetch(province.url);
    if (!response.ok) throw new Error(`download failed: ${response.status}`);
    fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
  }
  console.log(`unpacking ${path.basename(zipPath)}…`);
  unpack(zipPath);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  let total = 0;
  let skipped = 0;
  let withoutPoint = 0;
  try {
    for (const file of dbfFiles(workDir)) {
      const buffer = fs.readFileSync(file);
      let batch = [];
      for (const row of readDbf(buffer)) {
        const parcel = toParcel(row);
        if (!parcel) {
          skipped += 1;
          continue;
        }
        if (parcel.x === null) withoutPoint += 1;
        batch.push(parcel);
        if (batch.length >= BATCH) {
          total += await flush(client, batch);
          batch = [];
        }
      }
      total += await flush(client, batch);
      process.stdout.write(`  ${path.basename(file)} → ${total.toLocaleString()} parcels\r`);
    }
    await client.query(
      "UPDATE reference.land_parcel_coverage SET ingested_at = now() WHERE province_code = $1",
      [province.code],
    );
  } finally {
    await client.end();
  }
  console.log(
    `\n${province.name_th}: ${total.toLocaleString()} parcels ingested · ` +
      `${withoutPoint.toLocaleString()} without a published centre · ${skipped.toLocaleString()} unidentifiable rows skipped`,
  );
  fs.rmSync(workDir, { recursive: true, force: true });
}

main().catch((error) => {
  fs.rmSync(workDir, { recursive: true, force: true });
  console.error(error);
  process.exit(1);
});
