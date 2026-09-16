import type {
  AiFailureCode,
  CandidateSearchRecord,
  ConceptProposalResult,
  ConceptSearchStopReason,
  OpportunityBrief,
} from "@reis/contracts";
import { type ValidationIssue, validateConceptResponse } from "./concept-validation.js";
import { REPAIR_INSTRUCTION_TH, SYSTEM_INSTRUCTION_TH, buildConceptPrompt } from "./prompt.js";

/**
 * Concept proposal (docs/ai-architecture.md §1, §4, §5).
 *
 * The call budget is a hard cap, not a target: one normal call, and at most one repair of a
 * rejected structured response. There is no second opinion, no model hopping and no retry on 429 —
 * a quota failure surfaces as a stable reason code with whatever evidence was already collected.
 *
 * Three modes exist because "we could not ask the model" and "the model was never meant to run
 * here" are different situations, and neither may be answered by inventing concepts.
 */

export const PRIMARY_MODEL = "gemini-3.1-flash-lite" as const;
export const AI_MAX_CALLS_PER_RUN = 2 as const;

export type AiMode = "LIVE_AI" | "RECORDED_AI" | "AI_DISABLED";

/** One model call, abstracted so the gateway can be tested without a provider. */
export interface ModelCall {
  readonly system: string;
  readonly prompt: string;
}

export type ModelResponse =
  | { readonly outcome: "SUCCESS"; readonly text: string }
  | {
      readonly outcome: "FAILED";
      readonly code: Exclude<
        AiFailureCode,
        "AI_OUTPUT_INVALID" | "AI_DISABLED" | "AI_NO_DEFENSIBLE_CONCEPTS"
      >;
      readonly detail: string;
      readonly retryable: boolean;
    };

export type ModelClient = (call: ModelCall) => Promise<ModelResponse>;

export interface ProposeConceptsOptions {
  readonly mode: AiMode;
  readonly brief: OpportunityBrief;
  /** Required for LIVE_AI; ignored otherwise. */
  readonly client?: ModelClient;
  /** Required for RECORDED_AI: a named, versioned fixture. */
  readonly recorded?: { readonly fixture_id: string; readonly text: string };
}

function record(
  mode: AiMode,
  calls: number,
  repair: boolean,
  stop: ConceptSearchStopReason,
  issues: readonly ValidationIssue[],
  duplicates: number,
): CandidateSearchRecord {
  return {
    mode,
    model: mode === "LIVE_AI" ? PRIMARY_MODEL : mode === "RECORDED_AI" ? "fixture" : "none",
    calls_made: calls,
    repair_attempted: repair,
    stop_reason: stop,
    rejected_concepts: issues.map((issue) => ({ reason: issue.reason, detail: issue.detail })),
    duplicates_merged: duplicates,
  };
}

function parseJson(text: string): unknown {
  // Models sometimes wrap JSON in a fenced block even when asked not to; unwrapping that is not
  // repairing content, so it does not consume the repair call.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced?.[1] ?? text;
  return JSON.parse(body);
}

export async function proposeConcepts(
  options: ProposeConceptsOptions,
): Promise<ConceptProposalResult> {
  const { mode, brief } = options;

  if (mode === "AI_DISABLED") {
    // Permitted evidence may still be shown; no new recommendation is created.
    return {
      outcome: "FAILED",
      code: "AI_DISABLED",
      detail: "concept generation is disabled in this deployment",
      retryable: false,
      record: record(mode, 0, false, "AI_FAILURE", [], 0),
    };
  }

  if (mode === "RECORDED_AI") {
    if (!options.recorded) {
      return {
        outcome: "FAILED",
        code: "AI_UNAVAILABLE",
        detail: "RECORDED_AI requires a named fixture",
        retryable: false,
        record: record(mode, 0, false, "AI_FAILURE", [], 0),
      };
    }
    return accept(mode, options.recorded.text, brief, 0, false);
  }

  const client = options.client;
  if (!client) {
    return {
      outcome: "FAILED",
      code: "AI_UNAVAILABLE",
      detail: "LIVE_AI requires a model client",
      retryable: false,
      record: record(mode, 0, false, "AI_FAILURE", [], 0),
    };
  }

  const first = await client({
    system: SYSTEM_INSTRUCTION_TH,
    prompt: buildConceptPrompt(brief),
  });
  if (first.outcome === "FAILED") {
    // A provider failure is never retried here and never falls back to invented concepts.
    return {
      outcome: "FAILED",
      code: first.code,
      detail: first.detail,
      retryable: first.retryable,
      record: record(mode, 1, false, "AI_FAILURE", [], 0),
    };
  }

  const firstAttempt = accept(mode, first.text, brief, 1, false);
  if (firstAttempt.outcome === "SUCCESS") {
    return firstAttempt;
  }

  // One constrained repair, carrying only the prior response, the machine errors and the same
  // allowed context. No new facts, no new IDs (docs/ai-architecture.md §4).
  const errors = firstAttempt.record.rejected_concepts
    .map((issue) => `- ${issue.reason}: ${issue.detail}`)
    .join("\n");
  const repair = await client({
    system: SYSTEM_INSTRUCTION_TH,
    prompt: [
      REPAIR_INSTRUCTION_TH,
      "",
      "ข้อผิดพลาดที่ตรวจพบ:",
      errors,
      "",
      "คำตอบก่อนหน้า:",
      first.text,
      "",
      buildConceptPrompt(brief),
    ].join("\n"),
  });
  if (repair.outcome === "FAILED") {
    return {
      outcome: "FAILED",
      code: repair.code,
      detail: repair.detail,
      retryable: repair.retryable,
      record: record(mode, 2, true, "AI_FAILURE", firstAttempt.record.rejected_concepts, 0),
    };
  }
  return accept(mode, repair.text, brief, 2, true);
}

function accept(
  mode: AiMode,
  text: string,
  brief: OpportunityBrief,
  calls: number,
  repaired: boolean,
): ConceptProposalResult {
  let payload: unknown;
  try {
    payload = parseJson(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unparseable response";
    return {
      outcome: "FAILED",
      code: "AI_OUTPUT_INVALID",
      detail,
      retryable: false,
      record: record(mode, calls, repaired, "AI_FAILURE", [{ reason: "PARSE", detail }], 0),
    };
  }

  // An explicit empty array is the model saying the evidence supports nothing — a defensible
  // answer, and a different outcome from a malformed response.
  if (Array.isArray(payload) && payload.length === 0) {
    return {
      outcome: "FAILED",
      code: "AI_NO_DEFENSIBLE_CONCEPTS",
      detail: "the model proposed no concepts for this evidence",
      retryable: false,
      record: record(mode, calls, repaired, "NO_DEFENSIBLE_CONCEPTS", [], 0),
    };
  }

  const validation = validateConceptResponse(payload, brief);
  if (!validation.ok) {
    return {
      outcome: "FAILED",
      code: "AI_OUTPUT_INVALID",
      detail: `no concept survived validation (${validation.issues.length} issue(s))`,
      retryable: false,
      record: record(mode, calls, repaired, "AI_FAILURE", validation.issues, 0),
    };
  }

  return {
    outcome: "SUCCESS",
    concepts: validation.concepts,
    record: record(
      mode,
      calls,
      repaired,
      "EVIDENCE_SPACE_COVERED",
      validation.issues,
      validation.duplicates_merged,
    ),
  };
}
