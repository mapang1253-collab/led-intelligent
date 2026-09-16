#!/usr/bin/env node
/**
 * Records the academic review of a legal rule pack (RD-4, docs/validation-architecture.md §9).
 *
 * The same principle as source activation: a pack executes because named people accepted a specific
 * set of rules, not because a field says so. The review is bound to a SHA-256 of the rules, so any
 * later edit — a changed threshold, an added clause — invalidates it automatically and the pack
 * stops executing until it is reviewed again.
 *
 *   node tools/ingestion/review-pack.mjs --pack database/reviewed-packs/th-cba-mr55-v1.json \
 *     --reviewers "ชื่อ ก,ชื่อ ข" --basis "..." --limitation "..." --limitation "..."
 *   node tools/ingestion/review-pack.mjs --pack <file> --retire --reviewers "..."
 *   node tools/ingestion/review-pack.mjs --pack <file> --check
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
function args(name) {
  const out = [];
  process.argv.forEach((value, index) => {
    if (value === `--${name}` && process.argv[index + 1]) out.push(process.argv[index + 1]);
  });
  return out;
}
const flag = (name) => process.argv.includes(`--${name}`);

/** Mirrors canonicalPackContent in @reis/validation-engine; the two must agree byte for byte. */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function packHash(pack) {
  const canonical = stableStringify({
    pack_id: pack.pack_id,
    version: pack.version,
    declared_critical_families: [...pack.declared_critical_families].sort(),
    rules: pack.rules,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

async function main() {
  const path = arg("pack");
  if (!path) {
    console.error(
      'usage: --pack <file> [--check | --retire] --reviewers "name,name" [--basis "..."] [--limitation "..."]',
    );
    process.exit(1);
  }
  const pack = JSON.parse(await readFile(path, "utf8"));
  const hash = packHash(pack);

  if (flag("check")) {
    console.log(
      `${pack.pack_id} v${pack.version}  ${pack.lifecycle_state}  rules=${pack.rules.length}`,
    );
    console.log(`content hash: ${hash}`);
    if (!pack.review) {
      console.log("no review record — this pack will not execute");
    } else if (pack.review.content_hash !== hash) {
      console.log(`REVIEW STALE: signed ${pack.review.content_hash}`);
      console.log("the rules changed after review; this pack will not execute");
    } else {
      console.log(`reviewed by ${pack.review.reviewers.join(", ")} on ${pack.review.reviewed_on}`);
    }
    return;
  }

  const reviewers = (arg("reviewers") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (reviewers.length === 0) {
    console.error("--reviewers is required: a review record names the people who read the rules");
    process.exit(1);
  }

  if (flag("retire")) {
    pack.lifecycle_state = "RETIRED";
    await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
    console.log(`${pack.pack_id} RETIRED by ${reviewers.join(", ")}`);
    return;
  }

  const basis = arg("basis");
  if (!basis) {
    console.error("--basis is required: what the reviewers read the rules against");
    process.exit(1);
  }
  const limitations = args("limitation");
  if (limitations.length === 0) {
    console.error(
      "--limitation is required at least once: a pack with no stated limits is not a reviewed pack",
    );
    process.exit(1);
  }

  pack.lifecycle_state = "ACADEMIC_REVIEWED";
  pack.review = {
    reviewers,
    reviewed_on: new Date().toISOString().slice(0, 10),
    content_hash: hash,
    evidence_basis_th: basis,
    limitations_th: limitations,
  };
  await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  console.log(`${pack.pack_id} v${pack.version} ACADEMIC_REVIEWED by ${reviewers.join(", ")}`);
  console.log(`bound to content hash ${hash}`);
  console.log("This is an academic review record, not professional or legal certification.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
