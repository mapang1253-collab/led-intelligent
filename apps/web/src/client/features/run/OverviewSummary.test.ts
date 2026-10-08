import { describe, expect, it } from "vitest";
import { spanFor } from "./OverviewSummary.js";
import type { EvidenceGroup } from "./useAnalysisRun.js";

/**
 * The headline span, and which place it is about.
 *
 * The case that drove these tests is a rural subdistrict: the Treasury publishes land prices by
 * district there and by subdistrict nowhere, so a panel that reads only the subdistrict's own
 * evidence shows a population and nothing else while the evidence tab below it lists thirty-one
 * land figures. Borrowing the district's figures is allowed; borrowing them silently is not.
 */

const LAND = "economic.land_price_reference";

function group(
  purposeFitness: string,
  values: readonly (readonly [string | null, string | null, string | null])[],
  requirementId = LAND,
): EvidenceGroup {
  return {
    group_id: `${purposeFitness}-${requirementId}`,
    requirement_id: requirementId,
    measure_name_th: "ราคาประเมินที่ดิน",
    area_label_th: "พื้นที่",
    source_title_th: "กรมธนารักษ์",
    attribution_th: "กรมธนารักษ์",
    geography_note_th: "",
    purpose_fitness: purposeFitness,
    items: values.map(([value, low, high], index) => ({
      observation_id: `obs-${index}`,
      population_th: "",
      value,
      value_low: low,
      value_high: high,
      unit_name_th: "บาท/ตร.ว.",
      period_th: "2569",
      source_note_th: null,
      temporal_match: "CURRENT",
      disclosure_th: "",
      disclosure_parts_th: [],
    })),
  };
}

describe("spanFor", () => {
  it("reports the subdistrict's own figures as its own", () => {
    const span = spanFor(
      [
        group("FIT", [
          ["500", null, null],
          ["900", null, null],
        ]),
      ],
      LAND,
    );
    expect(span).toMatchObject({ low: 500, high: 900, count: 2, unit: "บาท/ตร.ว.", ownArea: true });
  });

  it("reads both ends of a published band, not just the midpoint it never gave", () => {
    const span = spanFor([group("FIT", [[null, "180", "7800"]])], LAND);
    expect(span?.low).toBe(180);
    expect(span?.high).toBe(7800);
  });

  it("falls back to the containing district and says so", () => {
    // ต.ลำปางหลวง: no subdistrict land figures exist, 31 district ones do. Before the fallback this
    // returned null and the overview showed a population where a price span belonged.
    const span = spanFor([group("CONTEXT_ONLY", [[null, "180", "7800"]])], LAND);
    expect(span).toMatchObject({ low: 180, high: 7800, ownArea: false });
  });

  it("prefers the area's own figures and never mixes the two levels into one span", () => {
    const span = spanFor(
      [
        group("FIT", [
          ["11700", null, null],
          ["84600", null, null],
        ]),
        group("CONTEXT_ONLY", [
          ["500", null, null],
          ["50000", null, null],
        ]),
      ],
      LAND,
    );
    // A range spanning 500–84,600 would describe neither the subdistrict nor the district.
    expect(span).toMatchObject({ low: 11700, high: 84600, count: 2, ownArea: true });
  });

  it("names the area a borrowed figure actually describes", () => {
    // ต.หนองปรือ borrows its population from จ.ชลบุรี. Labelling that "ระดับอำเภอ" put a province
    // of 1.6 million under the word for district; two levels up is not one level up.
    const province = group("CONTEXT_ONLY", [["1645985", null, null]], "demand.resident_population");
    const span = spanFor([{ ...province, area_label_th: "จ.ชลบุรี" }], "demand.resident_population");
    expect(span).toMatchObject({ ownArea: false, areaLabel: "จ.ชลบุรี" });
  });

  it("returns null rather than a zero when nothing was published", () => {
    expect(spanFor([], LAND)).toBeNull();
    expect(spanFor([group("FIT", [[null, null, null]])], LAND)).toBeNull();
  });

  it("ignores figures belonging to a different requirement", () => {
    const groups = [group("FIT", [["42", null, null]], "demand.resident_population")];
    expect(spanFor(groups, LAND)).toBeNull();
  });
});
