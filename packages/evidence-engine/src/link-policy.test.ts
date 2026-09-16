import type { StoredObservation } from "@reis/contracts";
import { describe, expect, it } from "vitest";
import { type LinkTarget, buildHouseholdIncomeLinks, temporalMatchFor } from "./link-policy.js";

/**
 * The policy's job is to stop evidence from claiming more than it is. These tests pin the
 * downgrades: containing-area evidence stays context, area evidence stays AREA, and every figure
 * carries the source's own limits.
 */

function observation(overrides: Partial<StoredObservation> = {}): StoredObservation {
  return {
    observation_id: "1",
    measure_id: "household_income_monthly_mean",
    population_th: "ลูกจ้าง / ลูกจ้างที่ทำงานด้านวิชาชีพ",
    geography_level: "PROVINCE",
    area_name_th: "ชลบุรี",
    period_start_year: 2025,
    period_end_year: 2025,
    source_vintage: "2568",
    epistemic_status: "OBSERVED",
    reliability: "OFFICIAL_SURVEY",
    completeness: "PARTIAL",
    source_note_th: null,
    value: "45123.5",
    unit_code: "THB_PER_MONTH",
    unit_name_th: "บาทต่อเดือน",
    statistic: "MEAN",
    measure_name_th: "รายได้เฉลี่ยต่อเดือนของครัวเรือน",
    source_title_th: "รายได้เฉลี่ยต่อเดือนของครัวเรือน",
    attribution_th: "ที่มา: สำนักงานสถิติแห่งชาติ",
    must_not_become_th: "ห้ามใช้แทนรายได้ของครัวเรือนในตำบลใดโดยเฉพาะ",
    ...overrides,
  };
}

const subdistrictTarget: LinkTarget = {
  province_name_th: "ชลบุรี",
  district_name_th: "เมืองชลบุรี",
  subdistrict_name_th: "บางปลาสร้อย",
  level: "SUBDISTRICT",
  requested_scope: "AREA",
};

describe("temporalMatchFor", () => {
  it("grades a published period by how far behind the run it is", () => {
    expect(temporalMatchFor(2026, 2026)).toBe("CURRENT");
    expect(temporalMatchFor(2025, 2026)).toBe("CURRENT");
    expect(temporalMatchFor(2024, 2026)).toBe("RECENT");
    expect(temporalMatchFor(2023, 2026)).toBe("RECENT");
    expect(temporalMatchFor(2022, 2026)).toBe("DATED");
  });
});

describe("buildHouseholdIncomeLinks", () => {
  it("records province evidence for a subdistrict target as a labelled downgrade", () => {
    const [link] = buildHouseholdIncomeLinks([observation()], subdistrictTarget, 2026);
    if (!link) throw new Error("expected a link");

    expect(link.geography_match).toBe("CONTAINING_AREA");
    expect(link.subject_match).toBe("PROXY");
    expect(link.purpose_fitness).toBe("CONTEXT_ONLY");
    expect(link.role).toBe("CONTEXTUAL");
    expect(link.decision_impact).toBe("CONTEXT");
    expect(link.substitution_reason).not.toBeNull();
  });

  it("never promotes area evidence, whatever scope the intake requested", () => {
    for (const requested of ["AREA", "PRELIMINARY_PROPERTY", "PROPERTY"] as const) {
      const [link] = buildHouseholdIncomeLinks(
        [observation()],
        { ...subdistrictTarget, requested_scope: requested },
        2026,
      );
      expect(link?.requested_level).toBe(requested);
      expect(link?.actual_level).toBe("AREA");
    }
  });

  it("cannot reach FIT even when the geography matches exactly", () => {
    const [link] = buildHouseholdIncomeLinks(
      [observation()],
      { ...subdistrictTarget, level: "PROVINCE" },
      2026,
    );
    // A sampled cohort average is never a direct answer about one site.
    expect(link?.geography_match).toBe("EXACT");
    expect(link?.purpose_fitness).toBe("FIT_WITH_CAVEAT");
    expect(link?.subject_match).toBe("PARTIAL");
    expect(link?.substitution_reason).toBeNull();
  });

  it("puts the cohort, the period, the source limits and the attribution in every disclosure", () => {
    const [link] = buildHouseholdIncomeLinks([observation()], subdistrictTarget, 2026);
    const disclosure = link?.disclosure_th ?? "";
    expect(disclosure).toContain("ลูกจ้างที่ทำงานด้านวิชาชีพ");
    expect(disclosure).toContain("2568");
    expect(disclosure).toContain("ห้ามใช้แทนรายได้ของครัวเรือนในตำบลใดโดยเฉพาะ");
    expect(disclosure).toContain("สำนักงานสถิติแห่งชาติ");
    expect(disclosure).toContain("ไม่ใช่ข้อมูลของ");
  });

  it("carries a source footnote through instead of dropping it", () => {
    const note = "ข้อมูลจากการสำรวจตัวอย่างมีค่าเป็น 0";
    const [link] = buildHouseholdIncomeLinks(
      [observation({ value: "0", source_note_th: note })],
      subdistrictTarget,
      2026,
    );
    expect(link?.disclosure_th).toContain(note);
  });

  it("says so when the newest published period is already stale", () => {
    const [link] = buildHouseholdIncomeLinks(
      [observation({ period_end_year: 2020, source_vintage: "2563" })],
      subdistrictTarget,
      2026,
    );
    expect(link?.temporal_match).toBe("DATED");
    expect(link?.disclosure_th).toContain("เกิน 3 ปี");
  });

  it("orders newest period first so two runs present the same evidence in the same order", () => {
    const links = buildHouseholdIncomeLinks(
      [
        observation({ observation_id: "old", period_end_year: 2023, source_vintage: "2566" }),
        observation({ observation_id: "new", period_end_year: 2025, source_vintage: "2568" }),
      ],
      subdistrictTarget,
      2026,
    );
    expect(links.map((link) => link.observation_id)).toEqual(["new", "old"]);
  });

  it("returns nothing when there is nothing to link", () => {
    expect(buildHouseholdIncomeLinks([], subdistrictTarget, 2026)).toEqual([]);
  });
});
