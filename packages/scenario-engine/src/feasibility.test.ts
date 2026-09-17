import { describe, expect, it } from "vitest";
import { type FeasibilityMethodPack, computeFeasibility } from "./feasibility.js";

/**
 * The pack is built here rather than read from database/reviewed-packs, the way the assessed
 * valuation's tests do it: this package's rootDir is its own src, and a test that reaches outside
 * it would be testing the file system as much as the arithmetic. The shipped file's shape is
 * checked where it is actually loaded — the Worker and the panel both import it, so a drift in its
 * fields fails their typecheck.
 *
 * It starts DRAFT because that is how the real one ships. A named person reviews it before it
 * computes anything, and the first test here is that the gate holds.
 */
const draft: FeasibilityMethodPack = {
  method_id: "th.feasibility.assumption",
  version: "1.0.0",
  title_th: "ทดสอบ",
  lifecycle_state: "DRAFT",
  basis_th: "ทดสอบ",
  produces_th: "ทดสอบ",
  never_produces_th: [
    "อัตราผลตอบแทนภายใน (IRR) หรือมูลค่าปัจจุบันสุทธิ (NPV) เนื่องจากวิธีนี้ไม่คิดลดกระแสเงินสดตามเวลา",
  ],
  methods: [
    {
      component_id: "CAPITAL_SCHEDULE",
      title_th: "เงินลงทุนรวม",
      formula: "land_value_baht + construction_cost_per_sqm * floor_area_sqm",
      inputs: [
        {
          input_id: "construction_cost_per_sqm",
          label_th: "ต้นทุนค่าก่อสร้างต่อตารางเมตร",
          unit: "บาทต่อตารางเมตร",
          obtained_from_th: "ผู้ใช้ระบุ",
          evidence_level: "USER_ASSERTED",
        },
      ],
      output_unit: "บาท",
      coverage_th: "ทดสอบ",
      limitations_th: ["ทดสอบ"],
    },
    {
      component_id: "CAPACITY_TIME_REVENUE",
      title_th: "รายรับรวมต่อปี",
      formula: "rent_per_sqm_per_month * floor_area_sqm * occupancy_rate * 12",
      inputs: [
        {
          input_id: "rent_per_sqm_per_month",
          label_th: "ค่าเช่าต่อตารางเมตรต่อเดือน",
          unit: "บาทต่อตารางเมตรต่อเดือน",
          obtained_from_th: "ผู้ใช้ระบุ",
          evidence_level: "USER_ASSERTED",
        },
        {
          input_id: "occupancy_rate",
          label_th: "อัตราการเข้าพัก",
          unit: "สัดส่วน",
          obtained_from_th: "ผู้ใช้ระบุ",
          evidence_level: "USER_ASSERTED",
        },
      ],
      output_unit: "บาทต่อปี",
      coverage_th: "ทดสอบ",
      limitations_th: ["ทดสอบ"],
    },
  ],
  sensitivity: {
    title_th: "การวิเคราะห์ความอ่อนไหว",
    basis_th: "ทดสอบ",
    variations_percent: [-20, -10, 10, 20],
    varied_inputs: ["rent_per_sqm_per_month", "construction_cost_per_sqm", "occupancy_rate"],
  },
  review: null,
};
const reviewed: FeasibilityMethodPack = {
  ...draft,
  lifecycle_state: "ACADEMIC_REVIEWED",
  review: {
    reviewers: ["ผู้ทดสอบ"],
    reviewed_on: "2026-09-18",
    content_hash: "test",
    evidence_basis_th: "ใช้ในการทดสอบเท่านั้น",
    limitations_th: [],
  },
};

/** One worked example, chosen so every number can be checked by hand. */
const base = {
  landValueBaht: 10_000_000,
  floorAreaSqm: 1_000,
  constructionCostPerSqm: 20_000,
  rentPerSqmPerMonth: 300,
  occupancyRate: 0.8,
  operatingCostRate: 0.3,
};

