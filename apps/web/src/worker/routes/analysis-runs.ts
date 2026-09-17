import type { AiMode } from "@reis/ai-gateway";
import { propertyIntakeSchema } from "@reis/contracts";
import type { LegalRulePack } from "@reis/contracts";
import {
  type AnalysisRunRow,
  administrativeChainIsValid,
  createAnalysisRun,
  createDb,
  findRunForCapability,
  loadConceptSet,
  loadRunAreaNames,
  loadRunEvidence,
  saveConceptSet,
  setRunProgress,
  setRunState,
} from "@reis/data-access";
import { formatTargetTh } from "@reis/domain";
import { Hono } from "hono";
import mr55Pack from "../../../../../database/reviewed-packs/th-cba-mr55-v1.json" with {
  type: "json",
};
import conceptFixture from "../fixtures/concepts-baseline-v1.json" with { type: "json" };
import type { Env } from "../index.js";
import {
  buildCapabilityCookie,
  digestCapability,
  generateCapability,
  generateRunId,
  isSameOrigin,
  readCapabilityCookie,
} from "../run-capability.js";
import { runConceptGeneration } from "../stages/concept-generation.js";
import {
  type EvidenceStageResult,
  groupEvidenceForDisplay,
  runEvidenceAcquisition,
} from "../stages/evidence-acquisition.js";

/**
 * Analysis-run operations (docs/api-contracts.md §3).
 *
 * A run resolves its target and acquires the evidence its activated sources can supply. The
 * validation, scenario, comparison and AI stages are not built (docs/adr/0001), so no run can
 * produce a recommendation: the envelope reports PARTIAL with real partial artifacts and
 * `final_analysis: null`, which is what docs/api-contracts.md §2 prescribes for a run that produced
 * usable artifacts but no analytical decision.
 *
 * Stage records are derived from what is actually persisted — links written, sources activated —
 * never from a hard-coded list, so the screen cannot claim a stage ran when it did not.
 */

const SCHEMA_VERSION = "1.0.0";

/** The only pack this deployment ships. It executes only if its review record still matches. */
const LEGAL_PACK = mr55Pack as unknown as LegalRulePack;

/** States that mean the stage ran and did not get there, versus never having been switched on. */
const NOT_ACTIVATED_REASONS = new Set(["AI_DISABLED", "NO_EVIDENCE"]);

/**
 * Failures a fresh run could plausibly get past: a busy or slow provider, and an answer the
 * validator rejected even after its one repair (the model is sampled, so another run may parse).
 * Everything else — an exhausted allowance, an unconfigured budget, a provider we cannot reach —
 * would fail the same way again, and offering "try again" there sends the reader into a wall.
 */
const RETRYABLE_REASONS = new Set([
  "AI_PROVIDER_BUSY",
  "AI_TIMEOUT",
  "AI_OUTPUT_INVALID",
  // A short window that refills on its own — unlike a spent daily allowance.
  "AI_RATE_LIMITED",
]);

export function conceptStageRecord(set: {
  concepts: readonly unknown[];
  failure_code: string | null;
}): { state: string; reason?: string; retryable?: boolean } {
  if (set.concepts.length > 0) {
    return { state: "SUCCEEDED" };
  }
  const reason = set.failure_code ?? "AI_DISABLED";
  return NOT_ACTIVATED_REASONS.has(reason)
    ? { state: "SKIPPED", reason }
    : { state: "FAILED", reason, retryable: RETRYABLE_REASONS.has(reason) };
}

export function validationStageRecord(set: {
  concepts: readonly unknown[];
  validations: readonly unknown[];
  failure_code: string | null;
}): { state: string; reason?: string } {
  if (set.validations.length > 0) {
    return { state: "SUCCEEDED" };
  }
  if (set.concepts.length === 0) {
    return { state: "SKIPPED", reason: "NO_CANDIDATES" };
  }
  return { state: "SKIPPED", reason: set.failure_code ?? "PACK_NOT_ACTIVATED" };
}

/**
 * Comparison is where the final status is decided. A run that produced a final analysis ran it and
 * succeeded — INSUFFICIENT_EVIDENCE is a decision, not a stage that never happened. Reporting it as
 * "no candidates to compare" contradicts the concepts listed directly above it on the same screen.
 */
export function comparisonStageRecord(set: {
  concepts: readonly unknown[];
  final: unknown;
}): { state: string; reason?: string } {
  if (set.final) {
    return { state: "SUCCEEDED" };
  }
  return { state: "SKIPPED", reason: set.concepts.length === 0 ? "NO_CANDIDATES" : "AI_FAILURE" };
}

