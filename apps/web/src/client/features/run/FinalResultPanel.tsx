import { th } from "@reis/i18n";
import { ArrowRight, ClipboardCheck, PencilLine, TriangleAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import type { FinalAnalysisView } from "./useAnalysisRun.js";

/**
 * The final result, rendered under docs/output-policy.md `academic-output-v2`.
 *
 * Placement is part of the policy, not a design preference (§3): the academic disclaimer sits
 * directly under the status, above every table and figure a reader could otherwise copy without
 * context, and it is never collapsed behind a "details" control. Nothing on this panel is written
 * by a model — the disclaimer, the scope sentence and the status sentence all come from fixed
 * deterministic templates.
 */

const STATUS_LABELS = th.finalStatus as Record<string, string>;
const PRIORITY_LABELS = th.verificationPriority as Record<string, string>;
const STAGE_LABELS = th.finalResult.stage as Record<string, string>;
const STAGE_NOTES = th.finalResult.stageNote as Record<string, string>;

type Action = FinalAnalysisView["verification_actions"][number];

/**
 * When a reader needs each item, which is not the same question as which discipline it belongs to.
 *
 * Grouped by domain, the list put "measure the open space on the site plan" beside "check the
 * zoning" and showed all twenty-two at once. But most of them are a construction checklist, and
 * the person reading is usually still deciding whether to look at the land at all. Ordered by
 * stage, the nine that bear on that decision come first and the thirteen that do not fold away —
 * nothing is removed, and the reader stops being handed an architect's to-do list on day one.
 *
 * Derived from the action's own domain and id prefix, so a new action lands somewhere sensible
 * without this mapping being updated: anything about the site or a drawing is design-stage, an
 * approval is permit-stage, and everything else bears on the decision to buy.
 */
type Stage = "SCREENING" | "DESIGN" | "PERMIT";

const STAGE_ORDER: readonly Stage[] = ["SCREENING", "DESIGN", "PERMIT"];

function stageOf(action: Action): Stage {
  if (action.action_id.startsWith("approval.")) return "PERMIT";
  if (action.domain === "SURVEY_AND_SITE") return "DESIGN";
  return "SCREENING";
}

/**
 * Actions the reader can discharge on the intake form, rather than at a government office.
 *
 * The whole list used to be presented at one pitch, so "measure the road outside" sat among "obtain
 * the title deed" and inherited its weight — and a reader who could have unblocked three rules with
 * a tape measure read the screen as a wall. These are the site facts `propertyIntakeSchema` accepts
 * and nothing else: the ids come from the rule pack's inputs, and an action only appears at all
 * because this run found the field blank.
 *
 * Kept here rather than in the contract because which facts are typeable is a property of this
 * form, not of the analysis. Adding a field to the form is what should move an item between these
 * two groups, and doing it in one file keeps that true.
 */
const ANSWERABLE_ON_FORM = new Set(["legal-input.road_width", "legal-input.water_body_width"]);

/**
 * A date a Thai reader can read.
 *
 * The envelope carries ISO, which is right for a wire format and wrong on screen: "2026-09-17" is
 * not how anyone here writes a date, and this interface is Thai throughout. Falls back to the raw
 * string rather than throwing, since a date that cannot be formatted is still worth showing.
 */
function thaiDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * One item of work: what to get, and — folded — why it matters.
 *
 * The three explanation lines used to print on every row. With the twenty-odd actions a real run
 * produces, that made this one panel 8,366 of the overview's 10,614 characters: four fifths of the
 * first screen a reader sees, in dense grey small print, which is how a list of next steps turns
 * into a wall nobody reads. The steps themselves are the scannable part and stay; the reasoning is
 * one click away per row, and no action, reason or source has been removed — docs/output-policy.md
 * §7 requires the structured action to carry all of it, and it still does. §3's rule against
 * collapsing applies to the academic disclaimer, which is not here and is not folded.
 *
 * The priority badge is deliberately not `--color-fail`. That colour means a validator returned
 * FAIL — a requirement this land does not meet — and spending it on "we have not checked this yet"
 * told readers the analysis had found something wrong when it had found something absent. An
 * outstanding step is signature blue; a failed check keeps the red.
 */
function ActionItem({ action }: { action: Action }) {
  const blocking = action.priority === "BLOCKING";
  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-medium text-sm">{action.target_th}</span>
        <span
          className="rounded-pill px-2.5 py-0.5 text-xs"
          style={{
            backgroundColor: blocking
              ? "var(--color-signature-wash)"
              : "var(--color-surface-sunken)",
            color: blocking ? "var(--color-signature-text)" : "var(--color-ink-muted)",
          }}
        >
          {PRIORITY_LABELS[action.priority] ?? action.priority}
        </span>
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-signature-text text-xs">
          {th.finalResult.actionWhyToggle}
        </summary>
        <p className="mt-1 text-ink-muted text-xs leading-relaxed">
          {th.finalResult.whyLabel}: {action.why_th}
        </p>
        <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
          {th.finalResult.sourceLabel}: {action.suggested_source_th}
        </p>
        <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
          {th.finalResult.couldChangeLabel}: {action.could_change_th}
        </p>
        {/* The law, named so it can be looked up. The pack has carried the instrument, the clause
            and a link to the text all along; the screen was printing "mr55.c41.1" instead, which
            is a database key and tells a reader nothing they can check. */}
        {action.legal_basis_th && (
          <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">
            <span className="font-medium">{th.finalResult.legalBasisLabel}: </span>
            {action.legal_basis_th}
            {action.legal_url && (
              <>
                {" · "}
                <a
                  href={action.legal_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ color: "var(--color-signature-text)" }}
                >
                  {th.finalResult.legalTextLink}
                </a>
              </>
            )}
          </p>
        )}
        {action.legal_text_th && (
          <p className="mt-1 border-border border-l-2 pl-2.5 text-ink-muted text-xs leading-relaxed">
            {action.legal_text_th}
          </p>
        )}
      </details>
    </li>
  );
}

