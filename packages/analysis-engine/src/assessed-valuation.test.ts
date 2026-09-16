import { describe, expect, it } from "vitest";
import {
  type ValuationMethodPack,
  toSquareWa,
  valueConstruction,
  valueLand,
} from "./assessed-valuation.js";
import {
  canonicalMethodContent,
  computeMethodHash,
  verifyMethodIntegrity,
} from "./valuation-integrity.js";

/**
 * Golden cases: every expected figure here is checkable on paper. If one of them ever needs
 * updating to match the code, the code changed the meaning of a published assessment.
 */

const METHODS: ValuationMethodPack["methods"] = [
  {
    component_id: "ASSESSED_CONSTRUCTION_VALUE",
    title_th: "มูลค่าสิ่งปลูกสร้างตามราคาประเมิน",
    formula: "rate_per_sqm * floor_area_sqm",
    inputs: [],
    output_unit: "บาท",
    coverage_th: "77 จังหวัด",
    limitations_th: ["ไม่หักค่าเสื่อมราคา"],
  },
  {
    component_id: "ASSESSED_LAND_AREA_CONVERSION",
    title_th: "การแปลงเนื้อที่ดินไทยเป็นตารางวา",
    formula: "rai * 400 + ngan * 100 + wa",
    inputs: [],
    output_unit: "ตารางวา",
    coverage_th: "มาตราที่ดินไทย",
    limitations_th: [],
  },
];

function pack(over: Partial<ValuationMethodPack> = {}): ValuationMethodPack {
  return {
    method_id: "th.valuation.assessed",
    version: "1.0.0",
    title_th: "วิธีคำนวณมูลค่าตามบัญชีราคาประเมิน",
    lifecycle_state: "ACADEMIC_REVIEWED",
    basis_th: "พ.ร.บ.ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562",
    produces_th: "มูลค่าตามราคาประเมิน",
    never_produces_th: ["ราคาตลาด"],
    methods: METHODS,
    review: {
      reviewers: ["อรณภา"],
      reviewed_on: "2026-09-17",
      content_hash: "unchecked",
      evidence_basis_th: "ตรวจแล้ว",
      limitations_th: [],
    },
    ...over,
  };
}

describe("toSquareWa", () => {
  it("uses the statutory measure, not an approximation", () => {
    // 1 ไร่ = 400 ตร.ว., 1 งาน = 100 ตร.ว.
    expect(toSquareWa({ rai: 1 }).toString()).toBe("400");
    expect(toSquareWa({ ngan: 1 }).toString()).toBe("100");
    expect(toSquareWa({ rai: 2, ngan: 3, wa: 25 }).toString()).toBe("1125");
  });

  it("treats an omitted part as zero, not as a missing area", () => {
    expect(toSquareWa({ wa: 50 }).toString()).toBe("50");
    expect(toSquareWa({}).toString()).toBe("0");
  });

  it("keeps a fractional wa exactly, without floating-point drift", () => {
    expect(toSquareWa({ rai: 1, wa: 0.1 }).toString()).toBe("400.1");
    // 0.1 + 0.2 in binary floating point is 0.30000000000000004; decimal.js must not do that.
    expect(
      toSquareWa({ wa: 0.1 })
        .plus(toSquareWa({ wa: 0.2 }))
        .toString(),
    ).toBe("0.3");
  });
});

