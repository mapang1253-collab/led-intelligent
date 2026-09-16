#!/usr/bin/env node
/**
 * Records the academic review of a valuation method.
 *
 * Same principle as the legal pack and source activation: a method executes because named people
 * read a specific formula, not because a field says ACADEMIC_REVIEWED. The record is bound to a
 * SHA-256 of the methods, so turning 400 into 40 in the land conversion afterwards invalidates the
 * approval instead of inheriting it, and the app stops computing until it is reviewed again.
 *
 *   node tools/ingestion/review-valuation.mjs --method database/reviewed-packs/th-valuation-assessed-v1.json \
 *     --reviewers "ชื่อ ก,ชื่อ ข" --basis "..." --limitation "..."
 *   node tools/ingestion/review-valuation.mjs --method <file> --check
 *   node tools/ingestion/review-valuation.mjs --method <file> --retire --reviewers "..."
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

/** Mirrors canonicalMethodContent in @reis/analysis-engine; the two must agree byte for byte. */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function methodHash(pack) {
  const canonical = stableStringify({
    method_id: pack.method_id,
    version: pack.version,
    never_produces_th: [...pack.never_produces_th].sort(),
    methods: pack.methods,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

async function main() {
  const path = arg("method");
  if (!path) {
    console.error("--method <file> is required");
    process.exit(1);
  }
  const pack = JSON.parse(await readFile(path, "utf8"));
  const hash = methodHash(pack);

  if (flag("check")) {
    console.log(
      `${pack.method_id} v${pack.version}  ${pack.lifecycle_state}  methods=${pack.methods.length}`,
    );
    console.log(`content hash ${hash}`);
    if (!pack.review) {
      console.log("NOT REVIEWED: this method will not compute");
    } else if (pack.review.content_hash !== hash) {
      console.log(`REVIEW STALE: signed ${pack.review.content_hash}`);
      console.log("the formulas changed after review; this method will not compute");
    } else {
      console.log(`reviewed ${pack.review.reviewed_on} by ${pack.review.reviewers.join(", ")}`);
    }
    return;
  }

  const reviewers = (arg("reviewers") ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (reviewers.length === 0) {
    console.error(
      "--reviewers is required: a review record names the people who read the formulas",
    );
    process.exit(1);
  }

  if (flag("retire")) {
    pack.lifecycle_state = "RETIRED";
    await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
    console.log(`${pack.method_id} v${pack.version} RETIRED by ${reviewers.join(", ")}`);
    return;
  }

  const basis = arg("basis");
  if (!basis) {
    console.error("--basis is required: what the reviewers checked the formulas against");
    process.exit(1);
  }

  pack.lifecycle_state = "ACADEMIC_REVIEWED";
  pack.review = {
    reviewers,
    reviewed_on: new Date().toISOString().slice(0, 10),
    content_hash: hash,
    evidence_basis_th: basis,
    limitations_th: args("limitation"),
  };
  await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  console.log(`${pack.method_id} v${pack.version} ACADEMIC_REVIEWED by ${reviewers.join(", ")}`);
  console.log(`bound to content hash ${hash}`);
  console.log("This is an academic review record, not professional or legal certification.");
  console.log(
    "It permits the method to compute in this prototype. It is not a property appraisal.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
