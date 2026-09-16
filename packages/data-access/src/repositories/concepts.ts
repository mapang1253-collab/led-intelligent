import type {
  CandidateSearchRecord,
  FinalAnalysis,
  LegalValidationResult,
  PotentialUseConcept,
} from "@reis/contracts";
import type { Db } from "../connection.js";

/**
 * Run-scoped concept and validation artifacts (docs/analysis-architecture.md §5).
 *
 * Written once per run and read back on every poll, so a progress screen never re-invokes the
 * model. The raw provider response is never stored — only the concepts that passed validation, and
 * the record of what was rejected and why.
 */

export interface SavedConceptSet {
  readonly record: CandidateSearchRecord | null;
  readonly failure_code: string | null;
  readonly concepts: readonly PotentialUseConcept[];
  readonly validations: readonly LegalValidationResult[];
  readonly final: FinalAnalysis | null;
}

export async function saveConceptSet(
  db: Db,
  runId: string,
  input: {
    readonly record: CandidateSearchRecord | null;
    readonly failureCode: string | null;
    readonly concepts: readonly PotentialUseConcept[];
    readonly validations: readonly LegalValidationResult[];
    readonly final: FinalAnalysis | null;
  },
): Promise<void> {
  if (input.record) {
    await db
      .insertInto("analysis.candidate_search_record")
      .values({
        run_id: runId,
        mode: input.record.mode,
        model: input.record.model,
        calls_made: input.record.calls_made,
        repair_attempted: input.record.repair_attempted,
        stop_reason: input.record.stop_reason,
        duplicates_merged: input.record.duplicates_merged,
        rejected: JSON.stringify(input.record.rejected_concepts),
        failure_code: input.failureCode,
      })
      // A run writes this once; a retry must not duplicate or silently overwrite the first account.
      .onConflict((oc) => oc.column("run_id").doNothing())
      .execute();
  }

  if (input.concepts.length > 0) {
    await db
      .insertInto("analysis.potential_use_concept")
      .values(
        input.concepts.map((concept) => ({
          run_id: runId,
          concept_id: concept.concept_id,
          label_th: concept.label_th,
          concept: JSON.stringify(concept),
        })),
      )
      .onConflict((oc) => oc.columns(["run_id", "concept_id"]).doNothing())
      .execute();
  }

  if (input.validations.length > 0) {
    await db
      .insertInto("analysis.validation_result")
      .values(
        input.validations.map((validation) => ({
          run_id: runId,
          concept_id: validation.concept_id,
          domain: "LEGAL" as const,
          status: validation.status,
          pack_id: validation.pack_id,
          pack_version: validation.pack_version,
          validator_version: validation.validator_version,
          result: JSON.stringify(validation),
        })),
      )
      .onConflict((oc) => oc.columns(["run_id", "concept_id", "domain"]).doNothing())
      .execute();
  }

  if (input.final) {
    await saveFinal(db, runId, input.final);
  }
}

async function saveFinal(db: Db, runId: string, final: FinalAnalysis): Promise<void> {
  await db
    .insertInto("analysis.final_result")
    .values({
      run_id: runId,
      status: final.status,
      status_reason: final.status_reason,
      output_scope: final.output_scope,
      output_policy_version: final.output_policy_version,
      analysis: JSON.stringify(final),
    })
    .onConflict((oc) => oc.column("run_id").doNothing())
    .execute();
}

export async function loadConceptSet(db: Db, runId: string): Promise<SavedConceptSet> {
  const [recordRow, conceptRows, validationRows, finalRow] = await Promise.all([
    db
      .selectFrom("analysis.candidate_search_record")
      .selectAll()
      .where("run_id", "=", runId)
      .executeTakeFirst(),
    db
      .selectFrom("analysis.potential_use_concept")
      .select(["concept"])
      .where("run_id", "=", runId)
      .orderBy("concept_id")
      .execute(),
    db
      .selectFrom("analysis.validation_result")
      .select(["result"])
      .where("run_id", "=", runId)
      .where("domain", "=", "LEGAL")
      .orderBy("concept_id")
      .execute(),
    db
      .selectFrom("analysis.final_result")
      .select(["analysis"])
      .where("run_id", "=", runId)
      .executeTakeFirst(),
  ]);

  return {
    record: recordRow
      ? {
          mode: recordRow.mode,
          model: recordRow.model,
          calls_made: recordRow.calls_made,
          repair_attempted: recordRow.repair_attempted,
          stop_reason: recordRow.stop_reason,
          duplicates_merged: recordRow.duplicates_merged,
          rejected_concepts: recordRow.rejected as CandidateSearchRecord["rejected_concepts"],
        }
      : null,
    failure_code: recordRow?.failure_code ?? null,
    concepts: conceptRows.map((row) => row.concept as PotentialUseConcept),
    validations: validationRows.map((row) => row.result as LegalValidationResult),
    final: (finalRow?.analysis as FinalAnalysis | undefined) ?? null,
  };
}
