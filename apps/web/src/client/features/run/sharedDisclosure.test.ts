import { describe, expect, it } from "vitest";
import { splitDisclosures, withoutAlreadyShown, withoutRowIdentity } from "./sharedDisclosure.js";

/**
 * The clauses are real: two rows of the Treasury land table for อ.ท่าเรือ, which differ only in the
 * cohort named in the first clause. Note the " · " inside the cohort name — the reason the display
 * is handed clauses instead of splitting a joined sentence.
 */
const CONTAINING =
  "ไม่ใช่ข้อมูลของต.จำปา อ.ท่าเรือ จ.พระนครศรีอยุธยาโดยตรง แต่เป็นข้อมูลของพื้นที่ที่ครอบคลุมพื้นที่เป้าหมายอยู่";
const SOURCE_NOTE = "หมายเหตุจากแหล่งข้อมูล: ราคาประเมินสำหรับที่ดินที่มีเอกสารสิทธิประเภทอื่น";
const LIMIT = "ข้อจำกัด: ห้ามใช้เป็นราคาประเมินของที่ดินที่มีโฉนด";
const ATTRIBUTION = "ที่มา: กรมธนารักษ์";

const LAND_ROWS = [
  {
    observation_id: "1",
    disclosure_parts_th: [
      'ราคาประเมินที่ดินต่อตารางวา ของกลุ่ม "ที่ดินติด คลองชลประทาน · เทศบาลตำบลท่าเรือ" ระดับอำเภอ (ท่าเรือ) ปี 2567',
      CONTAINING,
      SOURCE_NOTE,
      LIMIT,
      ATTRIBUTION,
    ],
  },
  {
    observation_id: "2",
    disclosure_parts_th: [
      'ราคาประเมินที่ดินต่อตารางวา ของกลุ่ม "ที่ดินติด แม่น้ำป่าสัก · เทศบาลตำบลท่าเรือ" ระดับอำเภอ (ท่าเรือ) ปี 2567',
      CONTAINING,
      SOURCE_NOTE,
      LIMIT,
      ATTRIBUTION,
    ],
  },
];

describe("splitDisclosures", () => {
  it("lifts out the clauses every figure repeats, and keeps the ones it does not", () => {
    const { shared, own } = splitDisclosures(LAND_ROWS);

    expect(shared).toEqual([CONTAINING, SOURCE_NOTE, LIMIT, ATTRIBUTION]);
    // What is left is the one clause that actually names this figure.
    expect(own.get("1")).toHaveLength(1);
    expect(own.get("1")?.[0]).toContain("คลองชลประทาน");
    expect(own.get("2")?.[0]).toContain("แม่น้ำป่าสัก");
  });

  it("every clause survives the split", () => {
    const { shared, own } = splitDisclosures(LAND_ROWS);
    for (const row of LAND_ROWS) {
      const rebuilt = [...(own.get(row.observation_id) ?? []), ...shared].sort();
      expect(rebuilt).toEqual([...row.disclosure_parts_th].sort());
    }
  });

  it("leaves a group of one alone", () => {
    const { shared, own } = splitDisclosures(LAND_ROWS.slice(0, 1));
    expect(shared).toEqual([]);
    expect(own.get("1")).toHaveLength(5);
  });

  it("keeps a clause that only some figures carry", () => {
    const derived = "เป็นค่าที่คำนวณจากข้อมูลย่อยที่แหล่งข้อมูลเผยแพร่";
    const { shared, own } = splitDisclosures([
      LAND_ROWS[0] as (typeof LAND_ROWS)[number],
      {
        observation_id: "3",
        // A computed figure, and that has to stay on this figure alone.
        disclosure_parts_th: [...(LAND_ROWS[1]?.disclosure_parts_th ?? []), derived],
      },
    ]);
    expect(shared).not.toContain(derived);
    expect(own.get("3")).toContain(derived);
  });
});

describe("withoutAlreadyShown", () => {
  it("drops a shared clause the card prints somewhere else", () => {
    const { shared } = splitDisclosures(LAND_ROWS);
    expect(withoutAlreadyShown(shared, [CONTAINING, ATTRIBUTION])).toEqual([SOURCE_NOTE, LIMIT]);
  });

  it("ignores empty and missing text rather than dropping everything", () => {
    const { shared } = splitDisclosures(LAND_ROWS);
    expect(withoutAlreadyShown(shared, [null, undefined, ""])).toEqual(shared);
  });
});

describe("withoutRowIdentity", () => {
  const row = {
    measureNameTh: "ราคาประเมินที่ดินต่อตารางวา",
    cohortTh: "ที่ดินติด คลองชลประทาน · เทศบาลตำบลท่าเรือ",
  };

  it("drops the opening clause the row already prints in full", () => {
    const { own } = splitDisclosures(LAND_ROWS);
    expect(withoutRowIdentity(own.get("1") ?? [], row)).toEqual([]);
  });

  it("keeps a clause that is not that one", () => {
    const derived = "เป็นค่าที่คำนวณจากข้อมูลย่อยที่แหล่งข้อมูลเผยแพร่";
    expect(withoutRowIdentity([derived, LIMIT], row)).toEqual([derived, LIMIT]);
  });

  it("keeps the opening clause when the row does not name that cohort", () => {
    const clauses = LAND_ROWS[0]?.disclosure_parts_th ?? [];
    expect(withoutRowIdentity(clauses, { ...row, cohortTh: "อย่างอื่น" })).toEqual(clauses);
  });
});
