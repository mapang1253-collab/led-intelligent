/**
 * DOPA registered population by province and subdistrict
 * (สถิติจำนวนประชากรแยกรายอายุ, กรมการปกครอง).
 *
 * The published file is pipe-delimited text with a structure that is easy to misread, so this
 * parser is written around two facts verified against all 77 provincial files on 2026-09-16:
 *
 *   * An `อำเภอ`/`เขต` row is **not** the district total. It is the district's non-municipal
 *     remainder. Municipalities (`เทศบาล*`, `เมืองพัทยา`) are separate sibling blocks. Reading an
 *     `อำเภอ` row as "the population of that district" understates it, often severely.
 *   * Each block is followed by its own `ตำบล`/`แขวง` rows, so one subdistrict can appear several
 *     times — once per local authority covering part of it. Its population is the sum of its rows,
 *     and those rows partition the province exactly.
 *
 * Both facts are re-checked arithmetically on every parse rather than trusted: if a block's children
 * stop summing to their header, or the subdistrict rows stop summing to the province, the structure
 * has changed and the parse is refused. A file we no longer understand must not become observations.
 *
 * The age columns are deliberately **not** parsed. Their layout is undocumented and the 216 body
 * columns do not reconcile with the male/female totals, so their meaning is unverified — and an
 * unverified field cannot pass the semantic gate (docs/implementation-plan.md §4).
 */

import type { AcquisitionOutcome } from "@reis/contracts";
import { type FetchJsonOptions, fetchText } from "../http.js";

export const DOPA_POPULATION_SOURCE_PRODUCT_ID = "dopa-registered-population";
export const DOPA_POPULATION_MEASURE_ID = "registered_population";

/** Operator-configured host. The path is built from a period and a province code, never from input. */
const DOPA_FILE_HOST = "https://stat.bora.dopa.go.th";

/** Rows that describe a subdistrict; everything else at that indent level is a local authority. */
const CHILD_PREFIXES = ["ตำบล", "แขวง"] as const;

export interface DopaAreaCounts {
  readonly name_th: string;
  readonly male: number;
  readonly female: number;
  readonly total: number;
}

export interface DopaSubdistrictCounts extends DopaAreaCounts {
  /** How many local-authority blocks contributed rows, so a sum is never mistaken for a single row. */
  readonly row_count: number;
}

export interface DopaPopulationParse {
  readonly province: DopaAreaCounts;
  readonly subdistricts: readonly DopaSubdistrictCounts[];
  readonly blocks_checked: number;
}

export type DopaPopulationResult =
  | { readonly outcome: "SUCCESS"; readonly parse: DopaPopulationParse }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS">;
      readonly reason: string;
      readonly retryable: boolean;
      readonly parse?: undefined;
    };

function invalid(reason: string): DopaPopulationResult {
  // Structure drift cannot be repaired by trying again; it needs an operator.
  return { outcome: "INVALID_RESPONSE", reason, retryable: false };
}

/**
 * Builds the file locator for one December snapshot.
 *
 * `periodCode` is the Buddhist-era two-digit year followed by the two-digit month, e.g. `6812` for
 * December พ.ศ. 2568 — confirmed by the site's own year index, which links to `6912` files that do
 * not exist yet because that December has not happened.
 */
export function dopaPopulationUrl(periodCode: string, provinceCode: number): string {
  if (!/^\d{4}$/.test(periodCode)) {
    throw new Error(`period code must be four digits (YYMM in B.E.), got "${periodCode}"`);
  }
  const code = String(provinceCode).padStart(2, "0");
  return `${DOPA_FILE_HOST}/new_stat/file/${periodCode}/${periodCode}cc${code}.txt`;
}

