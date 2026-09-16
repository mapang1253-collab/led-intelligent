import { describe, expect, it } from "vitest";
import { parseBuildingValuationCsv, splitCsvLine } from "./building-valuation.js";

/**
 * The quoted-comma case is the one that matters. 154 published rows name a building type like
 * `ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร`; splitting naively shifts every later column, so the
 * province code ends up holding part of a building name and the price ends up somewhere else.
 */

const HEADER = "ID_CONSTR,NAME_CONSTR,CHANGWAT_CODE,CHANGWAT_NAME,PRICE_CONSTR";

describe("splitCsvLine", () => {
  it("keeps a quoted comma inside its field", () => {
    expect(splitCsvLine('514,"ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร",11,สมุทรปราการ,3700')).toEqual([
      "514",
      "ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร",
      "11",
      "สมุทรปราการ",
      "3700",
    ]);
  });

  it("handles an escaped quote inside a quoted field", () => {
    expect(splitCsvLine('1,"a ""b"" c",2')).toEqual(["1", 'a "b" c', "2"]);
  });

  it("leaves an unquoted line alone", () => {
    expect(splitCsvLine("105,บ้านพักอาศัยตึกสองชั้น,90,สงขลา,8350")).toEqual([
      "105",
      "บ้านพักอาศัยตึกสองชั้น",
      "90",
      "สงขลา",
      "8350",
    ]);
  });
});

describe("parseBuildingValuationCsv", () => {
  it("reads a plain row into an observation carrying its building type", () => {
    const result = parseBuildingValuationCsv(`${HEADER}\n105,บ้านพักอาศัยตึกสองชั้น,90,สงขลา,8350`);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);

    const [observation] = result.observations;
    expect(observation?.value).toBe("8350");
    expect(observation?.unit).toBe("บาทต่อตารางเมตร");
    expect(observation?.geography_code).toBe(90);
    // The price is meaningless without what it prices.
    expect(observation?.population).toBe("105 บ้านพักอาศัยตึกสองชั้น");
    // The caveat travels with every figure, because a baht-per-square-metre number invites
    // exactly the reading it cannot support.
    expect(observation?.source_note).toContain("ไม่ใช่ราคาตลาด");
    expect(observation?.source_note).toContain("ไม่ใช่ต้นทุนก่อสร้างจริง");
  });

  it("does not let a quoted comma shift the columns", () => {
    const result = parseBuildingValuationCsv(
      `${HEADER}\n514,"ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร",11,สมุทรปราการ,3700`,
    );
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);

    const [observation] = result.observations;
    expect(observation?.geography_code).toBe(11);
    expect(observation?.value).toBe("3700");
  });

  it("refuses a file whose columns have drifted rather than reading them positionally", () => {
    const result = parseBuildingValuationCsv("A,B,C\n1,2,3");
    expect(result.outcome).toBe("INVALID_RESPONSE");
    expect(result.outcome !== "SUCCESS" && result.reason).toContain("missing the column");
    expect(result.outcome !== "SUCCESS" && result.retryable).toBe(false);
  });

  it("refuses an unusable province code or price rather than guessing", () => {
    expect(parseBuildingValuationCsv(`${HEADER}\n105,บ้าน,ชลบุรี,ชลบุรี,8350`).outcome).toBe(
      "INVALID_RESPONSE",
    );
    expect(parseBuildingValuationCsv(`${HEADER}\n105,บ้าน,20,ชลบุรี,ไม่ระบุ`).outcome).toBe(
      "INVALID_RESPONSE",
    );
  });

  it("refuses a row with no building type, since the price would describe nothing", () => {
    expect(parseBuildingValuationCsv(`${HEADER}\n105,,20,ชลบุรี,8350`).outcome).toBe(
      "INVALID_RESPONSE",
    );
  });

  it("reports an empty file as no record, not as a parse failure", () => {
    expect(parseBuildingValuationCsv(HEADER).outcome).toBe("INVALID_RESPONSE");
  });
});
