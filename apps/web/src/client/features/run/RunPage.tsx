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
  TriangleAlert,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useResultView } from "../../app/AppShell.js";
import { useCarryIntake } from "../../app/intake-carrier.js";
import { ZoningPanel } from "../intake/ZoningPanel.js";
import { useProvinces } from "../intake/useAdministrativeAreas.js";
import { ConceptComparison } from "./ConceptComparison.js";
import { ConceptPanel } from "./ConceptPanel.js";
import { EvidencePanel } from "./EvidencePanel.js";
import { FeasibilityPanel } from "./FeasibilityPanel.js";
import { FinalResultPanel } from "./FinalResultPanel.js";
import { Notice } from "./Notice.js";
import { OverviewSummary } from "./OverviewSummary.js";
import { type ResultTab, ResultTabs } from "./ResultTabs.js";
import { ValuationPanel } from "./ValuationPanel.js";
import { ZoningMap } from "./ZoningMap.js";
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
  /** Skipped because the stage it feeds from produced nothing, rather than because it is off. */
  const blocked = record.state === "SKIPPED" && record.reason === "NO_CANDIDATES";

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
          ? // "Not activated" and "waiting for the stage before it" are different facts, and only
            // one of them is about a switch. A reader told the first goes looking for a setting.
            blocked
            ? th.progress.stageBlocked
            : th.progress.stageSkipped
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

  // And the long answer, for the reader who wants to know on whose authority a stage stayed shut.
  // A stage that succeeded is not asked to explain itself.
  const why =
    !done && record.reason
      ? (th.progress.stageWhy as Record<string, string>)[record.reason]
      : undefined;

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
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
      </div>

      {/* Folded, because six open explanations would bury the list they belong to; and present on
          the row itself rather than as one footnote at the bottom, because each stage stopped for
          a reason of its own. */}
      {why && (
        <details className="mt-2">
          <summary className="cursor-pointer text-signature-text text-xs">
            {th.progress.stageWhyToggle}
          </summary>
          <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">{why}</p>
        </details>
      )}
    </li>
  );
}

