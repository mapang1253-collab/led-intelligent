import { describe, expect, it } from "vitest";
import {
  areaLabelTh,
  areaLevelNounTh,
  areaPrefixTh,
  formatTargetTh,
  isBangkok,
} from "./administrative-naming.js";

/**
 * Bangkok's divisions are เขต and แขวง, and it is not a จังหวัด at all. Getting this wrong names
 * units of government that do not exist there.
 */

describe("Bangkok", () => {
  const bangkok = {
    province_name_th: "กรุงเทพมหานคร",
    district_name_th: "พระนคร",
    subdistrict_name_th: "พระบรมมหาราชวัง",
  };

  it("uses แขวง and เขต, and never calls itself a จังหวัด", () => {
    expect(formatTargetTh(bangkok)).toBe("แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพมหานคร");
    expect(formatTargetTh(bangkok)).not.toContain("จ.");
    expect(formatTargetTh(bangkok)).not.toContain("ต.");
    expect(formatTargetTh(bangkok)).not.toContain("อ.");
  });

  it("adds no prefix to the city's own name", () => {
    expect(areaPrefixTh("PROVINCE", "กรุงเทพมหานคร")).toBe("");
    expect(areaLabelTh("PROVINCE", "กรุงเทพมหานคร", "กรุงเทพมหานคร")).toBe("กรุงเทพมหานคร");
  });

  it("names its levels as เขต and แขวง in prose", () => {
    expect(areaLevelNounTh("DISTRICT", "กรุงเทพมหานคร")).toBe("เขต");
    expect(areaLevelNounTh("SUBDISTRICT", "กรุงเทพมหานคร")).toBe("แขวง");
  });

  it("is recognised only by its exact name", () => {
    expect(isBangkok("กรุงเทพมหานคร")).toBe(true);
    expect(isBangkok(" กรุงเทพมหานคร ")).toBe(true);
    expect(isBangkok("ชลบุรี")).toBe(false);
    expect(isBangkok("กรุงเทพ")).toBe(false);
  });
});

describe("every other province", () => {
  const chonburi = {
    province_name_th: "ชลบุรี",
    district_name_th: "เมืองชลบุรี",
    subdistrict_name_th: "บางปลาสร้อย",
  };

  it("uses ต. อ. จ.", () => {
    expect(formatTargetTh(chonburi)).toBe("ต.บางปลาสร้อย อ.เมืองชลบุรี จ.ชลบุรี");
  });

  it("names its levels as ตำบล อำเภอ จังหวัด in prose", () => {
    expect(areaLevelNounTh("SUBDISTRICT", "ชลบุรี")).toBe("ตำบล");
    expect(areaLevelNounTh("DISTRICT", "ชลบุรี")).toBe("อำเภอ");
    expect(areaLevelNounTh("PROVINCE", "ชลบุรี")).toBe("จังหวัด");
  });
});
