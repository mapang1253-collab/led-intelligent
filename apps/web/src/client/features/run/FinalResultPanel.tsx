import { th } from "@reis/i18n";
import { ArrowRight, ClipboardCheck, PencilLine, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
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
const DOMAIN_LABELS = th.verificationDomain as Record<string, string>;
const PRIORITY_LABELS = th.verificationPriority as Record<string, string>;

const DOMAIN_ORDER = [
  "TITLE_AND_IDENTITY",
  "LAW_AND_PLANNING",
  "SURVEY_AND_SITE",
  "MARKET_AND_FINANCE",
  "SOURCE_CURRENCY",
] as const;

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

type Action = FinalAnalysisView["verification_actions"][number];

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
      </details>
    </li>
  );
}

export function FinalResultPanel({
  final,
  intake,
}: {
  final: FinalAnalysisView | undefined | null;
  /** The request that produced this run, so the form can reopen filled in. Absent after a reload. */
  intake?: Record<string, unknown> | undefined;
}) {
  if (!final) {
    return null;
  }

  // What the reader can settle themselves comes out of the domain grouping entirely, because the
  // point of the split is that these two kinds of work happen in different places on different days.
  const selfServe = final.verification_actions.filter((a) => ANSWERABLE_ON_FORM.has(a.action_id));
  const rest = final.verification_actions.filter((a) => !ANSWERABLE_ON_FORM.has(a.action_id));

  const byDomain = DOMAIN_ORDER.map((domain) => ({
    domain,
    actions: rest.filter((action) => action.domain === domain),
  })).filter((group) => group.actions.length > 0);

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="font-bold text-xl tracking-tight">{th.finalResult.heading}</h2>

      <p className="mt-2 font-bold text-2xl" style={{ color: "var(--color-partial)" }}>
        {STATUS_LABELS[final.status] ?? final.status}
      </p>
      <p className="mt-1 text-ink-muted text-sm">
        {th.finalResult.analysedOn} {thaiDate(final.analysed_on)}
      </p>

      {/* The academic disclaimer is NOT repeated here. §3 requires it above anything quotable and
          never only in a collapsed area, and the page prints it above the topic panels, where it
          stays on screen whichever topic is open — which the e2e suite asserts on every tab and at
          both widths. Printing the same seven dense lines a second time, a screen apart, taught a
          reader to skip them, which is the one outcome the rule exists to prevent. */}
      <p className="mt-4 text-sm leading-relaxed">
        <span className="font-semibold">{th.finalResult.scopeLabel}: </span>
        {final.scope_statement_th}
      </p>

      <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {final.status_statement_th}
      </p>

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

      {final.evaluated_concepts_th.length > 0 && (
        <section className="mt-5">
          <h3 className="font-semibold">{th.finalResult.evaluatedHeading}</h3>
          <p className="text-ink-muted text-xs">{th.finalResult.evaluatedNote}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {final.evaluated_concepts_th.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
      )}

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

        {byDomain.length > 0 && (
          <h4 className="mt-5 font-semibold text-sm">{th.finalResult.obtainHeading}</h4>
        )}
        {byDomain.map((group) => (
          <div key={group.domain} className="mt-4">
            <h5 className="font-medium text-ink-muted text-sm">
              {DOMAIN_LABELS[group.domain] ?? group.domain}
            </h5>
            <ul className="mt-2">
              {group.actions.map((action) => (
                <ActionItem key={action.action_id} action={action} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="mt-5 text-ink-muted text-xs">
        {th.finalResult.policyLabel}: {final.output_policy_version}
      </p>
    </section>
  );
}
