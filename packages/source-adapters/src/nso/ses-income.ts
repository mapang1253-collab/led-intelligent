import type { AcquisitionResult, Observation } from "@reis/contracts";

/**
 * NSO Socio-Economic Survey household income, table `SFD_SPB0802_66`.
 *
 * Semantics verified against the live table on 2026-09-15 (docs/data-architecture.md §8 step 3):
 * the table is broken down by socio-economic class and **contains no all-households total row**.
 * Averaging or summing the ten class figures would fabricate a provincial average the source never
 * published, so each class is emitted as its own Observation carrying the population it describes.
 * NSO annotates survey zeros in `attribute`; those are kept as observed values with the caveat
 * attached, never dropped and never silently treated as "no data".
 */

export const SOURCE_PRODUCT_ID = "nso-ses-SFD_SPB0802_66";
export const MEASURE_ID = "household_income_monthly_mean";

/** Marker NSO uses at every `source_income*` level for the grand-total-income rows. */
const GRAND_TOTAL = "รายได้ทั้งสิ้นต่อเดือน";

/** Thai Buddhist Era is 543 years ahead of the Common Era. */
const BE_CE_OFFSET = 543;

interface SesRow {
  year?: unknown;
  province?: unknown;
  source_income1?: unknown;
  source_income2?: unknown;
  source_income3?: unknown;
  soc_eco_class1?: unknown;
  soc_eco_class2?: unknown;
  value?: unknown;
  unit?: unknown;
  attribute?: unknown;
}

export interface SesIncomeTarget {
  readonly provinceNameTh: string;
  readonly provinceCode: number;
}

function isGrandTotalRow(row: SesRow): boolean {
  return (
    row.source_income1 === GRAND_TOTAL &&
    row.source_income2 === GRAND_TOTAL &&
    row.source_income3 === GRAND_TOTAL
  );
}

/** A malformed payload is never retryable — trying again cannot repair schema drift. */
function invalid(reason: string): AcquisitionResult {
  return { outcome: "INVALID_RESPONSE", reason, retryable: false };
}

/**
 * Parses a Buddhist-era year without JavaScript's lenient numeric coercion, which would otherwise
 * turn "", " " and null into 0 (and therefore into the CE year -543).
 */
function parseBuddhistEraYear(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{4}$/.test(text)) {
    return null;
  }
  const beYear = Number(text);
  const ceYear = beYear - BE_CE_OFFSET;
  // Guard against a plausible-looking but nonsensical vintage rather than emitting it as observed.
  return ceYear >= 1900 && ceYear <= 2200 ? ceYear : null;
}

/**
 * Pure parser: converts a raw NSO payload into Observations for one province. Network access and
 * retry/timeout classification live in the caller (see `fetchSesIncome`).
 */
export function parseSesIncomeRows(payload: unknown, target: SesIncomeTarget): AcquisitionResult {
  if (!Array.isArray(payload)) {
    return invalid("NSO payload was not an array of rows");
  }

  const provinceRows = (payload as SesRow[]).filter(
    (row) => row.province === target.provinceNameTh,
  );
  if (provinceRows.length === 0) {
    return {
      outcome: "NO_RECORD",
      reason: `NSO table has no rows for province "${target.provinceNameTh}"`,
      retryable: false,
    };
  }

  const totalRows = provinceRows.filter(isGrandTotalRow);
  if (totalRows.length === 0) {
    return {
      outcome: "NO_RECORD",
      reason: `NSO table has rows for "${target.provinceNameTh}" but no grand-total income rows`,
      retryable: false,
    };
  }

  const observations: Observation[] = [];
  for (const row of totalRows) {
    const ceYear = parseBuddhistEraYear(row.year);
    if (ceYear === null) {
      return invalid(`NSO row has an unusable Buddhist-era year: ${JSON.stringify(row.year)}`);
    }
    if (typeof row.unit !== "string" || row.unit.length === 0) {
      return invalid("NSO row is missing its unit; the measure's unit must never be assumed");
    }
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
      return invalid(`NSO row has a non-numeric value: ${String(row.value)}`);
    }
    const class1 = typeof row.soc_eco_class1 === "string" ? row.soc_eco_class1 : "";
    const class2 = typeof row.soc_eco_class2 === "string" ? row.soc_eco_class2 : "";
    if (class1 === "" || class2 === "") {
      return invalid("NSO row is missing the socio-economic class that defines its population");
    }

    observations.push({
      measure_id: MEASURE_ID,
      population: `${class1} / ${class2}`,
      value: String(row.value),
      unit: row.unit,
      geography_level: "PROVINCE",
      geography_code: target.provinceCode,
      period_start_year: ceYear,
      period_end_year: ceYear,
      epistemic_status: "OBSERVED",
      source_product_id: SOURCE_PRODUCT_ID,
      source_note:
        typeof row.attribute === "string" && row.attribute.length > 0 ? row.attribute : null,
    });
  }

  return { outcome: "SUCCESS", observations };
}
