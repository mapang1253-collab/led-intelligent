import { describe, expect, it } from "vitest";
import { LAND_VALUATION_MEASURE_ID, parseLandValuationCsv } from "./land-valuation.js";

/**
 * The risk here is not parsing — it is scope. This file prices land that is NOT on a title deed,
 * and a reader holding a โฉนด must not be handed it as their land's value. The caveat is therefore
 * asserted on every observation, and the spread that appears when the department priced two blocks
 * under one name is kept rather than resolved by guesswork.
 */

const HEADER =
  "CHANGWAT_CODE,CHANGWAT_NAME,AMPHUR_CODE,AMPHUR_NAME,TUMBON_CODE,TUMBON_NAME,STREET_NAME,EVAPRICE";

function row(over: Partial<Record<string, string>> = {}): string {
  const f = {
    CHANGWAT_CODE: "11",
    CHANGWAT_NAME: "สมุทรปราการ",
    AMPHUR_CODE: "1",
    AMPHUR_NAME: "เมืองสมุทรปราการ",
    TUMBON_CODE: "11",
    TUMBON_NAME: "บางโปรง",
    STREET_NAME: "ที่ดินติดถนน ซอย ทาง",
    EVAPRICE: "6000",
    ...over,
  };
  return HEADER.split(",")
    .map((n) => f[n as keyof typeof f] ?? "")
    .join(",");
}

const parse = (...rows: string[]) => parseLandValuationCsv([HEADER, ...rows].join("\n"));

describe("parseLandValuationCsv", () => {
  it("reads a single published price as one figure in baht per square wa", () => {
    const result = parse(row());
    const [o] = result.observations ?? [];
    expect(o?.value).toBe("6000");
    expect(o?.unit).toBe("บาทต่อตารางวา");
    expect(o?.measure_id).toBe(LAND_VALUATION_MEASURE_ID);
    expect(o?.epistemic_status).toBe("OBSERVED");
  });

  it("places the row by its padded administrative code", () => {
    // 11 / 1 / 11 is ต.บางโปรง, whose reference code is 110111 — not 11111.
    expect(parse(row()).observations?.[0]?.geography_code).toBe(110111);
  });

  it("keeps both ends when one land unit was priced twice in one area", () => {
    // The department prices separate blocks; the flattened export gives no column to tell them
    // apart. 500 and 2,000 are both real, and 1,250 is not.
    const result = parse(row({ EVAPRICE: "500" }), row({ EVAPRICE: "2000" }));
    expect(result.observations).toHaveLength(1);
    const [o] = result.observations ?? [];
    expect(o?.value).toBeUndefined();
    expect(o?.value_low).toBe("500");
    expect(o?.value_high).toBe("2000");
    expect(o?.population).toContain("2 บล็อก");
    expect(o?.epistemic_status).toBe("DERIVED");
  });

  it("does not announce a spread when the two blocks agree", () => {
    const result = parse(row({ EVAPRICE: "5000" }), row({ EVAPRICE: "5000" }));
    const [o] = result.observations ?? [];
    expect(o?.value).toBe("5000");
    expect(o?.population).not.toContain("บล็อก");
  });

  it("keeps different land units apart", () => {
    const result = parse(
      row({ STREET_NAME: "ที่ดินติดทางหลวงแผ่นดิน", EVAPRICE: "80000" }),
      row({ STREET_NAME: "ที่ดินนอกเหนือจากหน่วยที่ 1", EVAPRICE: "2500" }),
    );
    expect(result.observations).toHaveLength(2);
  });

  it("says on every figure that this is not title-deed land", () => {
    for (const o of parse(row(), row({ TUMBON_CODE: "13" })).observations ?? []) {
      expect(o.source_note).toContain("นอกเหนือจากโฉนดที่ดิน");
      expect(o.source_note).toContain("ไม่ใช่ราคาซื้อขายในตลาด");
    }
  });

  it("drops a row it cannot place rather than attaching it to a neighbour", () => {
    const result = parse(row(), row({ AMPHUR_CODE: "NULL", TUMBON_CODE: "NULL" }));
    expect(result.observations).toHaveLength(1);
  });

  it("stops on column drift and on a price that is not a number", () => {
    expect(parseLandValuationCsv("CHANGWAT_CODE,EVAPRICE\n11,600").outcome).toBe(
      "INVALID_RESPONSE",
    );
    expect(parse(row({ EVAPRICE: "-" })).outcome).toBe("INVALID_RESPONSE");
  });

  it("reads the file's byte-order mark without losing the first column", () => {
    const result = parseLandValuationCsv(`﻿${HEADER}\n${row()}`);
    expect(result.outcome).toBe("SUCCESS");
    expect(result.observations?.[0]?.geography_code).toBe(110111);
  });
});