describe("computeFeasibility", () => {
  it("refuses to run from an unreviewed method, however simple the arithmetic", () => {
    const result = computeFeasibility(draft, base);
    expect(result.outcome).toBe("NOT_COMPUTED");
    expect(result).toMatchObject({ reason: "FEASIBILITY_METHOD_NOT_REVIEWED" });
  });

  it("computes the worked example exactly", () => {
    const result = computeFeasibility(reviewed, base);
    if (result.outcome !== "COMPUTED") {
      throw new Error(`expected COMPUTED, got ${result.reason}`);
    }
    // 10,000,000 + 20,000 × 1,000
    expect(result.capital_total).toBe("30000000.00");
    // 300 × 1,000 × 0.8 × 12
    expect(result.gross_annual_revenue).toBe("2880000.00");
    // 2,880,000 × 0.3
    expect(result.operating_cost).toBe("864000.00");
    expect(result.net_annual_income).toBe("2016000.00");
    // 30,000,000 ÷ 2,016,000
    expect(result.payback_years).toBe("14.9");
    // 2,016,000 ÷ 30,000,000 × 100
    expect(result.simple_yield_percent).toBe("6.72");
  });

  it("returns no payback when every peso of revenue goes on operating cost", () => {
    const result = computeFeasibility(reviewed, { ...base, operatingCostRate: 1 });
    if (result.outcome !== "COMPUTED") {
      throw new Error("expected COMPUTED");
    }
    // Not Infinity and not a very large number: there is no period in which this returns.
    expect(result.net_annual_income).toBe("0.00");
    expect(result.payback_years).toBeNull();
    expect(result.simple_yield_percent).toBeNull();
  });

  it("names each missing assumption rather than guessing one", () => {
    const cases: [Partial<typeof base>, string][] = [
      [{ floorAreaSqm: 0 }, "FLOOR_AREA_MISSING"],
      [{ constructionCostPerSqm: 0 }, "CONSTRUCTION_COST_MISSING"],
      [{ rentPerSqmPerMonth: 0 }, "RENT_MISSING"],
      [{ occupancyRate: 0 }, "OCCUPANCY_NOT_USABLE"],
      [{ occupancyRate: 1.5 }, "OCCUPANCY_NOT_USABLE"],
      [{ operatingCostRate: 1.2 }, "OPERATING_COST_RATE_NOT_USABLE"],
      [{ landValueBaht: -1 }, "LAND_VALUE_NOT_USABLE"],
    ];
    for (const [patch, reason] of cases) {
      expect(computeFeasibility(reviewed, { ...base, ...patch })).toMatchObject({
        outcome: "NOT_COMPUTED",
        reason,
      });
    }
  });

  it("accepts a building with no operating cost, which is a share of zero and not an absence", () => {
    const result = computeFeasibility(reviewed, { ...base, operatingCostRate: 0 });
    if (result.outcome !== "COMPUTED") {
      throw new Error("expected COMPUTED");
    }
    expect(result.operating_cost).toBe("0.00");
    expect(result.net_annual_income).toBe("2880000.00");
  });

  it("varies one assumption at a time, in both directions", () => {
    const result = computeFeasibility(reviewed, base);
    if (result.outcome !== "COMPUTED") {
      throw new Error("expected COMPUTED");
    }
    // Three inputs × four variations.
    expect(result.sensitivity).toHaveLength(12);

    const rentDown = result.sensitivity.find(
      (row) => row.input_id === "rent_per_sqm_per_month" && row.variation_percent === -20,
    );
    // Less rent is a longer wait, and the direction is what a reader checks first.
    expect(Number(rentDown?.payback_years)).toBeGreaterThan(Number(result.payback_years));

    const costUp = result.sensitivity.find(
      (row) => row.input_id === "construction_cost_per_sqm" && row.variation_percent === 20,
    );
    expect(Number(costUp?.payback_years)).toBeGreaterThan(Number(result.payback_years));
  });

  it("never lets a varied occupancy exceed the building", () => {
    const result = computeFeasibility(reviewed, { ...base, occupancyRate: 0.95 });
    if (result.outcome !== "COMPUTED") {
      throw new Error("expected COMPUTED");
    }
    const up = result.sensitivity.filter(
      (row) => row.input_id === "occupancy_rate" && row.variation_percent === 20,
    );
    // 0.95 × 1.2 is 1.14 of a building that only has 1.0 of itself to let.
    const capped = computeFeasibility(reviewed, { ...base, occupancyRate: 1 });
    if (capped.outcome !== "COMPUTED") {
      throw new Error("expected COMPUTED");
    }
    expect(up[0]?.payback_years).toBe(capped.payback_years);
  });

  it("states that it produces neither IRR nor NPV", () => {
    expect(draft.never_produces_th.join(" ")).toContain("IRR");
    expect(draft.never_produces_th.join(" ")).toContain("NPV");
  });
});