function ActionList({ actions }: { actions: readonly Action[] }) {
  return (
    <ul className="mt-2">
      {actions.map((action) => (
        <ActionItem key={action.action_id} action={action} />
      ))}
    </ul>
  );
}

/** What this run actually did, counted from what it produced. */
export interface WorkDone {
  readonly evidenceItems: number;
  readonly concepts: number;
  readonly rulesChecked: number;
}

export function FinalResultPanel({
  final,
  intake,
  work,
}: {
  final: FinalAnalysisView | undefined | null;
  /** The request that produced this run, so the form can reopen filled in. Absent after a reload. */
  intake?: Record<string, unknown> | undefined;
  /** Counted by the caller, which is the only place that holds the partial artefacts. */
  work?: WorkDone | undefined;
}) {
  const [params] = useSearchParams();
  // Keep whatever else the URL carries; only the open topic changes.
  const conceptsSearch = (() => {
    const next = new URLSearchParams(params);
    next.set("view", "concepts");
    return next.toString();
  })();

  if (!final) {
    return null;
  }

  // What the reader can settle themselves comes out of the domain grouping entirely, because the
  // point of the split is that these two kinds of work happen in different places on different days.
  const selfServe = final.verification_actions.filter((a) => ANSWERABLE_ON_FORM.has(a.action_id));
  const rest = final.verification_actions.filter((a) => !ANSWERABLE_ON_FORM.has(a.action_id));

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    actions: rest.filter((action) => stageOf(action) === stage),
  })).filter((group) => group.actions.length > 0);

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="font-bold text-xl tracking-tight">{th.finalResult.heading}</h2>

      {/*
        What the run did, before what it could not do.

        "หลักฐานยังไม่เพียงพอ" used to open this panel at 2xl in the amber reserved for a partial
        verdict, and it is the same words on every run in every province — `economic_components_
        available` is a hardcoded false, so no input a reader can supply changes it. A fixed
        sentence rendered as the loudest thing on the screen reads as a broken program rather than
        as a scope, and buries the work that was genuinely done directly beneath it.

        So the counts come first, and the status keeps every word the policy fixes but stops being
        a headline. docs/output-policy.md §5 fixes the wording of the status sentence, not its type
        size, and §3's rule about emphasis is about the academic disclaimer, which is not here.
      */}
      {work && (
        <p className="mt-2 text-sm leading-relaxed">
          {th.finalResult.leadSentence
            .replace("{evidence}", work.evidenceItems.toLocaleString("th-TH"))
            .replace("{concepts}", work.concepts.toLocaleString("th-TH"))
            .replace("{rules}", work.rulesChecked.toLocaleString("th-TH"))}
        </p>
      )}
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">
        {th.finalResult.leadStatus.replace("{status}", STATUS_LABELS[final.status] ?? final.status)}
      </p>

      {work && (
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            [th.finalResult.workEvidence, work.evidenceItems],
            [th.finalResult.workConcepts, work.concepts],
            [th.finalResult.workRules, work.rulesChecked],
          ]
            .filter(([, count]) => (count as number) > 0)
            .map(([label, count]) => (
              <div key={label as string} className="rounded-card bg-surface-sunken p-3">
                <dt className="text-ink-muted text-xs">{label as string}</dt>
                <dd className="mt-0.5 font-bold text-lg tabular-nums">
                  {(count as number).toLocaleString("th-TH")}
                </dd>
              </div>
            ))}
        </dl>
      )}

      <p className="mt-1 text-ink-muted text-sm">
        {th.finalResult.analysedOn} {thaiDate(final.analysed_on)}
      </p>

      {final.evaluated_concepts_th.length > 0 && (
        <section className="mt-5">
          <h3 className="font-semibold">{th.finalResult.evaluatedHeading}</h3>
          <p className="text-ink-muted text-xs">{th.finalResult.evaluatedNote}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {final.evaluated_concepts_th.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          {/* The topic is owned by the URL, so this is a link rather than a handler: it works from
              the rail, the tab strip and here, and a reader can go back to the overview. */}
          <Link
            to={{ search: conceptsSearch }}
            replace
            className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            <ArrowRight size={13} aria-hidden="true" />
            {th.finalResult.evaluatedOpen}
          </Link>
        </section>
      )}

      {final.missing_basis_th.length > 0 && (
        <section className="mt-5">
          <h3 className="font-semibold">{th.finalResult.missingHeading}</h3>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
            {final.missing_basis_th.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/*
        The scope and status statements, after the work rather than before it.

        Both are required verbatim and both are still here at full size, unfolded — docs/output-
        policy.md §4 and §5 fix their wording, not their position, and §3's placement rule is about
        the academic disclaimer, which the page prints above the topic panels and which the e2e
        suite asserts on every tab at both widths. What changed is the order: three paragraphs of
        what the analysis could not do used to come before the two ideas it did produce, so the
        screen opened on its own limits and a reader never reached the content. The statements read
        as the qualification they are once there is something to qualify.
      */}
      <p className="mt-6 text-sm leading-relaxed">
        <span className="font-semibold">{th.finalResult.scopeLabel}: </span>
        {final.scope_statement_th}
      </p>

      <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {final.status_statement_th}
      </p>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <ClipboardCheck size={17} aria-hidden="true" />
          {th.finalResult.verificationHeading}
        </h3>
        {/* Said before the list, because the list is what a reader takes for a verdict otherwise. */}
        <p className="mt-1 text-ink-muted text-xs leading-relaxed">
          {th.finalResult.verificationIntro}
        </p>
        <p className="mt-0.5 text-ink-muted text-xs">{th.finalResult.verificationNote}</p>

        {/* First, because it is the only part the reader can act on without leaving the screen. */}
        {selfServe.length > 0 && (
          <div
            className="mt-4 rounded-card p-4"
            style={{ backgroundColor: "var(--color-signature-wash)" }}
          >
            <h4
              className="flex items-center gap-2 font-semibold text-sm"
              style={{ color: "var(--color-signature-text)" }}
            >
              <PencilLine size={15} aria-hidden="true" />
              {th.finalResult.selfHeading}
            </h4>
            <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.finalResult.selfNote}</p>
            <ul className="mt-2">
              {selfServe.map((action) => (
                <ActionItem key={action.action_id} action={action} />
              ))}
            </ul>
            {/* Carries the run's own intake so the form reopens on this place with what was
                already given, rather than sending the reader back to an empty first screen. */}
            <Link
              to="/"
              state={intake ? { intake } : undefined}
              className="mt-3 inline-flex items-center gap-1.5 rounded-pill px-4 py-2 font-semibold text-sm"
              style={{
                backgroundColor: "var(--color-signature)",
                color: "var(--color-signature-on)",
              }}
            >
              {th.finalResult.selfCta}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}

        {/*
          The screening stage is open; design and permit fold away.

          Someone deciding whether this land is worth a second look needs the zoning, the local
          bylaws and the title — items that can end the question. They do not yet need the eight
          figures that come off an architectural drawing for a building nobody has designed. Both
          are still here, and the count on each fold says how many are inside, so folding hides
          nothing: it puts thirteen construction-stage items behind one line instead of in front of
          a reader who has not bought anything.
        */}
        {byStage.map((group) => {
          const label = STAGE_LABELS[group.stage];
          return group.stage === "SCREENING" ? (
            <div key={group.stage} className="mt-5">
              <h4 className="font-semibold text-sm">{label}</h4>
              <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
                {STAGE_NOTES[group.stage]}
              </p>
              <ActionList actions={group.actions} />
            </div>
          ) : (
            <details key={group.stage} className="mt-4">
              <summary className="cursor-pointer font-medium text-signature-text text-sm">
                {label} ({group.actions.length.toLocaleString("th-TH")})
              </summary>
              <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
                {STAGE_NOTES[group.stage]}
              </p>
              <ActionList actions={group.actions} />
            </details>
          );
        })}
      </section>

      <p className="mt-5 text-ink-muted text-xs">
        {th.finalResult.policyLabel}: {final.output_policy_version}
      </p>
    </section>
  );
}