function aiMode(env: Env): AiMode {
  const mode = env.AI_MODE;
  return mode === "LIVE_AI" || mode === "RECORDED_AI" ? mode : "AI_DISABLED";
}

/**
 * The one named fixture this deployment ships, for RECORDED_AI (docs/ai-architecture.md §5). It is
 * validated exactly like a live response, and the envelope reports the mode, so a reader is never
 * shown fixture output believing a model produced it.
 */
const RECORDED_FIXTURE = {
  fixture_id: "concepts-baseline-v1",
  text: JSON.stringify(conceptFixture),
} as const;

export const analysisRuns = new Hono<{ Bindings: Env }>();

function isExpired(run: AnalysisRunRow): boolean {
  return Date.now() >= new Date(run.expires_at).getTime();
}

/** Envelope with no run content — used for expired, missing and unauthorised alike. */
function opaqueNotFound() {
  return {
    schema_version: SCHEMA_VERSION,
    run_state: "EXPIRED" as const,
    errors: [{ code: "RUN_NOT_AVAILABLE", retryable: false }],
  };
}

/**
 * The analysis, run after the acknowledgement has already gone out.
 *
 * It opens its own database handle: the request handler closes its one in a `finally` that has
 * long since run by the time this starts, and sharing a destroyed connection would fail every
 * query here for reasons that would look nothing like the cause.
 *
 * A failure here has to land in the run's state. Nothing is watching this call — no client is
 * waiting on its promise and no error of its own reaches anyone — so a run whose work threw would
 * otherwise sit at RUNNING until it expired, and the progress screen would poll it for 24 hours.
 */
async function completeRun(
  env: Env,
  runId: string,
  capabilityDigest: string,
  context: { permittedScope: string; intake: Record<string, unknown> },
): Promise<void> {
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const run = await findRunForCapability(db, runId, capabilityDigest);
    if (!run) {
      return;
    }

    // Acquisition is a database read plus run-scoped writes; bulk source fetching happens off the
    // interactive path (tools/ingestion/).
    await runEvidenceAcquisition(db, run);

    // Concepts are proposed once and persisted. Polling the progress screen re-reads them and
    // never re-invokes the model.
    const areas = await loadRunAreaNames(db, run);
    const links = await loadRunEvidence(db, run.run_id);
    const concepts = await runConceptGeneration({
      mode: aiMode(env),
      apiKey: env.GEMINI_API_KEY,
      db,
      budgetEnv: env,
      targetTh: formatTargetTh({
        province_name_th: areas.province,
        district_name_th: areas.district,
        subdistrict_name_th: areas.subdistrict,
      }),
      effectiveOn: new Date().toISOString().slice(0, 10),
      outputScope: run.permitted_scope,
      evidence: links,
      pack: LEGAL_PACK,
      areaCodes: [],
      intake: context.intake as never,
      ...(aiMode(env) === "RECORDED_AI" ? { recorded: RECORDED_FIXTURE } : {}),
    });
    await saveConceptSet(db, run.run_id, {
      record: concepts.record,
      failureCode: concepts.reason ?? null,
      concepts: concepts.concepts,
      validations: concepts.validations,
      final: concepts.final,
    });

    // Back to QUEUED, which the read path reports as PARTIAL. The stage states themselves are
    // derived from what is in the corpus, so this only has to say "no longer working".
    await setRunProgress(db, runId, capabilityDigest, "QUEUED");
  } catch (error) {
    console.error(`[run ${runId}] analysis failed`, error);
    // FAILED_FINAL, not FAILED_RETRYABLE: the client's poll treats only FAILED_FINAL as an end,
    // and there is nothing here for it to retry — the work that threw is gone with the request
    // that started it, so the way forward is a new run, which the screen already offers.
    await setRunProgress(db, runId, capabilityDigest, "FAILED_FINAL").catch(() => {});
  } finally {
    await db.destroy();
  }
}

