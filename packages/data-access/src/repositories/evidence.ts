import type { EvidenceLinkDraft, StoredObservation } from "@reis/contracts";
import type { Kysely } from "kysely";
import type { Database } from "../schema.js";

/**
 * Evidence reads and run-scoped link writes (docs/data-architecture.md §4-5).
 *
 * Every read here is an indexed lookup keyed on area + measure + effective status; the application
 * never filters the corpus in TypeScript (docs/database-design.md §5).
 */

/** Requirement a run needs evidence for, and the measure that can speak to it. */
export interface EvidenceRequest {
  readonly measureId: string;
  /** The run's own area chain, coarsest first — evidence is accepted from any level that covers it. */
  readonly areaIds: readonly string[];
}

/**
 * Loads the standing observations for a measure across the target's area chain.
 *
 * Only products whose activation state is ACTIVE contribute. That state lives in the database with
 * an approval record behind it (docs/implementation-plan.md §4), so an unreviewed source cannot
 * reach an analysis even if its data has already been ingested.
 */
export async function loadActiveObservations(
  db: Kysely<Database>,
  request: EvidenceRequest,
): Promise<StoredObservation[]> {
  const rows = await db
    .selectFrom("evidence.observation as o")
    .innerJoin("evidence.observation_value as v", "v.observation_id", "o.id")
    .innerJoin("source.product_version as pv", "pv.id", "o.source_product_version_id")
    .innerJoin("source.source_product as p", "p.id", "pv.source_product_id")
    .innerJoin("reference.administrative_area as a", "a.id", "o.admin_area_id")
    .innerJoin("reference.measure_definition as m", (join) =>
      join.onRef("m.measure_id", "=", "o.measure_id").onRef("m.unit_code", "=", "v.unit_code"),
    )
    .innerJoin("reference.unit as u", "u.code", "v.unit_code")
    .select([
      "o.id as observation_id",
      "o.measure_id",
      "o.population_th",
      "o.geography_level",
      "a.name_th as area_name_th",
      "o.period_start_year",
      "o.period_end_year",
      "o.source_vintage",
      "o.epistemic_status",
      "o.reliability",
      "o.completeness",
      "o.source_note_th",
      "v.value_scalar",
      "v.value_low",
      "v.value_high",
      "v.unit_code",
      "u.name_th as unit_name_th",
      "v.statistic",
      "m.name_th as measure_name_th",
      "p.title_th as source_title_th",
      "p.attribution_th",
      "p.must_not_become_th",
    ])
    .where("o.measure_id", "=", request.measureId)
    .where("o.is_current", "=", true)
    .where("o.admin_area_id", "in", request.areaIds)
    .where("p.activation_state", "=", "ACTIVE")
    // Rights are checked at read time, not only at ingestion: a licence that no longer permits
    // display must stop the figure from reaching a screen.
    .where("p.may_display", "=", true)
    .execute();

  return rows.flatMap((row) => {
    // A figure with neither a scalar nor a pair of bounds is a parse defect, not a zero. Skip it
    // rather than invent a number; the caller reports the requirement as unresolved.
    if (row.value_scalar === null && (row.value_low === null || row.value_high === null)) {
      return [];
    }
    return [{ ...row, value: row.value_scalar } as StoredObservation];
  });
}

export interface StoredEvidenceLink extends EvidenceLinkDraft {
  readonly observation: StoredObservation;
}

