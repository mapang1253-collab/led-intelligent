import type { AcquisitionOutcome, Observation } from "@reis/contracts";
import { type FetchJsonOptions, fetchText } from "../http.js";
import { splitCsvLine } from "./building-valuation.js";
import { areaCodeOf } from "./condominium-valuation.js";

/**
 * Treasury assessed land values for land held on documents other than a title deed
 * (ราคาประเมินทุนทรัพย์ที่ดินประเภทอื่น, กรมธนารักษ์).
 *
 * The Treasury's per-parcel land files are 1.44GB across 77 provinces and carry no administrative
 * names, so they cannot answer "what is land worth here". This one can: 31,999 rows, 76 provinces,
 * priced by ที่ดินหน่วย — the position a plot occupies, such as fronting a highway or lying behind
 * the plots that do — with the province, district and subdistrict codes to place each row.
 *
 * Its scope is the thing to keep hold of. It prices land held on น.ส.3, ส.ค.1 and similar documents,
 * **not** land held on a โฉนด. Urban land is overwhelmingly titled, which is why ต.บางปลาสร้อย has
 * no row here at all. A reader holding a title deed is not looking at their own land's price.
 *
 * Unit: บาทต่อตารางวา. The publisher's metadata states no unit, so this was established from the
 * Treasury's own summary of ราคาประเมินที่ดินรายหน่วยที่ดิน, whose price column is headed
 * "ราคาประเมิน (บาท / ตารางวา)" throughout and which prices rural Surat Thani roads at 300–1,000 —
 * the same band as this file's Surat Thani rows (median 500). Per rai would put them 300× below the
 * department's own published figures for the same kind of land.
 */

export const LAND_VALUATION_SOURCE_PRODUCT_ID = "treasury-other-land-valuation";
export const LAND_VALUATION_MEASURE_ID = "assessed_land_value_per_sqwa";

/** Operator-configured locator; the resource id is part of the published dataset, not user input. */
export const LAND_VALUATION_URL =
  "https://catalog.treasury.go.th/dataset/101b9904-93b5-4fd4-ac73-569130b7165a/resource/" +
  "3fd86e09-61b6-4b21-a4cf-c4accb69f959/download/attach_all_20240805.csv";

/** The publication date in the resource's own file name, kept as the vintage. */
const PUBLISHED_CE_YEAR = 2024;

const SOURCE_NOTE =
  "ราคาประเมินสำหรับที่ดินที่มีเอกสารสิทธิประเภทอื่นนอกเหนือจากโฉนดที่ดินและ น.ส.3 ก. " +
  "ไม่ใช่ราคาของที่ดินมีโฉนด และไม่ใช่ราคาซื้อขายในตลาด";

export type LandValuationResult =
  | { readonly outcome: "SUCCESS"; readonly observations: readonly Observation[] }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS">;
      readonly reason: string;
      readonly retryable: boolean;
      readonly observations?: undefined;
    };

function invalid(reason: string): LandValuationResult {
  return { outcome: "INVALID_RESPONSE", reason, retryable: false };
}

const REQUIRED_COLUMNS = [
  "CHANGWAT_CODE",
  "AMPHUR_CODE",
  "TUMBON_CODE",
  "STREET_NAME",
  "EVAPRICE",
] as const;

interface Bucket {
  readonly landUnit: string;
  readonly level: "SUBDISTRICT" | "DISTRICT";
  readonly code: number;
  low: number;
  high: number;
  blocks: number;
}

/**
 * Parses the published CSV. Unlike the condominium file this one is UTF-8, with a byte-order mark.
 *
 * A land unit can appear twice for the same area with different prices — the department prices
 * separate blocks that the flattened export gives no column to tell apart. Nineteen keys are like
 * this. Picking one price would be a coin toss presented as a fact, and averaging them would publish
 * a figure nobody set, so both ends are kept and the count of blocks travels with the cohort.
 */
export function parseLandValuationCsv(csv: string): LandValuationResult {
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return invalid("Treasury land CSV has no data rows");
  }

  const header = splitCsvLine(lines[0] as string);
  const index = new Map(header.map((name, position) => [name, position]));
  for (const column of REQUIRED_COLUMNS) {
    if (!index.has(column)) {
      return invalid(`Treasury land CSV is missing the column ${column}`);
    }
  }
  const at = (fields: readonly string[], column: (typeof REQUIRED_COLUMNS)[number]) =>
    fields[index.get(column) as number] ?? "";

  const buckets = new Map<string, Bucket>();
  let unplaced = 0;

  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const price = at(fields, "EVAPRICE");
    const landUnit = at(fields, "STREET_NAME").trim();

    if (!/^\d+(\.\d+)?$/.test(price)) {
      return invalid(`Treasury land row has a non-numeric price: ${JSON.stringify(price)}`);
    }
    if (landUnit === "") {
      // The land unit is the cohort: without it the price describes no particular land.
      unplaced += 1;
      continue;
    }

    const area = areaCodeOf(
      at(fields, "CHANGWAT_CODE"),
      at(fields, "AMPHUR_CODE"),
      at(fields, "TUMBON_CODE"),
    );
    if (!area) {
      unplaced += 1;
      continue;
    }

    const value = Number(price);
    const key = `${area.level}|${area.code}|${landUnit}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.low = Math.min(existing.low, value);
      existing.high = Math.max(existing.high, value);
      existing.blocks += 1;
      continue;
    }
    buckets.set(key, {
      landUnit,
      level: area.level,
      code: area.code,
      low: value,
      high: value,
      blocks: 1,
    });
  }

  const observations: Observation[] = [];
  for (const bucket of buckets.values()) {
    // Only a genuine spread is announced as one. Two blocks that happen to carry the same price are
    // one figure, and saying "2 บล็อก" over a single number would invent a disagreement.
    const spread = bucket.low !== bucket.high;
    observations.push({
      measure_id: LAND_VALUATION_MEASURE_ID,
      population: spread ? `${bucket.landUnit} (${bucket.blocks} บล็อก)` : bucket.landUnit,
      ...(spread
        ? { value_low: String(bucket.low), value_high: String(bucket.high) }
        : { value: String(bucket.low) }),
      unit: "บาทต่อตารางวา",
      geography_level: bucket.level,
      geography_code: bucket.code,
      period_start_year: PUBLISHED_CE_YEAR,
      period_end_year: PUBLISHED_CE_YEAR,
      epistemic_status: spread ? "DERIVED" : "OBSERVED",
      source_product_id: LAND_VALUATION_SOURCE_PRODUCT_ID,
      source_note: SOURCE_NOTE,
    });
  }

  if (observations.length === 0) {
    return {
      outcome: "NO_RECORD",
      reason: "Treasury land CSV contained no placeable rows",
      retryable: false,
    };
  }
  if (unplaced > 0) {
    console.warn(`treasury land: ${unplaced} row(s) had no usable area code or no land unit`);
  }
  return { outcome: "SUCCESS", observations };
}

export async function fetchLandValuation(
  options: FetchJsonOptions = {},
): Promise<LandValuationResult> {
  const response = await fetchText(LAND_VALUATION_URL, options);
  if (response.outcome !== "SUCCESS") {
    return { outcome: response.outcome, reason: response.reason, retryable: response.retryable };
  }
  return parseLandValuationCsv(response.text);
}
