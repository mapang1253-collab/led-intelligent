import type { ActivityId, BuildingTypeTh, EvidenceCard, OpportunityBrief } from "@reis/contracts";
import { ACTIVITY_IDS, BUILDING_TYPES_TH } from "@reis/contracts";

/**
 * Builds the bounded, rights-filtered projection sent to the model (docs/ai-architecture.md §3, §6).
 *
 * What is deliberately absent matters more than what is present: no personal names, no address
 * line, no deed or map-sheet identifiers, no raw source payloads, no run or capability identifiers.
 * The model sees published area statistics, the caveats attached to them, the questions the corpus
 * cannot answer, and the vocabularies it must choose from — nothing that could identify a person or
 * a parcel.
 */

export interface BriefEvidenceInput {
  readonly observation_id: string;
  readonly measure_name_th: string;
  readonly population_th: string;
  readonly value: string;
  readonly unit_name_th: string;
  readonly area_name_th: string;
  readonly geography_level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  readonly source_vintage: string;
  readonly must_not_become_th: string;
  readonly source_note_th: string | null;
  readonly geography_match: string;
}

const LEVEL_TH = { PROVINCE: "จังหวัด", DISTRICT: "อำเภอ", SUBDISTRICT: "ตำบล" } as const;

/**
 * How many cards of one measure, at one geography level, the brief carries.
 *
 * Every published figure used to go in. For ต.แสนสุข that is 597 condominium prices, a prompt of
 * roughly 113,000 Thai characters, and Gemini's free tier allows 250,000 input tokens per minute —
 * so two runs of a well-documented area exhausted it and the stage failed. Measured on one day:
 * 122 calls rate-limited against 34 that succeeded, and the three stages downstream of concepts
 * had nothing to work with in every one of those 122 cases.
 *
 * Twelve is a sample, not a summary. What the model has to know from a price cohort is its level
 * and its spread, and the 598th row of the same measure at the same geography carries neither more
 * of the first nor more of the second — it is the same measure repeated. What would be lost is a
 * particular building's name, and the model is not asked to reason about particular buildings.
 *
 * The count omitted is stated in the brief. A sample presented as a corpus would invite exactly the
 * over-generalisation this whole product exists to refuse.
 */
const CARDS_PER_COHORT = 12;

/**
 * The evidence the brief carries: the first N of each measure at each geography level.
 *
 * "First" is meaningful rather than arbitrary — the corpus arrives ordered by the link policy,
 * newest period first — and taking a prefix keeps that order, keeps the choice deterministic, and
 * keeps two runs of the same area identical.
 *
 * Exported because the citation index must select identically. `ev3` has to mean the same
 * observation in both, and two separate filters would drift.
 */
export function selectBriefEvidence(
  input: readonly BriefEvidenceInput[],
): readonly BriefEvidenceInput[] {
  const kept: BriefEvidenceInput[] = [];
  const seen = new Map<string, number>();
  for (const item of input) {
    const cohort = `${item.measure_name_th}|${item.geography_level}`;
    const count = seen.get(cohort) ?? 0;
    if (count < CARDS_PER_COHORT) {
      kept.push(item);
    }
    seen.set(cohort, count + 1);
  }
  return kept;
}

/** How many figures each cohort actually holds, so the brief can say what it left out. */
function cohortTotals(input: readonly BriefEvidenceInput[]): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const item of input) {
    const cohort = `${item.measure_name_th}|${item.geography_level}`;
    totals.set(cohort, (totals.get(cohort) ?? 0) + 1);
  }
  return totals;
}

export interface BuildBriefInput {
  readonly target_th: string;
  readonly effective_on: string;
  readonly output_scope: OpportunityBrief["output_scope"];
  readonly evidence: readonly BriefEvidenceInput[];
  /** Screens the pack cannot perform for this target, stated so the model does not assume them away. */
  readonly critical_gaps_th: readonly string[];
  readonly allowed_activity_ids?: readonly ActivityId[];
  readonly allowed_building_types_th?: readonly BuildingTypeTh[];
}

/** "แสดง 12 จาก 597 รายการ", once per truncated cohort, and nothing at all when none was cut. */
function sampleNote(
  item: BriefEvidenceInput,
  totals: ReadonlyMap<string, number>,
  announced: Set<string>,
): string {
  const cohort = `${item.measure_name_th}|${item.geography_level}`;
  const total = totals.get(cohort) ?? 0;
  if (total <= CARDS_PER_COHORT || announced.has(cohort)) {
    return "";
  }
  announced.add(cohort);
  return `แสดงเป็นตัวอย่าง ${CARDS_PER_COHORT} จาก ${total} รายการของชุดข้อมูลนี้ในระดับพื้นที่เดียวกัน`;
}

export function buildOpportunityBrief(input: BuildBriefInput): OpportunityBrief {
  const totals = cohortTotals(input.evidence);
  const announced = new Set<string>();
  const evidence_cards: EvidenceCard[] = selectBriefEvidence(input.evidence).map((item, index) => ({
    // Stable per-brief citation key. The observation id never leaves the server: the model cites
    // positions in what it was given, so an invented citation cannot resolve to a real row.
    evidence_id: `ev${index + 1}`,
    measure_th: item.measure_name_th,
    population_th: item.population_th,
    value: item.value,
    unit_th: item.unit_name_th,
    area_th: item.area_name_th,
    geography_level_th: LEVEL_TH[item.geography_level],
    period_th: `พ.ศ. ${item.source_vintage}`,
    caveat_th: [
      item.geography_match === "CONTAINING_AREA"
        ? "เป็นข้อมูลของพื้นที่ที่ครอบคลุมพื้นที่เป้าหมาย ไม่ใช่ข้อมูลของพื้นที่เป้าหมายโดยตรง"
        : "",
      // Said once per cohort, on the first card of it: a sample the model believes is the whole
      // corpus is a sample it will over-generalise from.
      sampleNote(item, totals, announced),
      item.source_note_th ?? "",
      item.must_not_become_th,
    ]
      .filter((part) => part !== "")
      .join(" · "),
  }));

  return {
    schema_version: "1.0.0",
    locale: "th-TH",
    target_th: input.target_th,
    effective_on: input.effective_on,
    output_scope: input.output_scope,
    evidence_cards,
    critical_gaps_th: input.critical_gaps_th,
    allowed_activity_ids: input.allowed_activity_ids ?? ACTIVITY_IDS,
    allowed_building_types_th: input.allowed_building_types_th ?? BUILDING_TYPES_TH,
  };
}

/** Maps a brief's citation keys back to the observations they stand for, server-side only. */
export function briefCitationIndex(
  input: readonly BriefEvidenceInput[],
): ReadonlyMap<string, string> {
  // The same selection the brief made. A citation key numbers a position in what the model was
  // given, so an index built over the full corpus would resolve ev3 to a row the model never saw.
  return new Map(
    selectBriefEvidence(input).map((item, index) => [`ev${index + 1}`, item.observation_id]),
  );
}
