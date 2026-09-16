import type { AcquisitionOutcome, Observation } from "@reis/contracts";
import { type FetchJsonOptions, fetchBytes } from "../http.js";
import { splitCsvLine } from "./building-valuation.js";

/**
 * Treasury assessed condominium values (ราคาประเมินอาคารชุด, กรมธนารักษ์).
 *
 * This is the only free, lawful Thai source that names individual real properties and states what
 * they are worth. Every other product in this repo describes an area; this one describes 7,906
 * buildings people can walk past, each carrying the administrative codes of the place it stands in,
 * so a reader who picked a subdistrict can be shown the condominiums actually in it.
 *
 * It is still an assessed value, set to levy tax under พ.ร.บ.ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562.
 * It is not a market price and is routinely well below one. A figure attached to a building's real
 * name invites that misreading far more strongly than a figure attached to a province, which is why
 * the caveat rides on every observation rather than on the screen around them.
 *
 * Verified against the live file on 2026-09-17: 122,112 rows, 51 provinces, 626 subdistrict code
 * triples, no blank prices. The file is encoded in TIS-620, not UTF-8.
 */

export const CONDOMINIUM_VALUATION_SOURCE_PRODUCT_ID = "treasury-condominium-valuation";
export const CONDOMINIUM_VALUATION_MEASURE_ID = "assessed_condominium_value_per_sqm";

/** Operator-configured locator; the resource id is part of the published dataset, not user input. */
export const CONDOMINIUM_VALUATION_URL =
  "https://catalog.treasury.go.th/dataset/74a5e3a4-ebaa-4602-aac8-5b93c8647730/resource/" +
  "b115b105-58c6-4c3d-8ca8-687f7501e296/download/condo_all_20240805.csv";

/** The publication date in the resource's own file name, kept as the vintage. */
const PUBLISHED_CE_YEAR = 2024;

const SOURCE_NOTE = "ราคาประเมินเพื่อการจัดเก็บภาษี ไม่ใช่ราคาซื้อขายในตลาด และมักต่ำกว่าราคาตลาด";

export type CondominiumValuationResult =
  | { readonly outcome: "SUCCESS"; readonly observations: readonly Observation[] }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS">;
      readonly reason: string;
      readonly retryable: boolean;
      readonly observations?: undefined;
    };

function invalid(reason: string): CondominiumValuationResult {
  return { outcome: "INVALID_RESPONSE", reason, retryable: false };
}

const REQUIRED_COLUMNS = [
  "CONDO_ID",
  "CONDO_NAME",
  "CHANGWAT_CODE",
  "AMPHUR_CODE",
  "TUMBON_CODE",
  "OFLEVEL",
  "USE_CATG",
  "VAL_AMT_P_MET",
] as const;

/** The source writes an absent code as the four letters NULL rather than leaving the field empty. */
function absent(field: string): boolean {
  const text = field.trim();
  return text === "" || text.toUpperCase() === "NULL";
}

/**
 * Thai administrative codes are published here in three separate columns, unpadded — Bangkok's
 * วังบูรพาภิรมย์ arrives as 10 / 1 / 2 and must be read as 100102 to meet the reference table. A
 * subdistrict code is only returned when all three parts are present; a row that names its district
 * but not its subdistrict is placed at district level rather than guessed into one of its children.
 */
export function areaCodeOf(
  provinceCode: string,
  districtCode: string,
  subdistrictCode: string,
): { level: "SUBDISTRICT" | "DISTRICT"; code: number } | null {
  if (absent(provinceCode) || absent(districtCode)) {
    return null;
  }
  if (!/^\d{1,2}$/.test(provinceCode.trim()) || !/^\d{1,2}$/.test(districtCode.trim())) {
    return null;
  }
  const province = provinceCode.trim().padStart(2, "0");
  const district = districtCode.trim().padStart(2, "0");
  if (absent(subdistrictCode) || !/^\d{1,2}$/.test(subdistrictCode.trim())) {
    return { level: "DISTRICT", code: Number(`${province}${district}`) };
  }
  const subdistrict = subdistrictCode.trim().padStart(2, "0");
  return { level: "SUBDISTRICT", code: Number(`${province}${district}${subdistrict}`) };
}

interface Bucket {
  readonly condoName: string;
  readonly useCategory: string;
  readonly level: "SUBDISTRICT" | "DISTRICT";
  readonly code: number;
  low: number;
  high: number;
  floors: number;
}

/**
 * The source prices each floor of each use category separately, so a single condominium produces
 * dozens of rows that differ only in storey and a few hundred baht. Reporting each one would bury
 * the reader; reporting their average would publish a figure Treasury never set. The floors are
 * therefore collapsed into the spread the source actually covers, and the count of floors behind it
 * travels with the cohort so the summary can be checked against the file.
 */
