import { describe, expect, it } from "vitest";
import {
  CONDOMINIUM_VALUATION_MEASURE_ID,
  areaCodeOf,
  parseCondominiumValuationCsv,
} from "./condominium-valuation.js";

/**
 * These pin the two things that would quietly corrupt a price: putting a building in the wrong
 * place, and turning a spread of floor prices into one number Treasury never published.
 */

const HEADER =
  "CONDO_ID,CONDO_NAME,BUILD_NAME,CHANGWAT_CODE,CHANGWAT_NAME,AMPHUR_CODE,AMPHUR_NAME," +
  "TUMBON_CODE,TUMBON_NAME,BRANCH_CODE,BRANCH_NAME,OFLEVEL,USE_CATG,VAL_AMT_P_MET";

function row(over: Partial<Record<string, string>> = {}): string {
  const f = {
    CONDO_ID: "34785",
    CONDO_NAME: "ลุมพินี พาร์ค",
    BUILD_NAME: "A",
    CHANGWAT_CODE: "10",
    CHANGWAT_NAME: "กรุงเทพมหานคร",
    AMPHUR_CODE: "1",
    AMPHUR_NAME: "พระนคร",
    TUMBON_CODE: "2",
    TUMBON_NAME: "วังบูรพาภิรมย์",
    BRANCH_CODE: "10000000",
    BRANCH_NAME: "สำนักงานที่ดินกรุงเทพมหานคร",
    OFLEVEL: "1",
    USE_CATG: "ห้องชุดพักอาศัย",
    VAL_AMT_P_MET: "172100",
    ...over,
  };
  return HEADER.split(",")
    .map((name) => f[name as keyof typeof f] ?? "")
    .join(",");
}

function parse(...rows: string[]) {
  return parseCondominiumValuationCsv([HEADER, ...rows].join("\n"));
}

describe("areaCodeOf", () => {
  it("pads the parts the source publishes unpadded", () => {
    // 10 / 1 / 2 is วังบูรพาภิรมย์, whose reference code is 100102 — not 1012.
    expect(areaCodeOf("10", "1", "2")).toEqual({ level: "SUBDISTRICT", code: 100102 });
  });

  it("places a row at district level rather than guessing a subdistrict", () => {
    expect(areaCodeOf("10", "2", "NULL")).toEqual({ level: "DISTRICT", code: 1002 });
  });

  it("refuses a row that does not even name its district", () => {
    expect(areaCodeOf("10", "NULL", "2")).toBeNull();
    expect(areaCodeOf("", "1", "2")).toBeNull();
  });

  it("does not accept a code that is not a number", () => {
    expect(areaCodeOf("10", "1", "ก")).toEqual({ level: "DISTRICT", code: 1001 });
    expect(areaCodeOf("กทม", "1", "2")).toBeNull();
  });
});

describe("parseCondominiumValuationCsv", () => {
  it("keeps one floor's price as a single figure, not a range", () => {
    const result = parse(row());
    expect(result.outcome).toBe("SUCCESS");
    const [observation] = result.observations ?? [];
    expect(observation?.value).toBe("172100");
    expect(observation?.value_low).toBeUndefined();
    expect(observation?.epistemic_status).toBe("OBSERVED");
  });

  it("reports several floors as the spread the source covers, never as an average", () => {
    const result = parse(
      row({ OFLEVEL: "1", VAL_AMT_P_MET: "172100" }),
      row({ OFLEVEL: "2", VAL_AMT_P_MET: "171600" }),
      row({ OFLEVEL: "3", VAL_AMT_P_MET: "171100" }),
    );
    const [observation] = result.observations ?? [];
    expect(observation?.value).toBeUndefined();
    expect(observation?.value_low).toBe("171100");
    expect(observation?.value_high).toBe("172100");
    // 171600 is the mean and the median; neither may appear as the figure.
    expect(observation?.population).toContain("3 ชั้น");
    expect(observation?.epistemic_status).toBe("DERIVED");
  });

  it("keeps a building's use categories apart", () => {
    const result = parse(
      row({ USE_CATG: "ห้องชุดพักอาศัย", VAL_AMT_P_MET: "172100" }),
      row({ USE_CATG: "ห้องชุดพาณิชยกรรม", VAL_AMT_P_MET: "169600" }),
    );
    expect(result.observations).toHaveLength(2);
  });

  it("keeps the same building in two areas apart", () => {
    const result = parse(row({ TUMBON_CODE: "2" }), row({ TUMBON_CODE: "9" }));
    expect(result.observations?.map((o) => o.geography_code)).toEqual([100102, 100109]);
  });

  it("carries the assessment caveat on every observation", () => {
    const result = parse(row(), row({ CONDO_ID: "2", CONDO_NAME: "ศุภาลัย" }));
    for (const observation of result.observations ?? []) {
      expect(observation.source_note).toContain("ไม่ใช่ราคาซื้อขายในตลาด");
    }
    expect(result.observations?.[0]?.measure_id).toBe(CONDOMINIUM_VALUATION_MEASURE_ID);
  });

  it("names the building, because a price with no building describes nothing", () => {
    const result = parse(row());
    expect(result.observations?.[0]?.population).toContain("ลุมพินี พาร์ค");
  });

  it("drops a row it cannot place instead of attaching it to a neighbour", () => {
    const result = parse(row(), row({ CONDO_ID: "9", AMPHUR_CODE: "NULL" }));
    expect(result.observations).toHaveLength(1);
  });

  it("drops an unnamed building without losing the rest of the country", () => {
    // 56 of the published file's rows name no building. Refusing the whole file over them would
    // trade 122,000 real prices for 56 unusable ones.
    const result = parse(row(), row({ CONDO_ID: "9", CONDO_NAME: "NULL" }));
    expect(result.outcome).toBe("SUCCESS");
    expect(result.observations).toHaveLength(1);
  });

  it("stops on column drift rather than reading the wrong field", () => {
    const shifted = "CONDO_ID,CONDO_NAME,VAL_AMT_P_MET\n1,ก,100";
    const result = parseCondominiumValuationCsv(shifted);
    expect(result.outcome).toBe("INVALID_RESPONSE");
  });

  it("stops on a price that is not a number", () => {
    expect(parse(row({ VAL_AMT_P_MET: "-" })).outcome).toBe("INVALID_RESPONSE");
  });

  it("reads a quoted field containing a comma without shifting the row", () => {
    // OFLEVEL genuinely holds values like "8,9,10 และ|ชั้นดาดฟ้า" in the published file.
    const line = row({ OFLEVEL: '"8,9,10"' });
    const result = parseCondominiumValuationCsv([HEADER, line].join("\n"));
    expect(result.outcome).toBe("SUCCESS");
    expect(result.observations?.[0]?.value).toBe("172100");
  });

  it("reports an empty file rather than pretending it parsed", () => {
    expect(parseCondominiumValuationCsv(HEADER).outcome).toBe("INVALID_RESPONSE");
  });
});
