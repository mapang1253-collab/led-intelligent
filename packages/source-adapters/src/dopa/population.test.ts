import { describe, expect, it } from "vitest";
import { dopaPopulationUrl, parseDopaPopulationFile } from "./population.js";

/**
 * Fixtures mirror the published shape: an อำเภอ block holding the district's non-municipal
 * remainder, and separate municipality blocks whose own subdistrict rows complete the partition.
 */

function row(name: string, male: number, female: number): string {
  // Two age columns stand in for the real 216; only the trailing three totals are read.
  return `${name}|1|2|${male}|${female}|${male + female}|`;
}

const FILE = [
  row("จังหวัดทดสอบ", 100, 120),
  row("อำเภอหนึ่ง", 40, 50),
  row("ตำบลเอ", 25, 30),
  row("ตำบลบี", 15, 20),
  row("เทศบาลตำบลสอง", 60, 70),
  row("ตำบลเอ", 60, 70),
].join("\n");

describe("dopaPopulationUrl", () => {
  it("builds the December snapshot path with a zero-padded province code", () => {
    expect(dopaPopulationUrl("6812", 20)).toBe(
      "https://stat.bora.dopa.go.th/new_stat/file/6812/6812cc20.txt",
    );
    expect(dopaPopulationUrl("6812", 10)).toContain("6812cc10.txt");
  });

  it("refuses a period code that is not YYMM", () => {
    expect(() => dopaPopulationUrl("68", 20)).toThrow();
    expect(() => dopaPopulationUrl("681299", 20)).toThrow();
  });
});

describe("parseDopaPopulationFile", () => {
  it("sums a subdistrict across every local authority that covers it", () => {
    const result = parseDopaPopulationFile(FILE);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);

    const a = result.parse.subdistricts.find((s) => s.name_th === "เอ");
    // ตำบลเอ is split between the non-municipal remainder and the municipality.
    expect(a).toEqual({ name_th: "เอ", male: 85, female: 100, total: 185, row_count: 2 });

    const b = result.parse.subdistricts.find((s) => s.name_th === "บี");
    expect(b?.row_count).toBe(1);
  });

  it("reads the province row and strips its prefix", () => {
    const result = parseDopaPopulationFile(FILE);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);
    expect(result.parse.province).toEqual({
      name_th: "ทดสอบ",
      male: 100,
      female: 120,
      total: 220,
    });
    expect(result.parse.blocks_checked).toBe(2);
  });

  it("never treats a local-authority row as a subdistrict", () => {
    const result = parseDopaPopulationFile(FILE);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);
    // The อำเภอ remainder and the เทศบาล are structure, not places to report a population for.
    expect(result.parse.subdistricts.map((s) => s.name_th)).toEqual(["บี", "เอ"]);
  });

  it("handles Bangkok's เขต/แขวง naming and its bare province name", () => {
    const bangkok = [
      row("กรุงเทพมหานคร", 10, 10),
      row("เขตหนึ่ง", 10, 10),
      row("แขวงเอ", 10, 10),
    ].join("\n");
    const result = parseDopaPopulationFile(bangkok);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);
    expect(result.parse.province.name_th).toBe("กรุงเทพมหานคร");
    expect(result.parse.subdistricts[0]?.name_th).toBe("เอ");
  });

  it("collapses the double spaces a few published names carry", () => {
    const file = [
      row("จังหวัดทดสอบ", 1, 1),
      row("อำเภอหนึ่ง", 1, 1),
      row("ตำบลปอภาร  (ปอพาน)", 1, 1),
    ].join("\n");
    const result = parseDopaPopulationFile(file);
    if (result.outcome !== "SUCCESS") throw new Error(result.reason);
    expect(result.parse.subdistricts[0]?.name_th).toBe("ปอภาร (ปอพาน)");
  });

  it("refuses a file whose blocks stop reconciling", () => {
    const broken = [row("จังหวัดทดสอบ", 10, 10), row("อำเภอหนึ่ง", 10, 10), row("ตำบลเอ", 1, 1)].join(
      "\n",
    );
    const result = parseDopaPopulationFile(broken);
    expect(result.outcome).toBe("INVALID_RESPONSE");
    expect(result.outcome !== "SUCCESS" && result.retryable).toBe(false);
    expect(result.outcome !== "SUCCESS" && result.reason).toContain("อำเภอหนึ่ง");
  });

  it("refuses a file whose subdistricts no longer cover the province", () => {
    const partial = [row("จังหวัดทดสอบ", 50, 50), row("อำเภอหนึ่ง", 1, 1), row("ตำบลเอ", 1, 1)].join(
      "\n",
    );
    const result = parseDopaPopulationFile(partial);
    expect(result.outcome).toBe("INVALID_RESPONSE");
    expect(result.outcome !== "SUCCESS" && result.reason).toContain("province row states");
  });

  it("refuses a province row whose sexes do not add up to its total", () => {
    const wrong = "จังหวัดทดสอบ|1|2|10|10|99|";
    expect(parseDopaPopulationFile(wrong).outcome).toBe("INVALID_RESPONSE");
  });

  it("refuses a subdistrict row that appears before any block header", () => {
    const orphan = [row("จังหวัดทดสอบ", 1, 1), row("ตำบลเอ", 1, 1)].join("\n");
    const result = parseDopaPopulationFile(orphan);
    expect(result.outcome).toBe("INVALID_RESPONSE");
    expect(result.outcome !== "SUCCESS" && result.reason).toContain(
      "before any local-authority row",
    );
  });

  it("refuses an empty or non-numeric file rather than reporting zero people", () => {
    expect(parseDopaPopulationFile("").outcome).toBe("INVALID_RESPONSE");
    expect(parseDopaPopulationFile("จังหวัดทดสอบ|abc|def|ghi|").outcome).toBe("INVALID_RESPONSE");
  });
});
