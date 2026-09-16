import { th } from "@reis/i18n";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Clock,
  Info,
  LoaderCircle,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { useRef } from "react";
import { Link, useParams } from "react-router";
import { TerrainBackdrop } from "../design-system/TerrainBackdrop.js";
import { ConceptPanel } from "./ConceptPanel.js";
import { EvidencePanel } from "./EvidencePanel.js";
import { FinalResultPanel } from "./FinalResultPanel.js";
import { type StageRecord, isTerminal, useCancelRun, useRun } from "./useAnalysisRun.js";

/**
 * Run progress and outcome. Progress shows real stage states, never a fabricated percentage
 * (docs/system-design.md §5), and this screen deliberately cannot show a recommendation: the
 * analytical stages are inactive, so it reports what was actually produced and says why there is
 * no conclusion.
 */

const STAGE_LABELS = th.progress.stage as Record<string, string>;

function StageRow({ record }: { record: StageRecord }) {
  const label = STAGE_LABELS[record.stage] ?? record.stage;
  const done = record.state === "SUCCEEDED";
  const skipped = record.state === "SKIPPED";
  const degraded = record.state === "DEGRADED";
  const running = record.state === "RUNNING";

  const statusText = done
    ? th.progress.stageSucceeded
    : degraded
      ? th.progress.stageDegraded
      : skipped
        ? th.progress.stageSkipped
        : running
          ? th.progress.stageRunning
          : th.progress.stagePending;

  const color = done
    ? "var(--color-pass)"
    : degraded
      ? "var(--color-partial)"
      : skipped
        ? "var(--color-unknown)"
        : "var(--color-ink-muted)";

  return (
    <li className="flex items-center justify-between gap-4 border-border border-b py-3 last:border-b-0">
      <span className="flex items-center gap-2.5">
        <span style={{ color }} aria-hidden="true">
          {done ? (
            <Check size={17} strokeWidth={2.5} />
          ) : running ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <CircleDashed size={17} />
          )}
        </span>
        {label}
      </span>
      <span className="text-sm" style={{ color }}>
        {statusText}
      </span>
    </li>
  );
}

export function RunPage() {
  const { runId } = useParams();
  // Fixed at mount so the 2s→5s polling schedule measures from when this run was opened.
  const startedAt = useRef(Date.now()).current;
  const run = useRun(runId, startedAt);
  const cancel = useCancelRun(runId);

  const envelope = run.data;
  const state = envelope?.run_state;
  const target = envelope?.partial_artifacts?.resolved_target;
  const final = envelope?.final_analysis;
  // Once a final analysis exists the "nothing to show" notice contradicts it: the run did reach a
  // determination, and that determination is INSUFFICIENT_EVIDENCE with its reasons stated.
  const notActivated =
    !final && envelope?.notices?.some((n) => n.code === "ANALYTICAL_STAGES_NOT_ACTIVATED");
  const evidenceStage = envelope?.stage_records?.find((s) => s.stage === "EVIDENCE_ACQUISITION");
  const conceptStage = envelope?.stage_records?.find((s) => s.stage === "CONCEPT_PROPOSAL");
  const unavailable = envelope?.errors?.some((e) => e.code === "RUN_NOT_AVAILABLE");

  return (
    <div className="relative min-h-screen text-ink">
      <TerrainBackdrop />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {th.progress.backToIntake}
        </Link>

        {unavailable ? (
          <section className="glass mt-6 rounded-card p-8">
            <h1 className="flex items-center gap-2.5 font-bold text-2xl tracking-tight">
              <Clock size={24} style={{ color: "var(--color-unknown)" }} aria-hidden="true" />
              {th.expired.heading}
            </h1>
            <p className="mt-3 text-ink-muted">{th.expired.body}</p>
          </section>
        ) : (
          <>
            <header className="mt-6">
              <h1 className="font-bold text-3xl tracking-tight">
                {final
                  ? th.finalResult.heading
                  : isTerminal(state)
                    ? th.notActivated.heading
                    : th.progress.heading}
              </h1>
              {state && (
                <p className="mt-2 text-ink-muted text-sm">
                  {th.runState[state] ?? state}
                  {!isTerminal(state) && (
                    <LoaderCircle
                      size={14}
                      className="ml-2 inline animate-spin"
                      aria-hidden="true"
                    />
                  )}
                </p>
              )}
            </header>

            {target && (
              <section className="glass mt-5 rounded-card p-6">
                <h2 className="mb-3 font-semibold text-sm text-ink-muted">
                  {th.progress.targetHeading}
                </h2>
                <p className="flex items-center gap-2 font-bold text-lg">
                  <MapPin size={18} aria-hidden="true" />
                  ต.{target.subdistrict_name_th} อ.{target.district_name_th} จ.
                  {target.province_name_th}
                </p>
              </section>
            )}

            <section className="glass mt-5 rounded-card p-6">
              <h2 className="mb-1 font-semibold text-sm text-ink-muted">
                {th.progress.stageHeading}
              </h2>
              <ul>
                {envelope?.stage_records?.map((record) => (
                  <StageRow key={record.stage} record={record} />
                ))}
              </ul>
            </section>

            <FinalResultPanel final={final} />

            <EvidencePanel
              groups={envelope?.partial_artifacts?.evidence}
              stageState={evidenceStage?.state}
            />

            <ConceptPanel
              concepts={envelope?.partial_artifacts?.concepts}
              stageReason={conceptStage?.reason}
              mode={envelope?.partial_artifacts?.candidate_search?.mode}
            />

            {notActivated && (
              <section
                className="mt-5 rounded-card p-6"
                style={{
                  backgroundColor: "var(--color-partial-soft)",
                  color: "var(--color-partial)",
                  border: "1px solid color-mix(in srgb, var(--color-partial) 35%, transparent)",
                }}
              >
                <h2 className="flex items-center gap-2 font-bold">
                  <TriangleAlert size={19} strokeWidth={2.5} aria-hidden="true" />
                  {th.notActivated.heading}
                </h2>
                <p className="mt-2 text-sm leading-relaxed">{th.notActivated.body}</p>
                <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed">
                  <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {th.notActivated.why}
                </p>
              </section>
            )}

            {envelope?.expires_at && (
              <p className="mt-5 flex items-center gap-2 text-ink-muted text-sm">
                <Clock size={14} aria-hidden="true" />
                {th.progress.expiresAt}{" "}
                {new Date(envelope.expires_at).toLocaleString("th-TH", {
                  timeZone: "Asia/Bangkok",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}

            {!isTerminal(state) && (
              <button
                type="button"
                onClick={() => cancel.mutate()}
                className="mt-4 rounded-pill border border-border-strong px-5 py-2.5 font-medium text-sm"
              >
                {th.progress.cancel}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