/** An intake value as a number, or null — the field is optional and arrives as JSON. */
function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
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

  const envelope = run.data;

  /**
   * The request that produced this run.
   *
   * The navigation that opened the page carries it, which is instant and works while the run is
   * still being created. The server returns it too, which is what survives a reload or a link
   * opened the next morning — the way anyone preparing for a presentation will use this. Before
   * the server sent it back, the land calculator asked again for an area the reader had already
   * typed, and the city plan could not be shown beside the result at all.
   */
  const intake =
    (location.state as { intake?: Record<string, unknown> } | null)?.intake ?? envelope?.intake;
  /* Hand it to the rail, whose own link to the form carries no state of its own. */
  useCarryIntake(intake);

  /**
   * The city plan, beside the result rather than only on the form that produced it.
   *
   * The concepts screen used to tell a reader to go and look the plan up at the provincial office,
   * on a product that had already shown it to them one screen earlier. Showing it here closes
   * that, and it belongs on this topic: the plan is the thing that decides what a piece of land
   * may be used for, which is what the whole tab is about.
   *
   * Still context, not a validation input (ADR 0008). The rule pack does not read it, the
   * unscreened-domain action stays BLOCKING, and the panel says so itself.
   */
  const provinces = useProvinces();
  /**
   * The land value the valuation panel worked out, for the feasibility calculator on the same
   * tab. Held here because the two panels are siblings; the calculator still owns its own field,
   * so a reader can replace an assessed value with a real purchase price.
   */
  const [landValueBaht, setLandValueBaht] = useState<string>();
  const zoningPin =
    Number.isFinite(Number(intake?.latitude)) && Number.isFinite(Number(intake?.longitude))
      ? { latitude: Number(intake?.latitude), longitude: Number(intake?.longitude) }
      : null;
  const zoningProvinceCode =
    provinces.data
      ?.find((province) => province.id === String(intake?.province_id ?? ""))
      ?.code.toString()
      .padStart(2, "0") ?? null;

  const state = envelope?.run_state;
  const target = envelope?.partial_artifacts?.resolved_target;
  const final = envelope?.final_analysis;
  const headingText = final
    ? th.finalResult.heading
    : isTerminal(state)
      ? th.notActivated.heading
      : th.progress.heading;
  // Once a final analysis exists the "nothing to show" notice contradicts it: the run did reach a
  // determination, and that determination is INSUFFICIENT_EVIDENCE with its reasons stated.
  //
  // And it waits for the run to stop. "ยังไม่มีผลวิเคราะห์ ... ยังไม่ได้เปิดใช้งาน" under a heading
  // reading "กำลังวิเคราะห์" told a reader the work would not happen while it was happening — the
  // stages it names are running at that moment, and one of them may yet produce the result the
  // notice says does not exist.
  const notActivated =
    !final &&
    isTerminal(state) &&
    envelope?.notices?.some((n) => n.code === "ANALYTICAL_STAGES_NOT_ACTIVATED");
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

  /**
   * What this run did, counted here because this is the only place holding the partial artefacts.
   *
   * Rules are counted from one concept rather than summed across them: every concept is tested
   * against the same pack, so a sum would report fifteen rules as thirty and turn a fact about the
   * law into a fact about how many ideas the model happened to propose.
   */
  const concepts = envelope?.partial_artifacts?.concepts;
  const workDone = final
    ? {
        evidenceItems: (allEvidence ?? []).reduce((n, group) => n + group.items.length, 0),
        concepts: concepts?.length ?? 0,
        rulesChecked: concepts?.[0]?.legal?.outcomes.length ?? 0,
      }
    : undefined;

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
          {/* What was found, before how it was found. A reader opening the overview wants the
              numbers; the stage list explains where they came from and is the second question. */}
          <OverviewSummary
            evidence={allEvidence}
            conceptCount={envelope?.partial_artifacts?.concepts?.length ?? 0}
          />

          {/* The answer, and the checklist of what to verify before acting on it, come before the
              plumbing that produced them. A reader opening a result wants to know what it says and
              what to do next; how each stage got there is the second question, not the first. */}
          <FinalResultPanel final={final} intake={intake} work={workDone} />

          {/*
            The stage list, while there is still a stage running.

            Readers did not understand it on a finished run — it is the pipeline's internal shape,
            named in the pipeline's own terms, and someone who came for an answer about land has no
            reason to know what CONCEPT_PROPOSAL is. On a finished run it is also redundant: what
            the analysis could not settle is already said in its own words by the status sentence,
            the missing-basis list and the verification actions above.

            It stays while the run is working, because that is the only honest progress this
            product has. docs/system-design.md §5 requires real queued/running/stage progress and
            forbids inventing a percentage, and a spinner with no stages would be exactly the
            fabricated reassurance that rule exists to prevent. A finished run has no progress left
            to report, which is why removing it there does not touch that requirement.
          */}
          {!isTerminal(state) && (
            <section className="glass mt-5 rounded-card p-6">
              <h2 className="mb-1 font-semibold text-ink-muted text-sm">
                {th.progress.stageHeading}
              </h2>
              {/* What this list is for. Without it, six rows of states read as six things that
                  broke rather than as the shape of the work. */}
              <p className="mt-1 max-w-prose text-ink-muted text-sm leading-relaxed">
                {th.progress.stageIntro}
              </p>
              <ul className="mt-3">
                {envelope?.stage_records?.map((record) => (
                  <StageRow key={record.stage} record={record} />
                ))}
              </ul>
            </section>
          )}
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
            <p className="max-w-prose text-ink-muted text-sm leading-relaxed">
              {th.resultTabs.noPrices}
            </p>
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
        <>
          <ValuationPanel
            onLandValue={setLandValueBaht}
            groups={allEvidence}
            // Carried from the intake so the land calculator starts with what was already typed.
            intakeArea={{
              rai: intake?.land_area_rai as string | undefined,
              ngan: intake?.land_area_ngan as string | undefined,
              wa: intake?.land_area_wa as string | undefined,
            }}
          />
          {/* Below the assessed value, because that is the order of the question: what is the land
              worth on the state's schedule, and then what would happen if something were built on
              it. The second one runs entirely on the reader's own assumptions and says so. */}
          <FeasibilityPanel groups={allEvidence} {...(landValueBaht ? { landValueBaht } : {})} />
          {/* And last, the same method across every concept at once — the comparison the product is
              named after. It comes after the single-concept calculator because a reader needs to
              see one worked example, with its arithmetic, before a table of six of them means
              anything. */}
          <ConceptComparison concepts={envelope?.partial_artifacts?.concepts} />
        </>
      ),
    },
    {
      id: "concepts",
      label: th.resultTabs.concepts,
      icon: Lightbulb,
      count: envelope?.partial_artifacts?.concepts?.length ?? 0,
      render: () => (
        <>
          {/* The place first, then what the plan says about it. A zone name and a wall of clauses
              reads as law about somewhere; the colours around the pin say where, how far the zone
              reaches, and whether this plot sits inside it or on its edge. */}
          <ZoningMap point={zoningPin} provinceCode={zoningProvinceCode} />
          {/* The key opens with it, because the map above is a page of colours otherwise. */}
          <ZoningPanel point={zoningPin} provinceCode={zoningProvinceCode} legendOpen />
          <ConceptPanel
            concepts={envelope?.partial_artifacts?.concepts}
            stageReason={conceptStage?.reason}
            mode={envelope?.partial_artifacts?.candidate_search?.mode}
            // Read back from the run's own intake, so the screen can name the figures that
            // decided which rules were listed (docs/adr/0010).
            statedScale={{
              storeys: numberOrNull(intake?.intended_storey_count),
              heightMetres: numberOrNull(intake?.intended_building_height),
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div className="text-ink">
      {/*
        Wider than the form that precedes it, and on purpose.

        768px was a column sized for prose, and this page stopped being prose: it carries tables of
        figures whose cohort names the source writes in full, a city-plan map, and cards of
        concepts. On a 1440px screen those tables wrapped every second label onto a second line
        while half the window stood empty. The reading measure is kept where reading happens —
        each explanatory paragraph caps itself — so the extra width goes to the things that needed
        it rather than to the sentences, which are worse for it.
      */}
      <main className="mx-auto max-w-5xl px-6 py-10 lg:py-12">
        {/* Carries this run's own intake, so going back reopens the form on the same place with
            the same answers — and therefore the same map, city-plan colours and key the reader was
            looking at before they pressed start. Without it this link led to an empty first
            screen, and everything they had filled in was gone. */}
        <Link
          to="/analyze"
          state={intake ? { intake } : undefined}
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
              <h1 className="font-bold text-3xl tracking-tight">{headingText}</h1>
              {/* The state line is dropped when it would only repeat the heading word for word —
                  while a run is working both say "กำลังวิเคราะห์", and printing it twice, one line
                  apart, says nothing the first line did not. It stays for every state that adds
                  something, and takes the spinner with it. */}
              {state && (th.runState[state] ?? state) !== headingText && (
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
            <Notice>{final?.disclaimer_th ?? BASE_DISCLAIMER_TH}</Notice>

            <ResultTabs tabs={tabs} activeId={view} />

            {notActivated && (
              <section
                className="mt-5 rounded-card p-5"
                style={{
                  backgroundColor: "var(--notice-bg)",
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