/** Collapses the runs of whitespace a few published names carry, without altering the name itself. */
function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isChildRow(name: string): boolean {
  return CHILD_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function stripChildPrefix(name: string): string {
  for (const prefix of CHILD_PREFIXES) {
    if (name.startsWith(prefix)) {
      return normalizeName(name.slice(prefix.length));
    }
  }
  return normalizeName(name);
}

interface ParsedRow {
  readonly name: string;
  readonly male: number;
  readonly female: number;
  readonly total: number;
}

/** The last three populated columns are male, female and their total; the rest are age columns. */
function parseRow(line: string): ParsedRow | null {
  const fields = line.split("|");
  const name = normalizeName(fields[0] ?? "");
  if (name === "") {
    return null;
  }
  const numbers: number[] = [];
  for (const field of fields.slice(1)) {
    const text = field.trim();
    if (text === "") {
      continue;
    }
    if (!/^-?\d+$/.test(text)) {
      return null;
    }
    numbers.push(Number(text));
  }
  if (numbers.length < 3) {
    return null;
  }
  const [male, female, total] = numbers.slice(-3) as [number, number, number];
  return { name, male, female, total };
}

export function parseDopaPopulationFile(text: string): DopaPopulationResult {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return invalid("DOPA file has no data rows");
  }

  const header = parseRow(lines[0] as string);
  if (!header) {
    return invalid("DOPA file has no readable province row");
  }
  if (header.male + header.female !== header.total) {
    return invalid(
      `province row does not reconcile: ${header.male} + ${header.female} <> ${header.total}`,
    );
  }

  const subdistricts = new Map<
    string,
    { male: number; female: number; total: number; rows: number }
  >();
  let blocksChecked = 0;
  let blockHeader: ParsedRow | null = null;
  let blockSum = 0;

  const closeBlock = (): string | null => {
    if (blockHeader === null) {
      return null;
    }
    blocksChecked += 1;
    if (blockSum !== blockHeader.total) {
      return `block "${blockHeader.name}" totals ${blockHeader.total} but its subdistrict rows sum to ${blockSum}`;
    }
    return null;
  };

  for (const line of lines.slice(1)) {
    const row = parseRow(line);
    if (!row) {
      return invalid(`unreadable row: ${line.slice(0, 60)}`);
    }
    if (isChildRow(row.name)) {
      if (blockHeader === null) {
        return invalid(`subdistrict row "${row.name}" appears before any local-authority row`);
      }
      blockSum += row.total;
      const key = stripChildPrefix(row.name);
      const existing = subdistricts.get(key);
      if (existing) {
        existing.male += row.male;
        existing.female += row.female;
        existing.total += row.total;
        existing.rows += 1;
      } else {
        subdistricts.set(key, { male: row.male, female: row.female, total: row.total, rows: 1 });
      }
      continue;
    }
    const failureReason = closeBlock();
    if (failureReason) {
      return invalid(failureReason);
    }
    blockHeader = row;
    blockSum = 0;
  }
  const finalFailure = closeBlock();
  if (finalFailure) {
    return invalid(finalFailure);
  }

  // The subdistrict rows must account for the whole province, or the sums below would silently
  // describe only part of it.
  const partition = [...subdistricts.values()].reduce((sum, entry) => sum + entry.total, 0);
  if (partition !== header.total) {
    return invalid(
      `subdistrict rows sum to ${partition} but the province row states ${header.total}`,
    );
  }

  return {
    outcome: "SUCCESS",
    parse: {
      province: {
        name_th: stripProvincePrefix(header.name),
        male: header.male,
        female: header.female,
        total: header.total,
      },
      subdistricts: [...subdistricts.entries()]
        .map(([name_th, entry]) => ({
          name_th,
          male: entry.male,
          female: entry.female,
          total: entry.total,
          row_count: entry.rows,
        }))
        .sort((a, b) => a.name_th.localeCompare(b.name_th, "th")),
      blocks_checked: blocksChecked,
    },
  };
}

/** Bangkok is published under its bare name; the other 76 carry a `จังหวัด` prefix. */
function stripProvincePrefix(name: string): string {
  return name.startsWith("จังหวัด") ? normalizeName(name.slice("จังหวัด".length)) : name;
}

export async function fetchDopaPopulation(
  periodCode: string,
  provinceCode: number,
  options: FetchJsonOptions = {},
): Promise<DopaPopulationResult> {
  const response = await fetchText(dopaPopulationUrl(periodCode, provinceCode), options);
  if (response.outcome !== "SUCCESS") {
    return { outcome: response.outcome, reason: response.reason, retryable: response.retryable };
  }
  return parseDopaPopulationFile(response.text);
}
