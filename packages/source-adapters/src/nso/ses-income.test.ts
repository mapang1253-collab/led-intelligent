import { nsoSesIncomeSample } from "@reis/test-fixtures";
import { describe, expect, it } from "vitest";
import { parseSesIncomeRows } from "./ses-income.js";

const CHON_BURI_CODE = 20;
const BANGKOK_CODE = 10;

describe("parseSesIncomeRows", () => {
  it("returns NO_RECORD when the province has no rows in the table", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "เชียงใหม่",
      provinceCode: 50,
    });

    expect(result.outcome).toBe("NO_RECORD");
    expect(result.observations).toBeUndefined();
  });

  it("keeps only grand-total income rows, discarding component breakdowns", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "ชลบุรี",
      provinceCode: CHON_BURI_CODE,
    });

    expect(result.outcome).toBe("SUCCESS");
    // The fixture holds 20 Chon Buri grand-total rows (10 classes x 2 years) plus 3 breakdown rows.
    expect(result.observations).toHaveLength(20);
  });

  it("emits one observation per socio-economic class instead of inventing a provincial average", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "ชลบุรี",
      provinceCode: CHON_BURI_CODE,
    });

    const populations = new Set(result.observations?.map((o) => o.population));
    expect(populations.size).toBe(10);
    // No row may claim to describe all households.
    for (const population of populations) {
      expect(population).not.toBe("");
    }
  });

  it("converts the source's Buddhist-era year to CE", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "ชลบุรี",
      provinceCode: CHON_BURI_CODE,
    });

    const years = [...new Set(result.observations?.map((o) => o.period_start_year))].sort();
    // Fixture years are 2566 and 2568 BE.
    expect(years).toEqual([2023, 2025]);
    for (const o of result.observations ?? []) {
      expect(o.period_end_year).toBe(o.period_start_year);
    }
  });

  it("carries value as a decimal string with the source's unit and province code", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "กรุงเทพมหานคร",
      provinceCode: BANGKOK_CODE,
    });

    const observation = result.observations?.[0];
    expect(observation).toBeDefined();
    expect(typeof observation?.value).toBe("string");
    expect(observation?.unit).toBe("บาท");
    expect(observation?.geography_level).toBe("PROVINCE");
    expect(observation?.geography_code).toBe(BANGKOK_CODE);
    expect(observation?.epistemic_status).toBe("OBSERVED");
    expect(observation?.measure_id).toBe("household_income_monthly_mean");
  });

  it("preserves the source's sample-zero caveat rather than dropping or trusting the 0", () => {
    const result = parseSesIncomeRows(nsoSesIncomeSample, {
      provinceNameTh: "กรุงเทพมหานคร",
      provinceCode: BANGKOK_CODE,
    });

    // Bangkok's agricultural classes are survey zeros, annotated by NSO.
    const zeros = result.observations?.filter((o) => o.value === "0") ?? [];
    expect(zeros.length).toBeGreaterThan(0);
    for (const zero of zeros) {
      expect(zero.source_note).not.toBeNull();
      expect(zero.epistemic_status).toBe("OBSERVED");
    }
  });

  it.each([
    ["empty string", ""],
    ["whitespace", " "],
    ["null", null],
    ["out-of-range", "0002"],
  ])("rejects a %s year instead of coercing it to the CE year -543", (_label, year) => {
    const rows = [{ ...nsoSesIncomeSample[0], year }];

    const result = parseSesIncomeRows(rows, {
      provinceNameTh: String(nsoSesIncomeSample[0]?.province),
      provinceCode: BANGKOK_CODE,
    });

    expect(result.outcome).toBe("INVALID_RESPONSE");
    expect(result.observations).toBeUndefined();
  });

  it("rejects a payload that is not an array of rows", () => {
    const result = parseSesIncomeRows(
      { unexpected: true },
      {
        provinceNameTh: "ชลบุรี",
        provinceCode: CHON_BURI_CODE,
      },
    );

    expect(result.outcome).toBe("INVALID_RESPONSE");
  });

  it("rejects rows whose unit is missing rather than assuming baht", () => {
    const withoutUnit = [{ ...nsoSesIncomeSample[0], unit: undefined }];

    const result = parseSesIncomeRows(withoutUnit, {
      provinceNameTh: String(nsoSesIncomeSample[0]?.province),
      provinceCode: BANGKOK_CODE,
    });

    expect(result.outcome).toBe("INVALID_RESPONSE");
  });
});