/** Writes a run's links. Idempotent per (run, observation, requirement) so a retry cannot duplicate. */
export async function saveEvidenceLinks(
  db: Kysely<Database>,
  runId: string,
  targetAreaId: string,
  targetKind: "RUN_TARGET_AREA" | "RUN_TARGET_PROPERTY",
  drafts: readonly EvidenceLinkDraft[],
): Promise<number> {
  if (drafts.length === 0) {
    return 0;
  }
  const inserted = await db
    .insertInto("evidence.evidence_link")
    .values(
      drafts.map((draft) => ({
        run_id: runId,
        observation_id: draft.observation_id,
        target_kind: targetKind,
        target_admin_area_id: targetAreaId,
        requirement_id: draft.requirement_id,
        purpose_th: draft.purpose_th,
        role: draft.role,
        subject_match: draft.subject_match,
        geography_match: draft.geography_match,
        temporal_match: draft.temporal_match,
        property_similarity: draft.property_similarity,
        purpose_fitness: draft.purpose_fitness,
        requested_level: draft.requested_level,
        actual_level: draft.actual_level,
        adjustment_method: null,
        adjustment_version: null,
        substitution_reason: draft.substitution_reason,
        decision_impact: draft.decision_impact,
        disclosure_th: draft.disclosure_th,
      })),
    )
    .onConflict((oc) => oc.columns(["run_id", "observation_id", "requirement_id"]).doNothing())
    .returning("id")
    .execute();
  return inserted.length;
}

/** Reads back one run's evidence, joined to the observations it points at. */
export async function loadRunEvidence(
  db: Kysely<Database>,
  runId: string,
): Promise<StoredEvidenceLink[]> {
  const rows = await db
    .selectFrom("evidence.evidence_link as l")
    .innerJoin("evidence.observation as o", "o.id", "l.observation_id")
    .innerJoin("evidence.observation_value as v", "v.observation_id", "o.id")
    .innerJoin("source.product_version as pv", "pv.id", "o.source_product_version_id")
    .innerJoin("source.source_product as p", "p.id", "pv.source_product_id")
    .innerJoin("reference.administrative_area as a", "a.id", "o.admin_area_id")
    .innerJoin("reference.measure_definition as m", (join) =>
      join.onRef("m.measure_id", "=", "o.measure_id").onRef("m.unit_code", "=", "v.unit_code"),
    )
    .innerJoin("reference.unit as u", "u.code", "v.unit_code")
    .select([
      "l.observation_id",
      "l.requirement_id",
      "l.purpose_th",
      "l.role",
      "l.subject_match",
      "l.geography_match",
      "l.temporal_match",
      "l.property_similarity",
      "l.purpose_fitness",
      "l.requested_level",
      "l.actual_level",
      "l.substitution_reason",
      "l.decision_impact",
      "l.disclosure_th",
      "o.measure_id",
      "o.population_th",
      "o.geography_level",
      "a.name_th as area_name_th",
      "o.period_start_year",
      "o.period_end_year",
      "o.source_vintage",
      "o.epistemic_status",
      "o.reliability",
      "o.completeness",
      "o.source_note_th",
      "v.value_scalar",
      "v.value_low",
      "v.value_high",
      "v.unit_code",
      "u.name_th as unit_name_th",
      "v.statistic",
      "m.name_th as measure_name_th",
      "p.title_th as source_title_th",
      "p.attribution_th",
      "p.must_not_become_th",
    ])
    .where("l.run_id", "=", runId)
    .orderBy("o.period_end_year", "desc")
    .orderBy("o.population_th", "asc")
    .execute();

  return rows.flatMap((row) => {
    if (row.value_scalar === null && (row.value_low === null || row.value_high === null)) {
      return [];
    }
    const { value_scalar, ...rest } = row;
    return [
      {
        ...(rest as unknown as EvidenceLinkDraft),
        observation: { ...rest, value: value_scalar } as unknown as StoredObservation,
      },
    ];
  });
}

export interface ActiveSourceSummary {
  readonly product_id: string;
  readonly title_th: string;
  readonly attribution_th: string;
  readonly coverage_note_th: string;
}

/** The sources currently permitted to contribute, for the operator-facing honesty of a run report. */
export async function listActiveSources(db: Kysely<Database>): Promise<ActiveSourceSummary[]> {
  return db
    .selectFrom("source.source_product")
    .select(["product_id", "title_th", "attribution_th", "coverage_note_th"])
    .where("activation_state", "=", "ACTIVE")
    .orderBy("product_id")
    .execute();
}
