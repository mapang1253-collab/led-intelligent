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

export function buildOpportunityBrief(input: BuildBriefInput): OpportunityBrief {
  const evidence_cards: EvidenceCard[] = input.evidence.map((item, index) => ({
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
  return new Map(input.map((item, index) => [`ev${index + 1}`, item.observation_id]));
}
