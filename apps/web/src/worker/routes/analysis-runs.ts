import { propertyIntakeSchema } from "@reis/contracts";
import {
  type AnalysisRunRow,
  createAnalysisRun,
  createDb,
  findRunForCapability,
  loadRunAreaNames,
  loadRunEvidence,
  setRunState,
} from "@reis/data-access";
import { Hono } from "hono";
import type { Env } from "../index.js";
import {
  buildCapabilityCookie,
  digestCapability,
  generateCapability,
  generateRunId,
  isSameOrigin,
  readCapabilityCookie,
} from "../run-capability.js";
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
        { stage: "VALIDATION", version: "1.0.0", state: "SKIPPED", reason: "PACK_NOT_ACTIVATED" },
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
