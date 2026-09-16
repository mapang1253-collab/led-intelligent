import {
  type AnalysisRunRow,
  type Db,
  type StoredEvidenceLink,
  listActiveSources,
  loadActiveObservations,
  loadRunAreaNames,
  saveEvidenceLinks,
} from "@reis/data-access";
import { areaLabelTh, areaLevelNounTh } from "@reis/domain";
import {
  CONSTRUCTION_COST_REQUIREMENT,
  type EvidenceRequirement,
  HOUSEHOLD_INCOME_REQUIREMENT,
  POPULATION_REQUIREMENT,
  buildEvidenceLinks,
} from "@reis/evidence-engine";

/**
 * Evidence acquisition for one run (docs/architecture.md §2, docs/data-architecture.md §7).
 *
 * A run does not call NSO, or any other source. Bulk acquisition happens off the interactive path
 * (tools/ingestion/), and this stage does the part that is actually run-specific: select the
 * standing observations that cover the run's target, judge their fitness for the question, and
 * persist the resulting links.
 *
 * The outcome is reported as it happened. "No source is activated yet" and "the corpus has nothing
 * for this area" are different facts and stay different states, because they call for different
 * responses — one is an approval that has not been given, the other is a coverage gap.
 */

/**
 * The questions this increment can gather evidence for, and the measure that speaks to each.
 *
 * A measure with no activated source simply contributes nothing; the stage still reports honestly,
 * because "no source activated" and "activated but no coverage here" are different results.
 */
const REQUIREMENTS: readonly { measureId: string; requirement: EvidenceRequirement }[] = [
  { measureId: "registered_population", requirement: POPULATION_REQUIREMENT },
  { measureId: "household_income_monthly_mean", requirement: HOUSEHOLD_INCOME_REQUIREMENT },
  {
    measureId: "assessed_construction_value_per_sqm",
    requirement: CONSTRUCTION_COST_REQUIREMENT,
  },
];

export type EvidenceStageState = "SUCCEEDED" | "DEGRADED" | "SKIPPED";

export interface EvidenceStageResult {
  readonly state: EvidenceStageState;
  readonly reason?: string;
  readonly linkCount: number;
}

/** Coarsest-first so an observation published at any covering level can be selected. */
function areaChain(run: AnalysisRunRow): string[] {
  return [run.province_id, run.district_id, run.subdistrict_id];
}

export async function runEvidenceAcquisition(
  db: Db,
  run: AnalysisRunRow,
  now: Date = new Date(),
): Promise<EvidenceStageResult> {
  const activeSources = await listActiveSources(db);
  if (activeSources.length === 0) {
    // Nothing has passed its gate yet. The run is not broken; it is honest.
    return { state: "SKIPPED", reason: "SOURCE_NOT_ACTIVATED", linkCount: 0 };
  }

  const areas = await loadRunAreaNames(db, run);
  const target = {
    province_name_th: areas.province,
    district_name_th: areas.district,
    subdistrict_name_th: areas.subdistrict,
    level: "SUBDISTRICT" as const,
    requested_scope: run.requested_scope,
  };

  const drafts = [];
  for (const { measureId, requirement } of REQUIREMENTS) {
    const observations = await loadActiveObservations(db, {
      measureId,
      areaIds: areaChain(run),
    });
    drafts.push(...buildEvidenceLinks(observations, target, now.getUTCFullYear(), requirement));
  }

  if (drafts.length === 0) {
    // Activated sources that publish nothing for this area is a coverage gap, never a zero.
    return { state: "DEGRADED", reason: "NO_EVIDENCE_FOR_AREA", linkCount: 0 };
  }

  const written = await saveEvidenceLinks(
    db,
    run.run_id,
    run.subdistrict_id,
    "RUN_TARGET_AREA",
    drafts,
  );
  return { state: "SUCCEEDED", linkCount: written };
}