describe("valueConstruction", () => {
  it("multiplies the published rate by the stated area", () => {
    // A real Chon Buri rate: 8,200 บาท/ตร.ม. for บ้านพักอาศัยไม้ชั้นเดียว, on 120 ตร.ม.
    const result = valueConstruction(pack(), {
      ratePerSqm: "8200",
      floorAreaSqm: 120,
      buildingTypeTh: "บ้านพักอาศัยไม้ชั้นเดียว",
    });
    expect(result.outcome).toBe("COMPUTED");
    if (result.outcome !== "COMPUTED") return;
    expect(result.value).toBe("984000.00");
    expect(result.steps).toHaveLength(3);
    expect(result.steps[2]?.expression_th).toBe("8,200 × 120");
  });

  it("names the building type the rate belongs to", () => {
    const result = valueConstruction(pack(), {
      ratePerSqm: "8200",
      floorAreaSqm: 120,
      buildingTypeTh: "บ้านพักอาศัยไม้ชั้นเดียว",
    });
    if (result.outcome !== "COMPUTED") throw new Error("expected a figure");
    expect(result.steps[0]?.label_th).toContain("บ้านพักอาศัยไม้ชั้นเดียว");
  });

  it("carries the method's limitations with the figure", () => {
    const result = valueConstruction(pack(), {
      ratePerSqm: "8200",
      floorAreaSqm: 120,
      buildingTypeTh: "ก",
    });
    if (result.outcome !== "COMPUTED") throw new Error("expected a figure");
    expect(result.limitations_th).toContain("ไม่หักค่าเสื่อมราคา");
  });

  it("refuses to run from an unreviewed method", () => {
    const draft = valueConstruction(pack({ lifecycle_state: "DRAFT" }), {
      ratePerSqm: "8200",
      floorAreaSqm: 120,
      buildingTypeTh: "ก",
    });
    expect(draft).toEqual({ outcome: "NOT_COMPUTED", reason: "VALUATION_METHOD_NOT_REVIEWED" });

    const unsigned = valueConstruction(pack({ review: null }), {
      ratePerSqm: "8200",
      floorAreaSqm: 120,
      buildingTypeTh: "ก",
    });
    expect(unsigned).toEqual({ outcome: "NOT_COMPUTED", reason: "VALUATION_METHOD_NOT_REVIEWED" });
  });

  it("says the area is missing rather than reporting a value of zero", () => {
    const result = valueConstruction(pack(), {
      ratePerSqm: "8200",
      floorAreaSqm: 0,
      buildingTypeTh: "ก",
    });
    expect(result).toEqual({ outcome: "NOT_COMPUTED", reason: "FLOOR_AREA_MISSING" });
  });

  it("refuses a rate that is not a usable number", () => {
    for (const rate of ["", "-", "0", "-100", "ห้าพัน"]) {
      const result = valueConstruction(pack(), {
        ratePerSqm: rate,
        floorAreaSqm: 120,
        buildingTypeTh: "ก",
      });
      expect(result.outcome).toBe("NOT_COMPUTED");
    }
  });
});

describe("valueLand", () => {
  it("converts the area, then applies the rate, showing both", () => {
    // 1 ไร่ 2 งาน = 600 ตร.ว. at 6,000 บาท/ตร.ว.
    const result = valueLand(pack(), {
      ratePerSquareWa: "6000",
      area: { rai: 1, ngan: 2 },
      positionTh: "ที่ดินติดถนน ซอย ทาง",
    });
    expect(result.outcome).toBe("COMPUTED");
    if (result.outcome !== "COMPUTED") return;
    expect(result.value).toBe("3600000.00");
    expect(result.steps[0]?.value).toBe("600");
    // The shown arithmetic is grouped the same way as the figures above it.
    expect(result.steps[2]?.expression_th).toBe("6,000 × 600");
    expect(result.steps[0]?.expression_th).toContain("(1×400) + (2×100) + 0");
  });

  it("says the area is missing rather than valuing nothing at zero baht", () => {
    const result = valueLand(pack(), {
      ratePerSquareWa: "6000",
      area: {},
      positionTh: "ก",
    });
    expect(result).toEqual({ outcome: "NOT_COMPUTED", reason: "LAND_AREA_MISSING" });
  });
});

describe("method integrity", () => {
  it("accepts a method whose signature still matches its content", async () => {
    const base = pack();
    const signed = pack({
      review: {
        ...(base.review as NonNullable<ValuationMethodPack["review"]>),
        content_hash: await computeMethodHash(base),
      },
    });
    expect(await verifyMethodIntegrity(signed)).toEqual({ ok: true });
  });

  it("stops executing when a formula changes after review", async () => {
    const base = pack();
    const hash = await computeMethodHash(base);
    // Someone turns 400 into 40 in the land conversion after the review was recorded.
    const tampered = pack({
      methods: [
        METHODS[0] as ValuationMethodPack["methods"][number],
        {
          ...(METHODS[1] as ValuationMethodPack["methods"][number]),
          formula: "rai * 40 + ngan * 100 + wa",
        },
      ],
      review: {
        ...(base.review as NonNullable<ValuationMethodPack["review"]>),
        content_hash: hash,
      },
    });
    const verdict = await verifyMethodIntegrity(tampered);
    expect(verdict.ok).toBe(false);
  });

  it("does not let a retitled method need re-review", async () => {
    const a = await computeMethodHash(pack());
    const b = await computeMethodHash(pack({ title_th: "ชื่อใหม่" }));
    expect(a).toBe(b);
  });

  it("hashes content, not key order", () => {
    const a = canonicalMethodContent(pack());
    const b = canonicalMethodContent(pack());
    expect(a).toBe(b);
  });

  it("refuses an unsigned or unreviewed method", async () => {
    expect((await verifyMethodIntegrity(pack({ lifecycle_state: "DRAFT" }))).ok).toBe(false);
    expect((await verifyMethodIntegrity(pack({ review: null }))).ok).toBe(false);
  });
});
