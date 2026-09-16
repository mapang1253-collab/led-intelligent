import { th } from "@reis/i18n";
import { ClipboardCheck, ShieldAlert, TriangleAlert } from "lucide-react";
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

export function FinalResultPanel({ final }: { final: FinalAnalysisView | undefined | null }) {
  if (!final) {
    return null;
  }

  const byDomain = DOMAIN_ORDER.map((domain) => ({
    domain,
    actions: final.verification_actions.filter((action) => action.domain === domain),
  })).filter((group) => group.actions.length > 0);

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="font-bold text-xl tracking-tight">{th.finalResult.heading}</h2>

      <p className="mt-2 font-bold text-2xl" style={{ color: "var(--color-partial)" }}>
        {STATUS_LABELS[final.status] ?? final.status}
      </p>
      <p className="mt-1 text-ink-muted text-sm">
        {th.finalResult.analysedOn} {final.analysed_on}
      </p>

      {/* §3: immediately after scope/date/status, above anything quotable, never collapsed. */}
      <p
        className="mt-4 flex items-start gap-2.5 rounded-card p-4 text-sm leading-relaxed"
        style={{
          backgroundColor: "var(--color-partial-soft)",
          color: "var(--color-partial)",
          border: "1px solid color-mix(in srgb, var(--color-partial) 35%, transparent)",
        }}
      >
        <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        {final.disclaimer_th}
      </p>

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
        <p className="text-ink-muted text-xs">{th.finalResult.verificationNote}</p>

        {byDomain.map((group) => (
          <div key={group.domain} className="mt-4">
            <h4 className="font-medium text-ink-muted text-sm">
              {DOMAIN_LABELS[group.domain] ?? group.domain}
            </h4>
            <ul className="mt-2">
              {group.actions.map((action) => (
                <li key={action.action_id} className="border-border border-b py-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium text-sm">{action.target_th}</span>
                    <span
                      className="rounded-pill px-2.5 py-0.5 text-xs"
                      style={{
                        backgroundColor:
                          action.priority === "BLOCKING"
                            ? "color-mix(in srgb, var(--color-fail) 16%, transparent)"
                            : "var(--color-surface-sunken)",
                        color:
                          action.priority === "BLOCKING"
                            ? "var(--color-fail)"
                            : "var(--color-ink-muted)",
                      }}
                    >
                      {PRIORITY_LABELS[action.priority] ?? action.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted text-xs leading-relaxed">
                    {th.finalResult.whyLabel}: {action.why_th}
                  </p>
                  <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
                    {th.finalResult.sourceLabel}: {action.suggested_source_th}
                  </p>
                  <p className="mt-0.5 text-ink-muted text-xs leading-relaxed">
                    {th.finalResult.couldChangeLabel}: {action.could_change_th}
                  </p>
                </li>
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