export interface EvidenceGroup {
  /** Stable identity for rendering: one requirement, at one geography. */
  readonly group_id: string;
  readonly requirement_id: string;
  readonly measure_name_th: string;
  /** The area these figures actually describe, e.g. "ต.บางปลาสร้อย" — never the run's target. */
  readonly area_label_th: string;
  readonly source_title_th: string;
  readonly attribution_th: string;
  readonly geography_note_th: string;
  readonly purpose_fitness: string;
  readonly items: readonly {
    readonly observation_id: string;
    readonly population_th: string;
    readonly value: string;
    readonly unit_name_th: string;
    readonly period_th: string;
    readonly source_note_th: string | null;
    readonly temporal_match: string;
    readonly disclosure_th: string;
  }[];
}

/**
 * Shapes a run's stored links for presentation.
 *
 * Grouping is by requirement **and geography**, not by requirement alone. A group carries one
 * scope caveat in its header, so two areas inside one group would put a caveat over figures it does
 * not describe — a subdistrict's 11,996 residents listed under the same heading as its province's
 * 1,645,985, with nothing on the rows to tell them apart. Splitting them is what keeps the header
 * true of every row beneath it.
 *
 * Groups are ordered finest geography first, so evidence about the target itself is read before
 * evidence about the area containing it.
 */
const LEVEL_ORDER = { SUBDISTRICT: 0, DISTRICT: 1, PROVINCE: 2 } as const;

/**
 * In Bangkok the level and the area share a name, so "ข้อมูลระดับกรุงเทพมหานคร (กรุงเทพมหานคร)"
 * says it twice. The parenthetical exists to name *which* area of that level, and adds nothing
 * when there is only one.
 */
function geographyNote(match: string, levelNoun: string, areaName: string): string {
  if (match !== "CONTAINING_AREA") {
    return `ข้อมูลตรงระดับพื้นที่เป้าหมาย (${areaName})`;
  }
  const where = levelNoun === areaName ? levelNoun : `${levelNoun} (${areaName})`;
  return `ข้อมูลระดับ${where} ครอบคลุมพื้นที่เป้าหมาย ไม่ใช่ข้อมูลเฉพาะพื้นที่เป้าหมาย`;
}

export function groupEvidenceForDisplay(
  links: readonly StoredEvidenceLink[],
  provinceNameTh: string,
): EvidenceGroup[] {
  const byGroup = new Map<string, StoredEvidenceLink[]>();
  for (const link of links) {
    const key = `${link.requirement_id}|${link.observation.geography_level}|${link.observation.area_name_th}`;
    const bucket = byGroup.get(key);
    if (bucket) {
      bucket.push(link);
    } else {
      byGroup.set(key, [link]);
    }
  }

  return [...byGroup.entries()]
    .map(([groupId, group]) => {
      const first = group[0] as StoredEvidenceLink;
      const level = first.observation.geography_level;
      return {
        group_id: groupId,
        requirement_id: first.requirement_id,
        measure_name_th: first.observation.measure_name_th,
        area_label_th: areaLabelTh(level, first.observation.area_name_th, provinceNameTh),
        source_title_th: first.observation.source_title_th,
        attribution_th: first.observation.attribution_th,
        geography_note_th: geographyNote(
          first.geography_match,
          areaLevelNounTh(level, provinceNameTh),
          first.observation.area_name_th,
        ),
        purpose_fitness: first.purpose_fitness,
        items: group.map((link) => ({
          // The observation is the only value guaranteed unique across areas and periods.
          observation_id: link.observation_id,
          population_th: link.observation.population_th,
          value: link.observation.value,
          unit_name_th: link.observation.unit_name_th,
          period_th: `พ.ศ. ${link.observation.source_vintage}`,
          source_note_th: link.observation.source_note_th,
          temporal_match: link.temporal_match,
          disclosure_th: link.disclosure_th,
        })),
        level_rank: LEVEL_ORDER[level],
      };
    })
    .sort((a, b) => a.level_rank - b.level_rank || a.group_id.localeCompare(b.group_id))
    .map(({ level_rank: _level_rank, ...group }) => group);
}

export { REQUIREMENTS };