analysisRuns.post("/", async (c) => {
  if (!isSameOrigin(c.req.raw)) {
    return c.json({ error: "CROSS_ORIGIN_REJECTED" }, 403);
  }

  const parsed = propertyIntakeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      {
        error: "INVALID_INTAKE",
        // Field-level detail so the client can attach Thai messages to the right input.
        fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })),
      },
      400,
    );
  }
  const intake = parsed.data;

  // Optional property facts raise the requested scope; whether it is permitted is decided by the
  // evidence, which is why permitted_scope stays AREA until property evidence actually exists.
  const hasPropertyDetail = Boolean(
    intake.title_deed_number || intake.map_sheet || intake.land_number || intake.address_line,
  );

  const runId = generateRunId();
  const capability = generateCapability();
  const capabilityDigest = await digestCapability(capability);

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    // The form can only offer consistent choices, but the form is not the only way in. A target
    // whose parts do not belong together would be resolved and displayed as a real place.
    const chainIsValid = await administrativeChainIsValid(
      db,
      intake.province_id,
      intake.district_id,
      intake.subdistrict_id,
    );
    if (!chainIsValid) {
      return c.json({ error: "INVALID_AREA_CHAIN" }, 400);
    }

    const run = await createAnalysisRun(db, {
      runId,
      capabilityDigest,
      requestedScope: hasPropertyDetail ? "PRELIMINARY_PROPERTY" : "AREA",
      permittedScope: "AREA",
      intake,
      provinceId: intake.province_id,
      districtId: intake.district_id,
      subdistrictId: intake.subdistrict_id,
    });
    await setRunProgress(db, runId, capabilityDigest, "RUNNING");

    c.header(
      "Set-Cookie",
      buildCapabilityCookie(capability, new URL(c.req.url).protocol === "https:"),
    );

    // The analysis itself runs after the response. Acknowledgement is a gate of its own
    // (docs/performance-and-reliability.md §7: p95 <= 1 second) and it cannot be met by a request
    // that also does the work — measured at 9 seconds when it did, and refused outright on
    // Cloudflare's free plan, which allows 10 ms of CPU per invocation against the 265-338 ms this
    // path was using.
    c.executionCtx.waitUntil(
      completeRun(c.env, runId, capabilityDigest, {
        permittedScope: run.permitted_scope,
        intake,
      }),
    );

    // RunAccepted: opaque id, state, and the fixed expiry. No capability in the body, and no
    // stage results — there are none yet, and docs/api-contracts.md §3 asks for none.
    return c.json(
      {
        schema_version: SCHEMA_VERSION,
        run_id: run.run_id,
        run_state: "RUNNING",
        created_at: run.created_at,
        expires_at: run.expires_at,
      },
      201,
    );
  } finally {
    await db.destroy();
  }
});

