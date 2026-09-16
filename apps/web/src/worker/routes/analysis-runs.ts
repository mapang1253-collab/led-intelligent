import type { AiMode } from "@reis/ai-gateway";
import { propertyIntakeSchema } from "@reis/contracts";
import type { LegalRulePack } from "@reis/contracts";
import {
  type AnalysisRunRow,
  createAnalysisRun,
  createDb,
  findRunForCapability,
  loadConceptSet,
  loadRunAreaNames,
  loadRunEvidence,
  saveConceptSet,
  setRunState,
} from "@reis/data-access";
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

    // Acquisition is a database read plus run-scoped writes; bulk source fetching happens off the
    // interactive path (tools/ingestion/), so this stays inside a request budget.
    const evidence = await runEvidenceAcquisition(db, run);

    // Concepts are proposed once, at creation, and persisted. Polling the progress screen re-reads
    // them and never re-invokes the model.
    const areas = await loadRunAreaNames(db, run);
    const links = await loadRunEvidence(db, run.run_id);
    const concepts = await runConceptGeneration({
      mode: aiMode(c.env),
      apiKey: c.env.GEMINI_API_KEY,
      targetTh: `ต.${areas.subdistrict} อ.${areas.district} จ.${areas.province}`,
      effectiveOn: new Date().toISOString().slice(0, 10),
      outputScope: run.permitted_scope,
      evidence: links,
      pack: LEGAL_PACK,
      areaCodes: [],
      intake,
      ...(aiMode(c.env) === "RECORDED_AI" ? { recorded: RECORDED_FIXTURE } : {}),
    });
    await saveConceptSet(db, run.run_id, {
      record: concepts.record,
      failureCode: concepts.reason ?? null,
      concepts: concepts.concepts,
      validations: concepts.validations,
    });

    c.header(
      "Set-Cookie",
      buildCapabilityCookie(capability, new URL(c.req.url).protocol === "https:"),
    );

    // RunAccepted: opaque id, state, and the fixed expiry. No capability in the body.
    return c.json(
      {
        schema_version: SCHEMA_VERSION,
        run_id: run.run_id,
        run_state: run.run_state,
        created_at: run.created_at,
        expires_at: run.expires_at,
        evidence_stage: {
          state: evidence.state,
          ...(evidence.reason ? { reason: evidence.reason } : {}),
        },
        concept_stage: {
          state: concepts.state,
          ...(concepts.reason ? { reason: concepts.reason } : {}),
        },
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
    const evidenceLinks = await loadRunEvidence(db, run.run_id);
    const evidence: EvidenceStageResult =
      evidenceLinks.length > 0
        ? { state: "SUCCEEDED", linkCount: evidenceLinks.length }
        : { state: "SKIPPED", reason: "SOURCE_NOT_ACTIVATED", linkCount: 0 };
    const evidenceGroups = groupEvidenceForDisplay(evidenceLinks);
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
          state: conceptSet.concepts.length > 0 ? "SUCCEEDED" : "SKIPPED",
          ...(conceptSet.concepts.length > 0
            ? {}
            : { reason: conceptSet.failure_code ?? "AI_DISABLED" }),
        },
        {
          stage: "VALIDATION",
          version: "1.0.0",
          state: conceptSet.validations.length > 0 ? "SUCCEEDED" : "SKIPPED",
          ...(conceptSet.validations.length > 0 ? {} : { reason: "PACK_NOT_ACTIVATED" }),
        },
        {
          stage: "SCENARIO",
          version: "1.0.0",
          state: "SKIPPED",
          reason: "COMPONENT_NOT_ACTIVATED",
        },
        { stage: "COMPARISON", version: "1.0.0", state: "SKIPPED", reason: "NO_CANDIDATES" },
      ],
      // Present only when a valid analytical decision exists — it does not.
      final_analysis: null,
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
