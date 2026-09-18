import { describe, expect, it } from "vitest";
import {
  type BriefEvidenceInput,
  briefCitationIndex,
  buildOpportunityBrief,
  selectBriefEvidence,
} from "./brief.js";

function link(
  index: number,
  measure: string,
  level: BriefEvidenceInput["geography_level"] = "SUBDISTRICT",
): BriefEvidenceInput {
  return {
    observation_id: `obs-${measure}-${level}-${index}`,
    measure_name_th: measure,
    population_th: `อาคาร ${index}`,
    value: String(10_000 + index),
    unit_name_th: "บาทต่อตารางเมตร",
    area_name_th: "แสนสุข",
    geography_level: level,
    source_vintage: "2567",
    must_not_become_th: "ไม่ใช่ราคาตลาด",
    source_note_th: null,
    geography_match: "EXACT_AREA",
  };
}

const CAP = 12;

describe("selectBriefEvidence", () => {
  it("caps each measure at each geography level, and counts them apart", () => {
    const corpus = [
      ...Array.from({ length: 597 }, (_, i) => link(i, "ราคาประเมินห้องชุด")),
      ...Array.from({ length: 5 }, (_, i) => link(i, "ราคาประเมินที่ดิน")),
      ...Array.from({ length: 40 }, (_, i) => link(i, "ราคาประเมินห้องชุด", "DISTRICT")),
    ];
    const kept = selectBriefEvidence(corpus);
    // Three cohorts: two over the cap and capped, one under it and untouched. The same measure at
    // a different geography level is a different cohort, which is the point of counting them apart.
    expect(kept).toHaveLength(CAP + 5 + CAP);
  });

  it("keeps a prefix, so the order the link policy chose survives", () => {
    const corpus = Array.from({ length: 50 }, (_, i) => link(i, "ราคาประเมินห้องชุด"));
    const kept = selectBriefEvidence(corpus);
    expect(kept.map((item) => item.observation_id)).toEqual(
      corpus.slice(0, CAP).map((item) => item.observation_id),
    );
  });

  it("is deterministic: the same corpus selects the same rows every time", () => {
    const corpus = Array.from({ length: 200 }, (_, i) => link(i, "ราคาประเมินห้องชุด"));
    expect(selectBriefEvidence(corpus)).toEqual(selectBriefEvidence(corpus));
  });

  it("leaves a corpus smaller than the cap entirely alone", () => {
    const corpus = Array.from({ length: 5 }, (_, i) => link(i, "ราคาประเมินที่ดิน"));
    expect(selectBriefEvidence(corpus)).toHaveLength(5);
  });
});

describe("buildOpportunityBrief", () => {
  const build = (corpus: readonly BriefEvidenceInput[]) =>
    buildOpportunityBrief({
      target_th: "ต.แสนสุข",
      effective_on: "2026-09-18",
      output_scope: "AREA",
      evidence: corpus,
      critical_gaps_th: [],
    });

  it("tells the model what it left out, once per truncated cohort", () => {
    const brief = build(Array.from({ length: 597 }, (_, i) => link(i, "ราคาประเมินห้องชุด")));
    const notes = brief.evidence_cards.filter((card) => card.caveat_th.includes("แสดงเป็นตัวอย่าง"));
    // Said once, not on all twelve: repetition would cost prompt budget to say the same thing.
    expect(notes).toHaveLength(1);
    expect(notes[0]?.caveat_th).toContain("12 จาก 597");
  });

  it("says nothing about sampling when nothing was sampled", () => {
    const brief = build(Array.from({ length: 4 }, (_, i) => link(i, "ราคาประเมินที่ดิน")));
    expect(brief.evidence_cards.some((card) => card.caveat_th.includes("แสดงเป็นตัวอย่าง"))).toBe(
      false,
    );
  });

  it("keeps the caveats each figure already carried", () => {
    const corpus = [{ ...link(1, "ราคาประเมินห้องชุด"), geography_match: "CONTAINING_AREA" }];
    const brief = build(corpus);
    expect(brief.evidence_cards[0]?.caveat_th).toContain("ไม่ใช่ข้อมูลของพื้นที่เป้าหมายโดยตรง");
    expect(brief.evidence_cards[0]?.caveat_th).toContain("ไม่ใช่ราคาตลาด");
  });
});

describe("briefCitationIndex", () => {
  it("resolves a citation to the row the model was actually shown", () => {
    const corpus = Array.from({ length: 100 }, (_, i) => link(i, "ราคาประเมินห้องชุด"));
    const brief = buildOpportunityBrief({
      target_th: "ต.แสนสุข",
      effective_on: "2026-09-18",
      output_scope: "AREA",
      evidence: corpus,
      critical_gaps_th: [],
    });
    const index = briefCitationIndex(corpus);

    // Every key the brief offers resolves, and no key beyond them exists.
    expect(index.size).toBe(brief.evidence_cards.length);
    for (const card of brief.evidence_cards) {
      expect(index.get(card.evidence_id)).toBeDefined();
    }
    // The pairing is positional, and both sides must have cut the same rows.
    expect(index.get("ev1")).toBe(corpus[0]?.observation_id);
    expect(index.get(`ev${CAP}`)).toBe(corpus[CAP - 1]?.observation_id);
    expect(index.get(`ev${CAP + 1}`)).toBeUndefined();
  });
});
