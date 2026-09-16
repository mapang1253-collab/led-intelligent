import { th } from "@reis/i18n";
import { Check, CircleHelp, Info, Lightbulb, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import type { ConceptCard, RuleOutcomeView } from "./useAnalysisRun.js";

/**
 * Proposed concepts and the screen applied to them (docs/output-policy.md).
 *
 * The layout keeps the two apart on purpose. A concept is a proposal written by a model; the legal
 * result beneath it comes from a deterministic validator the model never saw. Nothing here ranks
 * the concepts or calls one of them best — that decision belongs to stages that do not exist yet,
 * and presenting an order would imply one had been made.
 */

const STATUS_LABELS = th.validationStatus as Record<string, string>;
const FAILURE_LABELS = th.aiFailure as Record<string, string>;

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "PASS"
      ? "var(--color-pass)"
      : status === "FAIL"
        ? "var(--color-fail)"
        : status === "PARTIAL"
          ? "var(--color-partial)"
          : "var(--color-unknown)";
  const Icon = status === "PASS" ? Check : status === "FAIL" ? X : CircleHelp;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-semibold text-xs"
      style={{ backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
    >
      <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function RuleRow({ outcome }: { outcome: RuleOutcomeView }) {
  return (
    <li className="border-border border-b py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          {outcome.title_th}
          <span className="ml-2 text-ink-muted text-xs">{outcome.clause_th}</span>
        </span>
        <StatusChip status={outcome.status} />
      </div>
      <p className="mt-1 text-ink-muted text-xs leading-relaxed">{outcome.explanation_th}</p>
      {outcome.missing_inputs.length > 0 && (
        <p className="mt-1 text-ink-muted text-xs">
          {th.concepts.missingInputsLabel}:{" "}
          {outcome.missing_inputs
            .map((input) => `${input.label_th} (${input.obtained_from_th})`)
            .join(", ")}
        </p>
      )}
    </li>
  );
}

function ConceptCardView({ concept }: { concept: ConceptCard }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="mt-4 rounded-card bg-surface-sunken p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-bold text-lg">{concept.label_th}</h3>
        {concept.legal && <StatusChip status={concept.legal.status} />}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{concept.description_th}</p>
      <p className="mt-2 text-ink-muted text-sm leading-relaxed">{concept.supporting_reason_th}</p>

      <p className="mt-3 text-ink-muted text-xs">
        {th.concepts.buildingTypeLabel}: {concept.building_type_th}
      </p>

      {/* The proposal's own stated uncertainty sits with the proposal, not in a footnote. */}
      <p
        className="mt-3 flex items-start gap-2 rounded-card p-3 text-sm leading-relaxed"
        style={{ backgroundColor: "var(--color-partial-soft)", color: "var(--color-partial)" }}
      >
        <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {th.concepts.uncertaintyLabel}: {concept.uncertainty_th}
        </span>
      </p>

      {concept.unmapped_activities_th.length > 0 && (
        <p className="mt-2 text-ink-muted text-xs">
          {th.concepts.unmappedLabel}: {concept.unmapped_activities_th.join(", ")}
        </p>
      )}

      <section className="mt-4">
        <h4 className="font-semibold text-sm">{th.concepts.demandLabel}</h4>
        {concept.demand_hypotheses.map((hypothesis) => (
          <div key={hypothesis.mechanism_th} className="mt-2 text-sm">
            <p>
              {hypothesis.population_th} — {hypothesis.mechanism_th}
            </p>
            {/* Every hypothesis shows what would defeat it, in the same breath as the claim. */}
            <p className="mt-0.5 text-ink-muted text-xs">
              {th.concepts.counterLabel}: {hypothesis.counter_evidence_th}
            </p>
          </div>
        ))}
      </section>

      {concept.legal && (
        <section className="mt-4">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="font-medium text-signature-text text-sm"
          >
            {th.concepts.legalHeading} — {concept.legal.status_reason_th}
          </button>

          {open && (
            <div className="mt-3">
              <p className="text-ink-muted text-xs leading-relaxed">
                {th.concepts.legalDisclaimer}
              </p>
              {concept.legal.approval_required.length > 0 && (
                <p className="mt-2 text-sm">
                  {th.concepts.approvalLabel}:{" "}
                  {concept.legal.approval_required
                    .map((item) => `${item.title_th} (${item.clause_th})`)
                    .join(", ")}
                </p>
              )}
              <ul className="mt-2">
                {concept.legal.outcomes.map((outcome) => (
                  <RuleRow key={outcome.rule_id} outcome={outcome} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </article>
  );
}

export function ConceptPanel({
  concepts,
  stageReason,
}: {
  concepts: readonly ConceptCard[] | undefined;
  stageReason: string | undefined;
}) {
  if (!concepts || concepts.length === 0) {
    const message = stageReason ? FAILURE_LABELS[stageReason] : undefined;
    return (
      <section className="glass mt-5 rounded-card p-6">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <Lightbulb size={19} aria-hidden="true" />
          {th.concepts.heading}
        </h2>
        <p className="mt-3 font-semibold">
          {stageReason === "AI_NO_DEFENSIBLE_CONCEPTS"
            ? th.concepts.noneHeading
            : stageReason === "AI_DISABLED" || stageReason === undefined
              ? th.concepts.disabledHeading
              : th.concepts.failedHeading}
        </p>
        <p className="mt-1 flex items-start gap-2 text-ink-muted text-sm leading-relaxed">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {message ?? th.concepts.disabledBody}
        </p>
      </section>
    );
  }

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Lightbulb size={19} aria-hidden="true" />
        {th.concepts.heading}
      </h2>
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.concepts.intro}</p>
      {concepts.map((concept) => (
        <ConceptCardView key={concept.concept_id} concept={concept} />
      ))}
    </section>
  );
}
