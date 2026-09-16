import type {
  EvidenceLinkDraft,
  GeographyMatch,
  OutputScope,
  PurposeFitness,
  StoredObservation,
  SubjectMatch,
  TemporalMatch,
} from "@reis/contracts";

/**
 * Deterministic evidence-fitness policy (docs/data-architecture.md §5-6).
 *
 * Every judgement here is a rule over recorded fields — never a model, never a weighted confidence
 * score. Two invariants it exists to enforce:
 *
 *   * Evidence about a containing area answers a question about a place *inside* it only as
 *     context. Geographic proximity is not similarity, so the link is a labelled downgrade with a
 *     substitution reason, not a promotion.
 *   * The disclosure text is generated from the observation's own fields and the source's declared
 *     limits, so the reader is told what the figure is and what it must not be used for in the same
 *     breath as the number.
 */

export const HOUSEHOLD_INCOME_REQUIREMENT = "demand.household_income_context";

const AREA_LEVEL_RANK = { PROVINCE: 1, DISTRICT: 2, SUBDISTRICT: 3 } as const;

export interface LinkTarget {
  readonly province_name_th: string;
  readonly district_name_th: string;
  readonly subdistrict_name_th: string;
  /** Finest level the intake actually identified; today an intake always resolves to a subdistrict. */
  readonly level: "PROVINCE" | "DISTRICT" | "SUBDISTRICT";
  readonly requested_scope: OutputScope;
}

/**
 * Coarser-than-target evidence is CONTAINING_AREA, never EXACT. The engine has no boundary geometry
 * yet, so a same-level observation from a *different* area cannot be distinguished here; callers
 * pass only observations already selected for this target's own hierarchy.
 */
function geographyMatchFor(observation: StoredObservation, target: LinkTarget): GeographyMatch {
  const observationRank = AREA_LEVEL_RANK[observation.geography_level];
  const targetRank = AREA_LEVEL_RANK[target.level];
  if (observationRank === targetRank) {
    return "EXACT";
  }
  return observationRank < targetRank ? "CONTAINING_AREA" : "NEIGHBOURING";
}

/**
 * Temporal fitness of a published period, measured against the year the run happens in. A survey
 * published for a period that ended years ago is DATED — stated, not silently tolerated.
 */
export function temporalMatchFor(periodEndYear: number, currentYear: number): TemporalMatch {
  const age = currentYear - periodEndYear;
  if (!Number.isFinite(age)) {
    return "UNKNOWN";
  }
  if (age <= 1) {
    return "CURRENT";
  }
  if (age <= 3) {
    return "RECENT";
  }
  return "DATED";
}

function subjectMatchFor(geography: GeographyMatch): SubjectMatch {
  // The subject of a household-income figure is a surveyed cohort, never the analysed site. Even at
  // an exact geographic match the identity is a partial one.
  return geography === "EXACT" ? "PARTIAL" : "PROXY";
}

function purposeFitnessFor(geography: GeographyMatch): PurposeFitness {
  // A sample survey of household income can characterise demand context. It can never, at any
  // geography, establish what a particular site is worth — so FIT is unreachable here by design.
  return geography === "EXACT" ? "FIT_WITH_CAVEAT" : "CONTEXT_ONLY";
}

function targetNameFor(target: LinkTarget): string {
  if (target.level === "PROVINCE") {
    return `จ.${target.province_name_th}`;
  }
  if (target.level === "DISTRICT") {
    return `อ.${target.district_name_th} จ.${target.province_name_th}`;
  }
  return `ต.${target.subdistrict_name_th} อ.${target.district_name_th} จ.${target.province_name_th}`;
}

/** Thai Buddhist Era is 543 years ahead of the Common Era. */
const BE_CE_OFFSET = 543;

function disclosureFor(
  observation: StoredObservation,
  target: LinkTarget,
  geography: GeographyMatch,
  temporal: TemporalMatch,
): string {
  const parts: string[] = [];
  parts.push(
    `${observation.measure_name_th} ของกลุ่ม "${observation.population_th}" ` +
      `ระดับ${observation.geography_level === "PROVINCE" ? "จังหวัด" : observation.geography_level === "DISTRICT" ? "อำเภอ" : "ตำบล"}` +
      ` (${observation.area_name_th}) ปี ${observation.source_vintage}`,
  );

  if (geography === "CONTAINING_AREA") {
    parts.push(`ไม่ใช่ข้อมูลของ${targetNameFor(target)}โดยตรง แต่เป็นข้อมูลของพื้นที่ที่ครอบคลุมพื้นที่เป้าหมายอยู่`);
  }
  if (temporal === "DATED") {
    parts.push(`ข้อมูลรอบล่าสุดที่เผยแพร่คือปี ${observation.source_vintage} ซึ่งห่างจากปัจจุบันเกิน 3 ปี`);
  }
  if (observation.source_note_th) {
    parts.push(`หมายเหตุจากแหล่งข้อมูล: ${observation.source_note_th}`);
  }
  // The source's own declared limits travel with every figure it produces.
  parts.push(`ข้อจำกัด: ${observation.must_not_become_th}`);
  parts.push(observation.attribution_th);
  return parts.join(" · ");
}

/**
 * Builds the links for one target from the observations selected for it.
 *
 * Ordering is deterministic — newest period first, then cohort name — so two runs over the same
 * corpus present evidence in the same order.
 */
export function buildHouseholdIncomeLinks(
  observations: readonly StoredObservation[],
  target: LinkTarget,
  currentYear: number,
): EvidenceLinkDraft[] {
  const ordered = [...observations].sort(
    (a, b) =>
      b.period_end_year - a.period_end_year || a.population_th.localeCompare(b.population_th, "th"),
  );

  return ordered.map((observation) => {
    const geography = geographyMatchFor(observation, target);
    const temporal = temporalMatchFor(observation.period_end_year, currentYear);
    return {
      observation_id: observation.observation_id,
      requirement_id: HOUSEHOLD_INCOME_REQUIREMENT,
      purpose_th: "บริบทรายได้ครัวเรือนของพื้นที่ สำหรับประกอบการพิจารณาด้านดีมานด์",
      // Context, never primary evidence: nothing in an HBU conclusion may rest on this alone.
      role: "CONTEXTUAL",
      subject_match: subjectMatchFor(geography),
      geography_match: geography,
      temporal_match: temporal,
      property_similarity: "NOT_APPLICABLE",
      purpose_fitness: purposeFitnessFor(geography),
      requested_level: target.requested_scope,
      // Area evidence stays area evidence however the intake was framed.
      actual_level: "AREA",
      substitution_reason:
        geography === "CONTAINING_AREA"
          ? "ไม่มีข้อมูลรายได้ครัวเรือนที่เผยแพร่ในระดับพื้นที่เป้าหมาย จึงใช้ข้อมูลของพื้นที่ที่ครอบคลุมแทน"
          : null,
      decision_impact: "CONTEXT",
      disclosure_th: disclosureFor(observation, target, geography, temporal),
    };
  });
}

export { BE_CE_OFFSET };