analysisRuns.get("/:run_id", async (c) => {
  const capability = readCapabilityCookie(c.req.header("Cookie"));
  if (!capability) {
    return c.json(opaqueNotFound(), 404);
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const run = await findRunForCapability(
      db,
      c.req.param("run_id"),
      await digestCapability(capability),
    );
    // A public run_id without its matching capability is indistinguishable from a missing run.
    if (!run) {
      return c.json(opaqueNotFound(), 404);
    }
    if (isExpired(run)) {
      return c.json(opaqueNotFound(), 410);
    }

    const areas = await loadRunAreaNames(db, run);
    // Stage state is read back from the corpus, not remembered: if the links are there, the stage
    // succeeded; if they are not, the envelope says which reason applies.
    //
    // Except while the run is still working. The analysis now finishes after the acknowledgement,
    // so an empty corpus means "not yet" as often as it means "nothing to find", and the two must
    // not be reported alike: telling a reader a source is not activated, when it is and is being
    // read from at that moment, is a false statement about the system.
    const working = run.run_state === "RUNNING";
    const evidenceLinks = await loadRunEvidence(db, run.run_id);
    const evidence: EvidenceStageResult =
      evidenceLinks.length > 0
        ? { state: "SUCCEEDED", linkCount: evidenceLinks.length }
        : working
          ? { state: "RUNNING", linkCount: 0 }
          : { state: "SKIPPED", reason: "SOURCE_NOT_ACTIVATED", linkCount: 0 };
    const evidenceGroups = groupEvidenceForDisplay(evidenceLinks, areas.province);
    const conceptSet = await loadConceptSet(db, run.run_id);
    const validationByConcept = new Map(
      conceptSet.validations.map((validation) => [validation.concept_id, validation]),
    );

    return c.json({
      schema_version: SCHEMA_VERSION,
      run_id: run.run_id,
      run_state: run.run_state === "QUEUED" ? "PARTIAL" : run.run_state,
      requested_scope: run.requested_scope,
      permitted_scope: run.permitted_scope,
      created_at: run.created_at,
      // Reading never extends expiry; this is the value fixed at creation.
      expires_at: run.expires_at,
      replay_status: "COMPLETE",
      stage_records: [
        { stage: "TARGET_RESOLUTION", version: "1.0.0", state: "SUCCEEDED" },
        {
          stage: "EVIDENCE_ACQUISITION",
          version: "1.0.0",
          state: evidence.state,
          ...(evidence.reason ? { reason: evidence.reason } : {}),
        },
        {
          stage: "CONCEPT_PROPOSAL",
          version: "1.0.0",
          // A stage that tried and failed is not a stage that was never switched on. Reporting a
          // provider outage as "not activated" tells the reader to wait for a feature, when what
          // they should do is press the button again.
          ...(working && conceptSet.concepts.length === 0
            ? { state: "RUNNING" }
            : conceptStageRecord(conceptSet)),
        },
        {
          stage: "VALIDATION",
          version: "1.0.0",
          // With no concepts there is nothing to validate; that is not the pack's fault, and
          // saying "pack not activated" would send the reader after the wrong thing.
          ...validationStageRecord(conceptSet),
        },
        {
          stage: "SCENARIO",
          version: "1.0.0",
          state: "SKIPPED",
          reason: "COMPONENT_NOT_ACTIVATED",
        },
        { stage: "COMPARISON", version: "1.0.0", ...comparisonStageRecord(conceptSet) },
      ],
      // Present only when a candidate set existed and a decision could be made. A run that never
      // produced one keeps this null and reports an operational state instead.
      final_analysis: conceptSet.final,
      partial_artifacts: {
        resolved_target: {
          resolution_level: "ADMIN_AREA",
          province_name_th: areas.province,
          district_name_th: areas.district,
          subdistrict_name_th: areas.subdistrict,
          output_scope_ceiling: "AREA",
        },
        // Evidence gathered for this run, each figure still carrying its own disclosure.
        evidence: evidenceGroups,
        // Proposals and the screen applied to them. Never a recommendation: the concepts are
        // unranked and the legal result is reported exactly as the validator produced it.
        concepts: conceptSet.concepts.map((concept) => {
          const validation = validationByConcept.get(concept.concept_id);
          return {
            concept_id: concept.concept_id,
            label_th: concept.label_th,
            description_th: concept.description_th,
            supporting_reason_th: concept.supporting_reason_th,
            uncertainty_th: concept.uncertainty_th,
            building_type_th: concept.building_type_th,
            unmapped_activities_th: concept.unmapped_activities_th,
            demand_hypotheses: concept.demand_hypotheses,
            legal: validation
              ? {
                  status: validation.status,
                  status_reason_th: validation.status_reason_th,
                  pack_id: validation.pack_id,
                  pack_version: validation.pack_version,
                  unresolved_inputs: validation.unresolved_inputs,
                  approval_required: validation.approval_required.map((outcome) => ({
                    title_th: outcome.title_th,
                    clause_th: outcome.source.clause_th,
                    explanation_th: outcome.explanation_th,
                  })),
                  outcomes: validation.outcomes
                    // Rules whose applicability could not be settled are shown too: "we cannot yet
                    // tell whether this reaches you" is information, and it is what the summary
                    // counts. Hiding them made the count disagree with the list.
                    .filter((outcome) => outcome.applicability !== "NOT_APPLICABLE")
                    .map((outcome) => ({
                      rule_id: outcome.rule_id,
                      title_th: outcome.title_th,
                      status: outcome.status,
                      applicability: outcome.applicability,
                      clause_th: outcome.source.clause_th,
                      instrument_th: outcome.source.instrument_th,
                      explanation_th: outcome.explanation_th,
                      requirement_th: outcome.requirement_th,
                      missing_inputs: outcome.missing_inputs,
                    })),
                }
              : null,
          };
        }),
        // The mode travels with the concepts so the screen can say where they came from. Fixture
        // output must never be read as a model's work (docs/ai-architecture.md §5).
        candidate_search: conceptSet.record,
      },
      errors: [],
      notices: [{ code: "ANALYTICAL_STAGES_NOT_ACTIVATED", retryable: false }],
    });
  } finally {
    await db.destroy();
  }
});

analysisRuns.post("/:run_id/cancel", async (c) => {
  if (!isSameOrigin(c.req.raw)) {
    return c.json({ error: "CROSS_ORIGIN_REJECTED" }, 403);
  }
  const capability = readCapabilityCookie(c.req.header("Cookie"));
  if (!capability) {
    return c.json(opaqueNotFound(), 404);
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const runId = c.req.param("run_id");
    const digest = await digestCapability(capability);
    const existing = await findRunForCapability(db, runId, digest);
    if (!existing) {
      return c.json(opaqueNotFound(), 404);
    }
    if (isExpired(existing)) {
      return c.json(opaqueNotFound(), 410);
    }

    // Idempotent: cancelling an already-terminal run returns its current state unchanged.
    const terminal = ["COMPLETE", "FAILED_FINAL", "CANCELLED"];
    const run = terminal.includes(existing.run_state)
      ? existing
      : ((await setRunState(db, runId, digest, "CANCELLED")) ?? existing);

    return c.json({
      schema_version: SCHEMA_VERSION,
      run_id: run.run_id,
      run_state: run.run_state,
      expires_at: run.expires_at,
    });
  } finally {
    await db.destroy();
  }
});
