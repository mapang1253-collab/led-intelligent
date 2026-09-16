import {
  type AnalysisRunRow,
  type Db,
  type StoredEvidenceLink,
  listActiveSources,
  loadActiveObservations,
  loadRunAreaNames,
  saveEvidenceLinks,
} from "@reis/data-access";
import { HOUSEHOLD_INCOME_REQUIREMENT, buildHouseholdIncomeLinks } from "@reis/evidence-engine";

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

const MEASURE_HOUSEHOLD_INCOME = "household_income_monthly_mean";

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

  const observations = await loadActiveObservations(db, {
    measureId: MEASURE_HOUSEHOLD_INCOME,
    areaIds: areaChain(run),
  });
  if (observations.length === 0) {
    // An activated source that publishes nothing for this area is a coverage gap, never a zero.
    return { state: "DEGRADED", reason: "NO_EVIDENCE_FOR_AREA", linkCount: 0 };
  }

  const areas = await loadRunAreaNames(db, run);
  const links = buildHouseholdIncomeLinks(
    observations,
    {
      province_name_th: areas.province,
      district_name_th: areas.district,
      subdistrict_name_th: areas.subdistrict,
      level: "SUBDISTRICT",
      requested_scope: run.requested_scope,
    },
    now.getUTCFullYear(),
  );

  const written = await saveEvidenceLinks(
    db,
    run.run_id,
    run.subdistrict_id,
    "RUN_TARGET_AREA",
    links,
  );
  return { state: "SUCCEEDED", linkCount: written };
}

export interface EvidenceGroup {
  readonly requirement_id: string;
  readonly measure_name_th: string;
  readonly source_title_th: string;
  readonly attribution_th: string;
  readonly geography_note_th: string;
  readonly purpose_fitness: string;
  readonly items: readonly {
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
 * Shapes a run's stored links for presentation, grouped by requirement. The grouping is a display
 * concern only — each item keeps its own disclosure, so no caveat is lost when figures sit together.
 */
export function groupEvidenceForDisplay(links: readonly StoredEvidenceLink[]): EvidenceGroup[] {
  const byRequirement = new Map<string, StoredEvidenceLink[]>();
  for (const link of links) {
    const bucket = byRequirement.get(link.requirement_id);
    if (bucket) {
      bucket.push(link);
    } else {
      byRequirement.set(link.requirement_id, [link]);
    }
  }

  return [...byRequirement.entries()].map(([requirementId, group]) => {
    const first = group[0] as StoredEvidenceLink;
    return {
      requirement_id: requirementId,
      measure_name_th: first.observation.measure_name_th,
      source_title_th: first.observation.source_title_th,
      attribution_th: first.observation.attribution_th,
      geography_note_th:
        first.geography_match === "CONTAINING_AREA"
          ? `ข้อมูลระดับ${first.observation.geography_level === "PROVINCE" ? "จังหวัด" : "อำเภอ"} (${first.observation.area_name_th}) ครอบคลุมพื้นที่เป้าหมาย ไม่ใช่ข้อมูลเฉพาะพื้นที่เป้าหมาย`
          : `ข้อมูลตรงระดับพื้นที่เป้าหมาย (${first.observation.area_name_th})`,
      purpose_fitness: first.purpose_fitness,
      items: group.map((link) => ({
        population_th: link.observation.population_th,
        value: link.observation.value,
        unit_name_th: link.observation.unit_name_th,
        period_th: `พ.ศ. ${link.observation.source_vintage}`,
        source_note_th: link.observation.source_note_th,
        temporal_match: link.temporal_match,
        disclosure_th: link.disclosure_th,
      })),
    };
  });
}

export { HOUSEHOLD_INCOME_REQUIREMENT, MEASURE_HOUSEHOLD_INCOME };