export function parseCondominiumValuationCsv(csv: string): CondominiumValuationResult {
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return invalid("Treasury condominium CSV has no data rows");
  }

  const header = splitCsvLine(lines[0] as string);
  const index = new Map(header.map((name, position) => [name, position]));
  for (const column of REQUIRED_COLUMNS) {
    if (!index.has(column)) {
      // Column drift must stop the ingest, not quietly shift every value one place left.
      return invalid(`Treasury condominium CSV is missing the column ${column}`);
    }
  }
  const at = (fields: readonly string[], column: (typeof REQUIRED_COLUMNS)[number]) =>
    fields[index.get(column) as number] ?? "";

  const buckets = new Map<string, Bucket>();
  let unplaced = 0;

  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const price = at(fields, "VAL_AMT_P_MET");
    const condoName = at(fields, "CONDO_NAME");
    const condoId = at(fields, "CONDO_ID");
    const useCategory = at(fields, "USE_CATG");

    if (!/^\d+(\.\d+)?$/.test(price)) {
      // A price column that stops holding prices is schema drift, and reading on would attach real
      // figures to the wrong buildings. That is worth stopping the whole ingest for.
      return invalid(`Treasury condominium row has a non-numeric price: ${JSON.stringify(price)}`);
    }
    if (absent(condoName) || absent(useCategory)) {
      // The building and what is being priced in it are the cohort; without either, the number
      // describes nothing a reader could check. 56 of the file's 122,112 rows are like this, so
      // they are dropped and counted — one unnamed building must not cost the country its prices.
      unplaced += 1;
      continue;
    }

    const area = areaCodeOf(
      at(fields, "CHANGWAT_CODE"),
      at(fields, "AMPHUR_CODE"),
      at(fields, "TUMBON_CODE"),
    );
    if (!area) {
      // Recorded, never attached to a neighbouring area to make the count look complete.
      unplaced += 1;
      continue;
    }

    const value = Number(price);
    const key = `${area.level}|${area.code}|${condoId}|${useCategory}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.low = Math.min(existing.low, value);
      existing.high = Math.max(existing.high, value);
      existing.floors += 1;
      continue;
    }
    buckets.set(key, {
      condoName: condoName.trim(),
      useCategory: useCategory.trim(),
      level: area.level,
      code: area.code,
      low: value,
      high: value,
      floors: 1,
    });
  }

  const observations: Observation[] = [];
  for (const bucket of buckets.values()) {
    const cohort =
      bucket.floors === 1
        ? `${bucket.condoName} · ${bucket.useCategory}`
        : `${bucket.condoName} · ${bucket.useCategory} (${bucket.floors} ชั้น)`;
    const figure =
      bucket.low === bucket.high
        ? { value: String(bucket.low) }
        : { value_low: String(bucket.low), value_high: String(bucket.high) };
    observations.push({
      measure_id: CONDOMINIUM_VALUATION_MEASURE_ID,
      population: cohort,
      ...figure,
      unit: "บาทต่อตารางเมตร",
      geography_level: bucket.level,
      geography_code: bucket.code,
      period_start_year: PUBLISHED_CE_YEAR,
      period_end_year: PUBLISHED_CE_YEAR,
      // The spread is read off rows the source published; it is a summary of them, not a new
      // measurement, and the status says so rather than borrowing the rows' OBSERVED.
      epistemic_status: bucket.floors === 1 ? "OBSERVED" : "DERIVED",
      source_product_id: CONDOMINIUM_VALUATION_SOURCE_PRODUCT_ID,
      source_note: SOURCE_NOTE,
    });
  }

  if (observations.length === 0) {
    return {
      outcome: "NO_RECORD",
      reason: "Treasury condominium CSV contained no placeable rows",
      retryable: false,
    };
  }
  if (unplaced > 0) {
    console.warn(`treasury condominium: ${unplaced} row(s) had no usable area code or no building`);
  }
  return { outcome: "SUCCESS", observations };
}

/**
 * The file is TIS-620, which Thai government CSV exports still use. Decoding it as UTF-8 turns every
 * building name into replacement characters, so the bytes are fetched and decoded explicitly rather
 * than handed to a text reader that would assume UTF-8.
 */
export async function fetchCondominiumValuation(
  options: FetchJsonOptions = {},
): Promise<CondominiumValuationResult> {
  const response = await fetchBytes(CONDOMINIUM_VALUATION_URL, options);
  if (response.outcome !== "SUCCESS") {
    return { outcome: response.outcome, reason: response.reason, retryable: response.retryable };
  }
  return parseCondominiumValuationCsv(new TextDecoder("windows-874").decode(response.bytes));
}
