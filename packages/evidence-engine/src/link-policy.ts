import type {
  EvidenceLinkDraft,
  GeographyMatch,
  OutputScope,
  PurposeFitness,
  StoredObservation,
  SubjectMatch,
  TemporalMatch,
} from "@reis/contracts";
import { areaLabelTh, areaLevelNounTh } from "@reis/domain";

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

/**
 * An analytical question, and what kind of subject can answer it.
 *
 * `subject_kind` is the distinction that stops two very different figures from being graded alike:
 * a registered-population count *is* a statement about the area, while a household-income mean is a
 * statement about a cohort that lives in it. At an exact geographic match the first identifies its
 * subject exactly and the second still only partially.
 */
export interface EvidenceRequirement {
  readonly requirement_id: string;
  readonly purpose_th: string;
  readonly subject_kind: "AREA_ITSELF" | "COHORT_WITHIN_AREA";
}

export const HOUSEHOLD_INCOME_REQUIREMENT: EvidenceRequirement = {
  requirement_id: "demand.household_income_context",
  purpose_th: "บริบทรายได้ครัวเรือนของพื้นที่ สำหรับประกอบการพิจารณาด้านดีมานด์",
  subject_kind: "COHORT_WITHIN_AREA",
};

export const POPULATION_REQUIREMENT: EvidenceRequirement = {
  requirement_id: "demand.resident_population",
  purpose_th: "ขนาดประชากรในพื้นที่ สำหรับประกอบการพิจารณาด้านดีมานด์",
  subject_kind: "AREA_ITSELF",
};

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

function subjectMatchFor(
  geography: GeographyMatch,
  requirement: EvidenceRequirement,
): SubjectMatch {
  if (geography !== "EXACT") {
    // A figure about a different area is a proxy for this one, however close the areas are.
    return "PROXY";
  }
  // A cohort statistic never identifies the analysed area itself, even at the same geography.
  return requirement.subject_kind === "AREA_ITSELF" ? "EXACT" : "PARTIAL";
}

function purposeFitnessFor(geography: GeographyMatch): PurposeFitness {
  // Published area statistics can characterise demand context. None of them can, at any geography,
  // establish what a particular site is worth — so FIT stays unreachable here by design.
  return geography === "EXACT" ? "FIT_WITH_CAVEAT" : "CONTEXT_ONLY";
}

function targetNameFor(target: LinkTarget): string {
  const province = target.province_name_th;
  if (target.level === "PROVINCE") {
    return areaLabelTh("PROVINCE", province, province);
  }
  const district = areaLabelTh("DISTRICT", target.district_name_th, province);
  if (target.level === "DISTRICT") {
    return `${district} ${areaLabelTh("PROVINCE", province, province)}`;
  }
  return [
    areaLabelTh("SUBDISTRICT", target.subdistrict_name_th, province),
    district,
    areaLabelTh("PROVINCE", province, province),
  ].join(" ");
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
      `ระดับ${areaLevelNounTh(observation.geography_level, target.province_name_th)}` +
      ` (${observation.area_name_th}) ปี ${observation.source_vintage}`,
  );

  // A computed figure must never read as one the source printed.
  if (observation.epistemic_status === "DERIVED") {
    parts.push("เป็นค่าที่คำนวณจากข้อมูลย่อยที่แหล่งข้อมูลเผยแพร่ ไม่ใช่ตัวเลขที่แหล่งข้อมูลประกาศโดยตรง");
  }

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
export function buildEvidenceLinks(
  observations: readonly StoredObservation[],
  target: LinkTarget,
  currentYear: number,
  requirement: EvidenceRequirement,
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
      requirement_id: requirement.requirement_id,
      purpose_th: requirement.purpose_th,
      // Context, never primary evidence: nothing in an HBU conclusion may rest on this alone while
      // the validation stages are inactive.
      role: "CONTEXTUAL",
      subject_match: subjectMatchFor(geography, requirement),
      geography_match: geography,
      temporal_match: temporal,
      property_similarity: "NOT_APPLICABLE",
      purpose_fitness: purposeFitnessFor(geography),
      requested_level: target.requested_scope,
      // Area evidence stays area evidence however the intake was framed.
      actual_level: "AREA",
      substitution_reason:
        geography === "CONTAINING_AREA"
          ? `ไม่มีข้อมูล${observation.measure_name_th}ที่เผยแพร่ในระดับพื้นที่เป้าหมาย จึงใช้ข้อมูลของพื้นที่ที่ครอบคลุมแทน`
          : null,
      decision_impact: "CONTEXT",
      disclosure_th: disclosureFor(observation, target, geography, temporal),
    };
  });
}

/** Kept for callers that only need the household-income question. */
export function buildHouseholdIncomeLinks(
  observations: readonly StoredObservation[],
  target: LinkTarget,
  currentYear: number,
): EvidenceLinkDraft[] {
  return buildEvidenceLinks(observations, target, currentYear, HOUSEHOLD_INCOME_REQUIREMENT);
}

export { BE_CE_OFFSET };
