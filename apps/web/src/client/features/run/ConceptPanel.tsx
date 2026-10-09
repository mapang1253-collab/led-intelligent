import { th } from "@reis/i18n";
import { Check, ChevronDown, CircleHelp, Info, Lightbulb, X } from "lucide-react";
import { useState } from "react";
import { Caveat } from "./Caveat.js";
import { Notice } from "./Notice.js";
import { PanelHeading } from "./PanelHeading.js";
import { groupMissingInputs } from "./missingInputs.js";
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
  const unresolved = outcome.applicability === "UNRESOLVED";
  return (
    <li className="border-border border-b py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          {outcome.title_th}
          <span className="ml-2 text-ink-muted text-xs">{outcome.clause_th}</span>
        </span>
        <StatusChip status={outcome.status} />
      </div>
      {/* A rule that might or might not reach this land is not the same as one that does. */}
      {unresolved && (
        <p className="mt-1 text-ink-muted text-xs">{th.concepts.unresolvedApplicability}</p>
      )}
      {/* What the rule demands of this land, stated whether or not a verdict is possible yet. */}
      {outcome.requirement_th && (
        <p className="mt-1 font-medium text-sm">
          {th.concepts.requirementLabel}: {outcome.requirement_th}
        </p>
      )}
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

/** A small muted heading, so a reader can see where one part of a card ends and the next begins. */
function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-border border-t pt-3">
      <h4 className="font-semibold text-ink-muted text-xs">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

/**
 * One concept, ordered the way someone deciding anything reads it.
 *
 * What you would build comes first and in the largest type, because "อาคารอยู่อาศัยรวม" is the one
 * concrete thing on the card; it used to be a grey line three paragraphs down. Then why it was
 * proposed, then who is supposed to want it and what would show they do not, then what could go
 * wrong, then the law. Nine paragraphs of identical weight became five labelled parts.
 *
 * Nothing was dropped and nothing was softened: every sentence the model wrote is still here, in
 * its own words, and the counter-evidence still sits in the same breath as the claim it defeats.
 * The order changed, not the content — and no order is implied between concepts, which remain
 * unranked for the reason the panel's own comment gives.
 */
export interface StatedScale {
  readonly storeys: number | null;
  readonly heightMetres: number | null;
}

/** The reader's stated scale as one short line, or null when they stated nothing. */
function statedScaleText(scale: StatedScale | undefined): string | null {
  if (!scale) {
    return null;
  }
  const parts: string[] = [];
  if (scale.storeys !== null) {
    parts.push(`${scale.storeys.toLocaleString("th-TH")} ${th.concepts.statedScaleStorey}`);
  }
  if (scale.heightMetres !== null) {
    parts.push(`${scale.heightMetres.toLocaleString("th-TH")} ${th.concepts.statedScaleHeight}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ConceptCardView({
  concept,
  statedScale,
}: { concept: ConceptCard; statedScale?: StatedScale }) {
  const [open, setOpen] = useState(false);
  const missingGroups = groupMissingInputs(concept.legal?.outcomes ?? []);
  const stated = statedScaleText(statedScale);
  return (
    <article className="mt-4 rounded-card bg-surface-sunken p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The building type is the eyebrow: it is what this concept actually is. */}
          <p className="font-semibold text-signature-text text-xs">{concept.building_type_th}</p>
          <h3 className="mt-0.5 font-bold text-lg leading-snug">{concept.label_th}</h3>
        </div>
        {concept.legal && <StatusChip status={concept.legal.status} />}
      </div>

      <p className="mt-2 text-sm leading-relaxed">{concept.description_th}</p>

      <CardSection title={th.concepts.whyHeading}>
        <p className="text-sm leading-relaxed">{concept.supporting_reason_th}</p>
      </CardSection>

      <CardSection title={th.concepts.demandLabel}>
        {concept.demand_hypotheses.map((hypothesis) => (
          <div key={hypothesis.mechanism_th} className="mt-2 first:mt-0 text-sm leading-relaxed">
            <p>
              <span className="text-ink-muted text-xs">{th.concepts.demandGroupLabel}: </span>
              <span className="font-medium">{hypothesis.population_th}</span>
            </p>
            <p className="mt-0.5">
              <span className="text-ink-muted text-xs">{th.concepts.demandMechanismLabel}: </span>
              {hypothesis.mechanism_th}
            </p>
            {/* Every hypothesis shows what would defeat it, in the same breath as the claim. */}
            <Caveat>
              {th.concepts.counterLabel}: {hypothesis.counter_evidence_th}
            </Caveat>
          </div>
        ))}
      </CardSection>

      <CardSection title={th.concepts.riskHeading}>
        <p className="text-sm leading-relaxed">{concept.uncertainty_th}</p>
        {concept.unmapped_activities_th.length > 0 && (
          <p className="mt-2 text-ink-muted text-xs">
            {th.concepts.unmappedLabel}: {concept.unmapped_activities_th.join(", ")}
          </p>
        )}
      </CardSection>

      {concept.legal && (
        <CardSection title={th.concepts.legalHeading}>
          {/* The verdict as a verdict, on its own line, rather than tacked onto a link. */}
          <p className="text-sm leading-relaxed">{concept.legal.status_reason_th}</p>

          {concept.legal.approval_required.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="text-ink-muted text-xs">{th.concepts.approvalLabel}: </span>
              {concept.legal.approval_required
                .map((item) => `${item.title_th} (${item.clause_th})`)
                .join(", ")}
            </p>
          )}

          {/*
            Provenance for the scale, where the reader supplied one (docs/adr/0010).

            Which rules appear below depends on it, so the figures that decided that have to be
            on the screen beside them — and named as the reader's own intention, not as something
            measured, or the list would read as a finding about the land.

            Above the checklist, not below it, because of the question it answers. A reader who
            has just typed "14 เมตร" and then reads "ความสูงอาคาร" in a list of things still
            needed will ask why they are being asked twice; the answer is that a figure they
            stated can choose which rules apply and cannot settle one, and they should have it
            before the list rather than after.
          */}
          {stated !== null && (
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">
              <span className="font-medium text-ink">
                {th.concepts.statedScaleLabel} ({stated})
              </span>{" "}
              {th.concepts.statedScaleNote}
            </p>
          )}

          {/*
            What is still needed, grouped by where to get it.

            Above the per-rule list rather than inside it, because it answers the question a
            reader actually has when most rules come back UNKNOWN: is this a gap in the system, or
            a gap in what exists yet about this plot? Four lines say it is the second, and say
            which drawing or measurement would settle the most rules at once. The rules keep their
            own lists below; this takes nothing away from them.
          */}
          {missingGroups.length > 0 && (
            <div className="mt-3 rounded-card border border-border border-l-2 border-l-signature bg-surface-sunken p-3">
              <p className="font-semibold text-ink text-xs">{th.concepts.missingInputsHeading}</p>
              <ul className="mt-2 space-y-1.5">
                {missingGroups.map((group) => (
                  <li key={group.source_th} className="text-xs leading-relaxed">
                    <span className="font-medium">{group.source_th}</span>
                    <span className="text-ink-muted">
                      {" — "}
                      {group.rule_count} {th.concepts.missingInputsRuleCount}
                      {": "}
                      {group.labels_th.join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 max-w-prose text-ink-muted text-xs leading-relaxed">
                {th.concepts.missingInputsNote}
              </p>
            </div>
          )}

          {/* Notice, not Caveat. Every other per-item caveat on these screens is a note; this one
              is the difference between "the setback rule passes" and "this land may be built on",
              and a reader who conflates the two can lose money on it. */}
          <Notice>{th.concepts.legalDisclaimer}</Notice>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="mt-2 flex items-center gap-1.5 font-medium text-signature-text text-sm"
          >
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={open ? "" : "-rotate-90 transition-transform"}
            />
            {th.concepts.legalDetailsToggle} ({concept.legal.outcomes.length})
          </button>

          {open && (
            <ul className="mt-2">
              {concept.legal.outcomes.map((outcome) => (
                <RuleRow key={outcome.rule_id} outcome={outcome} />
              ))}
            </ul>
          )}
        </CardSection>
      )}
    </article>
  );
}

export function ConceptPanel({
  concepts,
  stageReason,
  mode,
  statedScale,
}: {
  concepts: readonly ConceptCard[] | undefined;
  stageReason: string | undefined;
  mode: string | undefined;
  /** What the reader said they mean to build, if anything (docs/adr/0010). */
  statedScale?: StatedScale;
}) {
  if (!concepts || concepts.length === 0) {
    const message = stageReason ? FAILURE_LABELS[stageReason] : undefined;
    return (
      <section className="glass mt-5 rounded-card p-6">
        <PanelHeading icon={Lightbulb}>{th.concepts.heading}</PanelHeading>
        <p className="mt-3 font-semibold">
          {stageReason === "AI_NO_DEFENSIBLE_CONCEPTS"
            ? th.concepts.noneHeading
            : stageReason === "AI_DISABLED" || stageReason === undefined
              ? th.concepts.disabledHeading
              : th.concepts.failedHeading}
        </p>
        <p className="mt-1 flex items-start gap-2 max-w-prose text-ink-muted text-sm leading-relaxed">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {message ?? th.concepts.disabledBody}
        </p>
      </section>
    );
  }

  return (
    <section className="glass mt-5 rounded-card p-6">
      <PanelHeading icon={Lightbulb}>{th.concepts.heading}</PanelHeading>
      <p className="mt-1 max-w-prose text-ink-muted text-sm leading-relaxed">{th.concepts.intro}</p>

      {/* Where these came from. A recorded fixture must never be mistaken for a model's output. */}
      <p className="mt-2 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {mode === "RECORDED_AI" ? th.concepts.fixtureNotice : th.concepts.liveNotice}
      </p>

      {/* The model cites evidence by id inside its own prose. The sentence is left exactly as it
          wrote it — the citation is the audit trail — but a reader meeting "ev9" for the first time
          should be told what it is rather than left to guess. */}
      <p className="mt-1 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {th.concepts.citationNote}
      </p>

      {concepts.map((concept) => (
        <ConceptCardView
          key={concept.concept_id}
          concept={concept}
          {...(statedScale ? { statedScale } : {})}
        />
      ))}
    </section>
  );
}
