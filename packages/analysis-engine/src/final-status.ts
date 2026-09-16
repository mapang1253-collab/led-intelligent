import type {
  CandidateSearchRecord,
  FinalAnalysis,
  FinalStatus,
  FinalStatusReason,
  LegalValidationResult,
  PotentialUseConcept,
} from "@reis/contracts";
import { type VerificationInput, renderFinalAnalysis } from "./output-policy.js";

/**
 * Final status decision (docs/analysis-architecture.md §9).
 *
 * The order is fixed by the architecture and implemented in that order here. The part that matters
 * most is what it refuses to do: with no economic components activated there is no supported
 * common basis on which to compare concepts, so no leading use may be named however good one of
 * them looks. That is INSUFFICIENT_EVIDENCE — an analytical outcome, not a failure — and it is
 * reported with what is missing rather than as an error.
 *
 * Operational completion is separate from this. A run that never produced a candidate set does not
 * get one of the three analytical statuses at all; the caller reports the operational failure.
 */

export interface FinalStatusInput {
  readonly analysed_on: string;
  readonly output_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  readonly search: CandidateSearchRecord | null;
  readonly concepts: readonly PotentialUseConcept[];
  readonly legal: readonly LegalValidationResult[];
  /** Whether any activated, reviewed economic component exists. False in this increment. */
  readonly economic_components_available: boolean;
  readonly verification: VerificationInput;
}

export type FinalStatusOutcome =
  | { readonly kind: "ANALYSIS"; readonly final: FinalAnalysis }
  /** No candidate set was ever produced: an operational state, not an analytical verdict. */
  | { readonly kind: "OPERATIONAL_FAILURE"; readonly reason: string };

function decide(input: FinalStatusInput): {
  status: FinalStatus;
  reason: FinalStatusReason;
  missing: string[];
} {
  const missing: string[] = [];

  // Step 4: no supported common-basis comparison for the claimed scope.
  if (!input.economic_components_available) {
    missing.push("องค์ประกอบทางเศรษฐศาสตร์ที่ผ่านการตรวจทาน สำหรับคำนวณความเป็นไปได้ทางการเงินของแต่ละแนวคิด");
  }

  const everyConceptUnresolved = input.legal.every(
    (result) => result.status === "UNKNOWN" || result.status === "PARTIAL",
  );
  if (input.legal.length > 0 && everyConceptUnresolved) {
    missing.push("ผลตรวจข้อกำหนดที่สรุปได้ครบถ้วนสำหรับแต่ละแนวคิด");
  }
  if (input.legal.length === 0) {
    missing.push("ผลตรวจข้อกำหนดตามกฎหมายของแต่ละแนวคิด");
  }

  if (!input.economic_components_available || missing.length > 0) {
    return { status: "INSUFFICIENT_EVIDENCE", reason: "NO_SUPPORTED_COMMON_BASIS", missing };
  }

  // Step 5: supported candidates exist but the search was cut short.
  if (input.search?.stop_reason === "RESOURCE_TRUNCATED") {
    return { status: "INCONCLUSIVE", reason: "SEARCH_TRUNCATED", missing };
  }

  // Dominance analysis needs the comparison stage, which is not built; until it is, the honest
  // answer is that dominance has not been established.
  return { status: "INCONCLUSIVE", reason: "DOMINANCE_REVERSIBLE", missing };
}

export function decideFinalStatus(input: FinalStatusInput): FinalStatusOutcome {
  // Step 2: a completed or explicitly truncated search record is required before any verdict.
  if (input.search === null) {
    return { kind: "OPERATIONAL_FAILURE", reason: "NO_CANDIDATE_SEARCH_RECORD" };
  }
  if (input.search.stop_reason === "AI_FAILURE" && input.concepts.length === 0) {
    // AI failure with zero concepts stays operational; it must not become an analytical status.
    return { kind: "OPERATIONAL_FAILURE", reason: "AI_FAILURE" };
  }

  if (input.concepts.length === 0) {
    // A completed search that defensibly produced nothing is an analytical limit, and says so
    // without asserting that the land has no possible use.
    return {
      kind: "ANALYSIS",
      final: renderFinalAnalysis({
        analysed_on: input.analysed_on,
        output_scope: input.output_scope,
        status: "INSUFFICIENT_EVIDENCE",
        status_reason: "NO_DEFENSIBLE_CONCEPTS_GENERATED",
        missing_basis_th: ["แนวคิดการใช้ประโยชน์ที่หลักฐานปัจจุบันรองรับได้"],
        evaluated_concepts_th: [],
        verification: input.verification,
      }),
    };
  }

  const { status, reason, missing } = decide(input);
  return {
    kind: "ANALYSIS",
    final: renderFinalAnalysis({
      analysed_on: input.analysed_on,
      output_scope: input.output_scope,
      status,
      status_reason: reason,
      missing_basis_th: missing,
      // Listed in the order they were proposed, never ranked: an order would imply a comparison
      // that has not been made.
      evaluated_concepts_th: input.concepts.map((concept) => concept.label_th),
      verification: input.verification,
    }),
  };
}
