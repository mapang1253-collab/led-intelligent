import type { AcquisitionOutcome, Observation } from "@reis/contracts";
import { type FetchJsonOptions, fetchText } from "../http.js";

/**
 * Treasury assessed construction values (ราคาประเมินสิ่งปลูกสร้าง, กรมธนารักษ์).
 *
 * One published price per building type per province, in baht per square metre, used by the state
 * to assess tax under พ.ร.บ.ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562.
 *
 * The single most important thing about this source is what it is not. An assessed value is set for
 * taxation; it is neither the market price of a building nor what one costs to build, and it is
 * routinely well below both. Every observation carries that caveat, and the product's
 * `must_not_become_th` repeats it, because a number in baht per square metre invites exactly the
 * reading it cannot support.
 */

export const BUILDING_VALUATION_SOURCE_PRODUCT_ID = "treasury-building-valuation";
export const BUILDING_VALUATION_MEASURE_ID = "assessed_construction_value_per_sqm";

/** Operator-configured locator; the resource id is part of the published dataset, not user input. */
export const BUILDING_VALUATION_URL =
  "https://catalog.treasury.go.th/dataset/83038253-61e8-431e-947b-6931cc689c3a/resource/" +
  "cf687667-5386-4813-8062-429fb0cd4acf/download/construct_all_20240805.csv";

export type BuildingValuationResult =
  | { readonly outcome: "SUCCESS"; readonly observations: readonly Observation[] }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS">;
      readonly reason: string;
      readonly retryable: boolean;
      readonly observations?: undefined;
    };

function invalid(reason: string): BuildingValuationResult {
  return { outcome: "INVALID_RESPONSE", reason, retryable: false };
}

/**
 * Splits one CSV line, honouring quoted fields.
 *
 * Needed, not fussiness: 154 rows name building types like `ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร`,
 * whose embedded comma silently shifts every later column when split naively — the province code
 * ends up holding part of a building name.
 */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

const REQUIRED_COLUMNS = [
  "ID_CONSTR",
  "NAME_CONSTR",
  "CHANGWAT_CODE",
  "CHANGWAT_NAME",
  "PRICE_CONSTR",
] as const;

/** The publication year in the resource's own file name, kept as the vintage. */
const PUBLISHED_CE_YEAR = 2024;

export function parseBuildingValuationCsv(csv: string): BuildingValuationResult {
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return invalid("Treasury CSV has no data rows");
  }

  const header = splitCsvLine(lines[0] as string);
  const index = new Map(header.map((name, position) => [name, position]));
  for (const column of REQUIRED_COLUMNS) {
    if (!index.has(column)) {
      // Column drift must stop the ingest, not quietly shift every value one place left.
      return invalid(`Treasury CSV is missing the column ${column}`);
    }
  }

  const at = (fields: readonly string[], column: (typeof REQUIRED_COLUMNS)[number]) =>
    fields[index.get(column) as number] ?? "";

  const observations: Observation[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const provinceCode = at(fields, "CHANGWAT_CODE");
    const price = at(fields, "PRICE_CONSTR");
    const typeName = at(fields, "NAME_CONSTR");
    const typeId = at(fields, "ID_CONSTR");

    if (!/^\d{1,2}$/.test(provinceCode)) {
      return invalid(`Treasury row has an unusable province code: ${JSON.stringify(provinceCode)}`);
    }
    if (!/^\d+(\.\d+)?$/.test(price)) {
      return invalid(`Treasury row has a non-numeric price: ${JSON.stringify(price)}`);
    }
    if (typeName === "" || typeId === "") {
      return invalid("Treasury row is missing the building type that defines its population");
    }

    observations.push({
      measure_id: BUILDING_VALUATION_MEASURE_ID,
      // The building type is the cohort: a price means nothing without knowing what it prices.
      population: `${typeId} ${typeName}`,
      value: price,
      unit: "บาทต่อตารางเมตร",
      geography_level: "PROVINCE",
      geography_code: Number(provinceCode),
      period_start_year: PUBLISHED_CE_YEAR,
      period_end_year: PUBLISHED_CE_YEAR,
      epistemic_status: "OBSERVED",
      source_product_id: BUILDING_VALUATION_SOURCE_PRODUCT_ID,
      source_note: "ราคาประเมินเพื่อการจัดเก็บภาษี ไม่ใช่ราคาตลาดและไม่ใช่ต้นทุนก่อสร้างจริง",
    });
  }

  if (observations.length === 0) {
    return { outcome: "NO_RECORD", reason: "Treasury CSV contained no rows", retryable: false };
  }
  return { outcome: "SUCCESS", observations };
}

export async function fetchBuildingValuation(
  options: FetchJsonOptions = {},
): Promise<BuildingValuationResult> {
  const response = await fetchText(BUILDING_VALUATION_URL, options);
  if (response.outcome !== "SUCCESS") {
    return { outcome: response.outcome, reason: response.reason, retryable: response.retryable };
  }
  return parseBuildingValuationCsv(response.text);
}
