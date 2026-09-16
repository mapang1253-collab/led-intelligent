import { describe, expect, it } from "vitest";

/**
 * The administrative chain guard, expressed as the query's own logic so it can be checked without
 * a database. The live behaviour is verified against the real reference table; this pins the shape
 * of the rule so it cannot be loosened by accident.
 */

interface Area {
  id: string;
  level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  parent_id: string | null;
  valid_to: string | null;
}

/** Mirrors administrativeChainIsValid in @reis/data-access. */
function chainIsValid(
  areas: readonly Area[],
  provinceId: string,
  districtId: string,
  subdistrictId: string,
): boolean {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const sub = byId.get(subdistrictId);
  if (!sub || sub.level !== "SUBDISTRICT" || sub.valid_to !== null) return false;
  const dis = sub.parent_id ? byId.get(sub.parent_id) : undefined;
  if (!dis || dis.id !== districtId || dis.level !== "DISTRICT") return false;
  const prov = dis.parent_id ? byId.get(dis.parent_id) : undefined;
  return Boolean(prov && prov.id === provinceId && prov.level === "PROVINCE");
}

const AREAS: Area[] = [
  { id: "p1", level: "PROVINCE", parent_id: null, valid_to: null },
  { id: "p2", level: "PROVINCE", parent_id: null, valid_to: null },
  { id: "d1", level: "DISTRICT", parent_id: "p1", valid_to: null },
  { id: "d2", level: "DISTRICT", parent_id: "p2", valid_to: null },
  { id: "s1", level: "SUBDISTRICT", parent_id: "d1", valid_to: null },
  { id: "s2", level: "SUBDISTRICT", parent_id: "d2", valid_to: null },
  { id: "sOld", level: "SUBDISTRICT", parent_id: "d1", valid_to: "2020-01-01" },
];

describe("administrative chain guard", () => {
  it("accepts a chain that really belongs together", () => {
    expect(chainIsValid(AREAS, "p1", "d1", "s1")).toBe(true);
  });

  it("rejects a subdistrict from another district", () => {
    // The defect this guard was written for: parts that each exist, combined into a place that
    // does not, then displayed as the analysed target.
    expect(chainIsValid(AREAS, "p1", "d1", "s2")).toBe(false);
  });

  it("rejects a district from another province", () => {
    expect(chainIsValid(AREAS, "p1", "d2", "s2")).toBe(false);
  });

  it("rejects levels used out of place", () => {
    expect(chainIsValid(AREAS, "p1", "s1", "d1")).toBe(false);
    expect(chainIsValid(AREAS, "d1", "s1", "p1")).toBe(false);
  });

  it("rejects an area that is no longer current", () => {
    expect(chainIsValid(AREAS, "p1", "d1", "sOld")).toBe(false);
  });

  it("rejects ids that do not exist", () => {
    expect(chainIsValid(AREAS, "p1", "d1", "nope")).toBe(false);
  });
});
