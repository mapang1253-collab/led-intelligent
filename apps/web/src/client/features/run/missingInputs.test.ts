import { describe, expect, it } from "vitest";
import { groupMissingInputs } from "./missingInputs.js";

/** Shapes taken from database/reviewed-packs/th-cba-mr55-v1.json. */
const PLAN = "แบบผังบริเวณ";
const SITE = "วัดหน้างาน หรือข้อมูลเขตทางจากหน่วยงานท้องถิ่น";

const OUTCOMES = [
  {
    rule_id: "mr55.33.1",
    missing_inputs: [
      { label_th: "พื้นที่ว่างของแปลง", obtained_from_th: PLAN },
      { label_th: "พื้นที่ชั้นที่ใหญ่ที่สุด", obtained_from_th: PLAN },
    ],
  },
  {
    rule_id: "mr55.33.2",
    // The same measurement, wanted again by another rule.
    missing_inputs: [{ label_th: "พื้นที่ว่างของแปลง", obtained_from_th: PLAN }],
  },
  {
    rule_id: "mr55.41.1",
    missing_inputs: [{ label_th: "ระยะร่นจากกึ่งกลางถนน", obtained_from_th: SITE }],
  },
  { rule_id: "mr55.9", missing_inputs: [] },
];

describe("groupMissingInputs", () => {
  it("collapses the rule-by-rule list to one line per place the reader must go", () => {
    expect(groupMissingInputs(OUTCOMES)).toEqual([
      {
        source_th: PLAN,
        rule_count: 2,
        labels_th: ["พื้นที่ว่างของแปลง", "พื้นที่ชั้นที่ใหญ่ที่สุด"],
      },
      { source_th: SITE, rule_count: 1, labels_th: ["ระยะร่นจากกึ่งกลางถนน"] },
    ]);
  });

  it("counts a rule once however many measurements it wants from one source", () => {
    const [plan] = groupMissingInputs([OUTCOMES[0] as (typeof OUTCOMES)[number]]);
    expect(plan?.rule_count).toBe(1);
    expect(plan?.labels_th).toHaveLength(2);
  });

  it("puts the source that unblocks the most rules first", () => {
    const groups = groupMissingInputs(OUTCOMES);
    expect(groups.map((g) => g.rule_count)).toEqual([2, 1]);
  });

  it("says nothing when every rule could be answered", () => {
    expect(groupMissingInputs([{ rule_id: "mr55.9", missing_inputs: [] }])).toEqual([]);
  });
});
