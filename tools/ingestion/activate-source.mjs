#!/usr/bin/env node
/**
 * Records the audited activation decision for one SourceProduct
 * (docs/implementation-plan.md §4, docs/data-architecture.md §8).
 *
 * Activation is runtime configuration, never a code constant: no source becomes usable by editing a
 * flag in a TypeScript file. It becomes usable when a person accepts each of the ten gate items and
 * signs the record with their name (RD-4). The database refuses an ACTIVE product without such a
 * record, and refuses a record missing any gate item.
 *
 * This is an academic review record. It is not a professional certification of the data
 * (docs/project-overview.md, RD-4) and must never be described as one.
 *
 *   node --env-file=apps/web/.env.migration tools/ingestion/activate-source.mjs \
 *     --product <product_id> --reviewers "ชื่อ ก,ชื่อ ข" --dossier docs/data-sources/nso.md [--note "..."]
 *   node ... activate-source.mjs --product <product_id> --suspend --reviewers "..." --note "reason"
 *   node ... activate-source.mjs --list
 *
 * The dossier is a markdown file whose "## Gate" section holds one `- item_key: evidence` line per
 * gate item. The evidence text is stored with the decision, so the reason a source was allowed to
 * run is auditable long after the person who allowed it has moved on.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";

const GATE_ITEMS = [
  "owner_and_locator_verified",
  "access_authorized_and_reproducible",
  "field_semantics_units_time_verified",
  "coverage_and_resolution_documented",
  "licence_permits_acquire_store_transform_display",
  "privacy_minimization_reviewed",
  "update_revision_behavior_handled",
  "adapter_fixtures_pass",
  "operational_limits_configured",
  "analytical_fitness_approved",
];

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

const databaseUrl = process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  console.error("MIGRATION_DATABASE_URL is not set.");
  process.exit(1);
}

async function readDossier(path) {
  const text = await readFile(path, "utf8");
  const section = text.split(/^## +Gate\b.*$/m)[1];
  if (!section) {
    throw new Error(`${path} has no "## Gate" section`);
  }
  const acceptance = {};
  for (const line of section.split("\n")) {
    const match = /^- +([a-z_]+): +(.+?)\s*$/.exec(line);
    if (match && GATE_ITEMS.includes(match[1])) {
      acceptance[match[1]] = match[2];
    }
    if (/^## /.test(line)) break;
  }
  const missing = GATE_ITEMS.filter((item) => !acceptance[item]);
  if (missing.length > 0) {
    // Refused rather than defaulted: an unanswered gate item is not an accepted one.
    throw new Error(`${path} is missing gate item(s): ${missing.join(", ")}`);
  }
  return acceptance;
}

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (flag("list")) {
      const rows = (
        await client.query(
          `SELECT p.product_id, p.activation_state, p.licence_id,
                  r.reviewer_names, r.lifecycle_state, r.reviewed_at
             FROM source.source_product p
             LEFT JOIN source.activation_record r ON r.id = p.activation_record_id
            ORDER BY p.product_id`,
        )
      ).rows;
      if (rows.length === 0) console.log("no source products registered");
      for (const row of rows) {
        const review = row.reviewer_names
          ? `reviewed by ${row.reviewer_names.join(", ")} (${row.lifecycle_state}) on ${new Date(row.reviewed_at).toISOString().slice(0, 10)}`
          : "(no activation record)";
        console.log(`${row.product_id}  ${row.activation_state}  ${review}`);
      }
      return;
    }

    const productId = arg("product");
    const reviewers = (arg("reviewers") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const suspend = flag("suspend");
    const note = arg("note") ?? "";

    if (!productId || reviewers.length === 0) {
      console.error(
        'usage: --product <product_id> --reviewers "name,name" [--dossier <file> | --suspend] [--note "..."]',
      );
      process.exit(1);
    }

    const product = (
      await client.query(
        "SELECT id, activation_state FROM source.source_product WHERE product_id = $1",
        [productId],
      )
    ).rows[0];
    if (!product) {
      console.error(
        `unknown product_id "${productId}" — ingest it first so its metadata is registered`,
      );
      process.exit(1);
    }

    if (suspend) {
      if (!note) {
        console.error("--suspend requires --note explaining why");
        process.exit(1);
      }
      await client.query("BEGIN");
      const record = await client.query(
        `INSERT INTO source.activation_record
           (source_product_id, decision, gate_acceptance, reviewer_names, review_note_th, lifecycle_state)
         VALUES ($1, 'SUSPEND', '{}'::jsonb, $2, $3, 'RETIRED') RETURNING id`,
        [product.id, reviewers, note],
      );
      // The suspension record becomes the product's current record, so the audit trail points at
      // the decision actually in force.
      await client.query(
        `UPDATE source.source_product
            SET activation_state = 'SUSPENDED', activation_record_id = $2, updated_at = now()
          WHERE id = $1`,
        [product.id, record.rows[0].id],
      );
      await client.query("COMMIT");
      console.log(`${productId} suspended by ${reviewers.join(", ")}`);
      return;
    }

    const dossier = arg("dossier");
    if (!dossier) {
      console.error(
        "--dossier <file> is required to activate: the gate items must come from a written record",
      );
      process.exit(1);
    }
    const acceptance = await readDossier(dossier);

    await client.query("BEGIN");
    const record = await client.query(
      `INSERT INTO source.activation_record
         (source_product_id, decision, gate_acceptance, reviewer_names, review_note_th, lifecycle_state)
       VALUES ($1, 'ACTIVATE', $2, $3, $4, 'ACADEMIC_REVIEWED') RETURNING id`,
      [
        product.id,
        JSON.stringify({ ...acceptance, dossier }),
        reviewers,
        note || `ยอมรับเงื่อนไขการเปิดใช้งานตามเอกสาร ${dossier}`,
      ],
    );
    await client.query(
      `UPDATE source.source_product
          SET activation_state = 'ACTIVE', activation_record_id = $2, updated_at = now()
        WHERE id = $1`,
      [product.id, record.rows[0].id],
    );
    await client.query("COMMIT");
    console.log(
      `${productId} ACTIVE — academic review record #${record.rows[0].id} by ${reviewers.join(", ")}`,
    );
    console.log("This is an academic review record, not a professional certification of the data.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
