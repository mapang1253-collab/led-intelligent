import { BASE_DISCLAIMER_TH } from "@reis/analysis-engine";
import { formatTargetTh } from "@reis/domain";
import { th } from "@reis/i18n";
import {
  ArrowLeft,
  Calculator,
  Check,
  CircleDashed,
  Clock,
  Coins,
  Info,
  LayoutList,
  Lightbulb,
  LoaderCircle,
  MapPin,
  RotateCw,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useResultView } from "../../app/AppShell.js";
import { ConceptPanel } from "./ConceptPanel.js";
import { EvidencePanel } from "./EvidencePanel.js";
import { FinalResultPanel } from "./FinalResultPanel.js";
import { type ResultTab, ResultTabs } from "./ResultTabs.js";
import { ValuationPanel } from "./ValuationPanel.js";
import {
  type StageRecord,
  isTerminal,
  useCancelRun,
  useCreateRun,
  useRun,
} from "./useAnalysisRun.js";

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
  const failed = record.state === "FAILED";
  const running = record.state === "RUNNING";

  const statusText = done
    ? th.progress.stageSucceeded
    : failed
      ? // Only a failure another attempt could get past is described as worth retrying.
        record.retryable
        ? th.progress.stageFailedRetryable
        : th.progress.stageFailed
      : degraded
        ? th.progress.stageDegraded
        : skipped
          ? th.progress.stageSkipped
          : running
            ? th.progress.stageRunning
            : th.progress.stagePending;

  const color = done
    ? "var(--color-pass)"
    : failed
      ? "var(--color-fail)"
      : degraded
        ? "var(--color-partial)"
        : skipped
          ? "var(--color-unknown)"
          : "var(--color-ink-muted)";

  // Why a stage did not complete, where a short reason exists for it.
  const reasonText = record.reason
    ? ((th.progress.stageReason as Record<string, string>)[record.reason] ?? undefined)
    : undefined;

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
      <span className="text-right text-sm" style={{ color }}>
        {statusText}
        {reasonText && <span className="block text-ink-muted text-xs">{reasonText}</span>}
      </span>
    </li>
  );
}

export function RunPage() {
  const { runId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Measured from when THIS run was opened. Keyed by run id because a retry navigates to a new run
  // without unmounting this screen, and the schedule must restart at two seconds for it.
  const clock = useRef({ runId, at: Date.now() });
  if (clock.current.runId !== runId) {
    clock.current = { runId, at: Date.now() };
  }
  const startedAt = clock.current.at;
  // The open topic lives in the URL, so the navigation rail can link straight to it and the tab
  // strip and the rail can never disagree about which one is open.
  const view = useResultView();
  const run = useRun(runId, startedAt);
  const cancel = useCancelRun(runId);
  const retry = useCreateRun();

  // The request that produced this run, carried by the navigation that opened it. Absent after a
  // page reload or a pasted link, and a retry is simply not offered then.
  const intake = (location.state as { intake?: Record<string, unknown> } | null)?.intake;

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
  // Evidence is split by what a reader came to look at: what property here costs, versus who lives
  // here and what they earn. Both remain full evidence groups, with every caveat they carry.
  const allEvidence = envelope?.partial_artifacts?.evidence;
  const PRICE_REQUIREMENTS = new Set([
    "economic.construction_cost_reference",
    "economic.condominium_price_reference",
    "economic.land_price_reference",
  ]);
  const priceGroups = allEvidence?.filter((g) => PRICE_REQUIREMENTS.has(g.requirement_id));
  const areaGroups = allEvidence?.filter((g) => !PRICE_REQUIREMENTS.has(g.requirement_id));

  const canRetry =
    isTerminal(state) &&
    Boolean(intake) &&
    envelope?.stage_records?.some((s) => s.state === "FAILED" && s.retryable) === true;

  const tabs: ResultTab[] = [
    {
      id: "overview",
      label: th.resultTabs.overview,
      icon: LayoutList,
      render: () => (
        <>
          <section className="glass mt-5 rounded-card p-6">
            <h2 className="mb-1 font-semibold text-ink-muted text-sm">
              {th.progress.stageHeading}
            </h2>
            <ul>
              {envelope?.stage_records?.map((record) => (
                <StageRow key={record.stage} record={record} />
              ))}
            </ul>
          </section>
          <FinalResultPanel final={final} />
        </>
      ),
    },
    {
      id: "prices",
      label: th.resultTabs.prices,
      icon: Coins,
      count: priceGroups?.length ?? 0,
      render: () =>
        priceGroups && priceGroups.length > 0 ? (
          <EvidencePanel groups={priceGroups} stageState={evidenceStage?.state} />
        ) : (
          // Said plainly: no figures here is a fact about this system's coverage, not about the place.
          <section className="glass mt-5 rounded-card p-6">
            <p className="text-ink-muted text-sm leading-relaxed">{th.resultTabs.noPrices}</p>
          </section>
        ),
    },
    {
      id: "area",
      label: th.resultTabs.area,
      icon: Users,
      count: areaGroups?.length ?? 0,
      render: () => <EvidencePanel groups={areaGroups} stageState={evidenceStage?.state} />,
    },
    {
      id: "valuation",
      label: th.resultTabs.valuation,
      icon: Calculator,
      render: () => (
        <ValuationPanel
          groups={allEvidence}
          // Carried from the intake so the land calculator starts with what was already typed.
          intakeArea={{
            rai: intake?.land_area_rai as string | undefined,
            ngan: intake?.land_area_ngan as string | undefined,
            wa: intake?.land_area_wa as string | undefined,
          }}
        />
      ),
    },
    {
      id: "concepts",
      label: th.resultTabs.concepts,
      icon: Lightbulb,
      count: envelope?.partial_artifacts?.concepts?.length ?? 0,
      render: () => (
        <ConceptPanel
          concepts={envelope?.partial_artifacts?.concepts}
          stageReason={conceptStage?.reason}
          mode={envelope?.partial_artifacts?.candidate_search?.mode}
        />
      ),
    },
  ];

  return (
    <div className="text-ink">
      <main className="mx-auto max-w-3xl px-6 py-10 lg:py-12">
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
                  {formatTargetTh(target)}
                </p>
              </section>
            )}

            {/* Above the tabs and above every price table, per docs/output-policy.md §3. An
                unselected tab panel is a collapsed area, which §3 forbids as its only home. */}
            <p
              className="mt-5 flex items-start gap-2.5 rounded-card p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: "var(--color-partial-soft)",
                color: "var(--color-partial)",
                border: "1px solid color-mix(in srgb, var(--color-partial) 35%, transparent)",
              }}
            >
              <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {final?.disclaimer_th ?? BASE_DISCLAIMER_TH}
            </p>

            <ResultTabs tabs={tabs} activeId={view} />

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

            {canRetry && intake && (
              <div className="mt-5">
                <button
                  type="button"
                  disabled={retry.isPending}
                  onClick={() =>
                    retry.mutate(intake, {
                      onSuccess: (created) =>
                        navigate(`/runs/${created.run_id}`, { state: { intake } }),
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-pill bg-signature px-5 py-2.5 font-semibold text-sm"
                >
                  {retry.isPending ? (
                    <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCw size={15} aria-hidden="true" />
                  )}
                  {retry.isPending ? th.progress.retrying : th.progress.retry}
                </button>
                <p className="mt-2 text-ink-muted text-xs">{th.progress.retryNote}</p>
              </div>
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
