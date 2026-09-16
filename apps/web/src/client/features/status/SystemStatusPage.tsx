import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Activity, CircleCheck, CircleSlash, Database, Gavel, Sparkles } from "lucide-react";

/**
 * System status.
 *
 * Every "there is no data for this area" the app prints should be checkable, and this is where it
 * is checked: which sources are switched on, how many figures each holds, who reviewed them, what
 * version of the rule pack and the valuation method would execute, and how much of today's AI
 * allowance is left.
 *
 * Inactive sources are listed rather than hidden. A status screen that shows only what is running
 * cannot answer the question it exists for.
 */

interface SourceStatus {
  product_id: string;
  title_th: string;
  attribution_th: string;
  activation_state: string;
  coverage_note_th: string | null;
  observations: number;
  reviewers: string[] | null;
  reviewed_at: string | null;
}

interface ReviewedArtefact {
  version: string;
  title_th: string;
  lifecycle_state: string;
  rule_count?: number;
  reviewers: string[] | null;
  reviewed_on: string | null;
}

interface SystemStatus {
  sources: SourceStatus[];
  legal_pack: ReviewedArtefact;
  valuation_method: ReviewedArtefact;
  ai: {
    mode: string;
    model: string;
    calls_today: number;
    outcomes: { outcome: string; n: number }[];
    daily_limit: number | null;
    usable_today: number | null;
  };
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Icon size={19} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** State as a word plus a mark, never a colour alone. */
function StateBadge({ state }: { state: string }) {
  const good = state === "ACTIVE" || state === "ACADEMIC_REVIEWED";
  const Icon = good ? CircleCheck : CircleSlash;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 font-medium text-xs"
      style={{
        backgroundColor: good ? "var(--color-pass-soft)" : "var(--color-unknown-soft)",
        color: good ? "var(--color-pass)" : "var(--color-unknown)",
      }}
    >
      <Icon size={13} aria-hidden="true" />
      {(th.status.state as Record<string, string>)[state] ?? state}
    </span>
  );
}

function ReviewedRow({ artefact, id }: { artefact: ReviewedArtefact; id: string }) {
  return (
    <div className="mt-3 border-border border-b pb-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className="font-medium text-sm">
          {artefact.title_th}
          <span className="block text-ink-muted text-xs">
            {id} v{artefact.version}
            {artefact.rule_count !== undefined && ` · ${artefact.rule_count} ${th.status.rules}`}
          </span>
        </p>
        <StateBadge state={artefact.lifecycle_state} />
      </div>
      <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">
        {artefact.reviewers && artefact.reviewers.length > 0
          ? `${th.status.reviewedBy} ${artefact.reviewers.join(", ")}${artefact.reviewed_on ? ` · ${artefact.reviewed_on}` : ""}`
          : th.status.notReviewed}
      </p>
    </div>
  );
}

export function SystemStatusPage() {
  const status = useQuery({
    queryKey: ["system-status"],
    queryFn: async (): Promise<SystemStatus> => {
      const response = await fetch("/api/v1/system-status", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`system-status failed: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });

  const data = status.data;
  const active = data?.sources.filter((source) => source.activation_state === "ACTIVE") ?? [];
  const totalFigures = active.reduce((sum, source) => sum + source.observations, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:py-12">
      <h1 className="font-bold text-3xl tracking-tight">{th.status.heading}</h1>
      <p className="mt-2 text-ink-muted text-sm leading-relaxed">{th.status.intro}</p>

      {status.isLoading && <p className="mt-6 text-ink-muted text-sm">{th.status.loading}</p>}
      {status.isError && (
        <p className="mt-6 text-sm" style={{ color: "var(--color-fail)" }}>
          {th.status.failed}
        </p>
      )}

      {data && (
        <>
          <Section icon={Database} title={th.status.sourcesHeading}>
            <p className="mt-1 text-ink-muted text-sm">
              {th.status.sourcesSummary
                .replace("{active}", String(active.length))
                .replace("{total}", String(data.sources.length))
                .replace("{figures}", totalFigures.toLocaleString("th-TH"))}
            </p>
            <ul className="mt-4">
              {data.sources.map((source) => (
                <li key={source.product_id} className="border-border border-b py-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <p className="font-medium text-sm">
                      {source.title_th}
                      <span className="block text-ink-muted text-xs">{source.attribution_th}</span>
                    </p>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-ink-muted text-sm">
                        {source.observations.toLocaleString("th-TH")}
                      </span>
                      <StateBadge state={source.activation_state} />
                    </span>
                  </div>
                  {source.coverage_note_th && (
                    <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">
                      {source.coverage_note_th}
                    </p>
                  )}
                  {source.reviewers && source.reviewers.length > 0 && (
                    <p className="mt-1 text-ink-muted text-xs">
                      {th.status.reviewedBy} {source.reviewers.join(", ")}
                      {source.reviewed_at && ` · ${source.reviewed_at}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={Gavel} title={th.status.methodsHeading}>
            <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.status.methodsIntro}</p>
            <ReviewedRow artefact={data.legal_pack} id="th.cba.mr55" />
            <ReviewedRow artefact={data.valuation_method} id="th.valuation.assessed" />
          </Section>

          <Section icon={Sparkles} title={th.status.aiHeading}>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                [
                  th.status.aiMode,
                  (th.status.mode as Record<string, string>)[data.ai.mode] ?? data.ai.mode,
                ],
                [th.status.aiModel, data.ai.model],
                [
                  th.status.aiToday,
                  `${data.ai.calls_today.toLocaleString("th-TH")} ${th.status.times}`,
                ],
                [
                  th.status.aiRemaining,
                  data.ai.usable_today === null
                    ? th.status.aiNoBudget
                    : `${Math.max(0, data.ai.usable_today - data.ai.calls_today).toLocaleString("th-TH")} ${th.status.times}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-card bg-surface-sunken p-3">
                  <dt className="text-ink-muted text-xs">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            {data.ai.outcomes.length > 0 && (
              <>
                <p className="mt-4 font-medium text-ink-muted text-xs">{th.status.aiOutcomes}</p>
                <ul className="mt-1.5">
                  {data.ai.outcomes.map((outcome) => (
                    <li
                      key={outcome.outcome}
                      className="flex items-center justify-between border-border border-b py-2 text-sm last:border-b-0"
                    >
                      <span>
                        {(th.progress.stageReason as Record<string, string>)[outcome.outcome] ??
                          (outcome.outcome === "SUCCESS" ? th.status.aiSuccess : outcome.outcome)}
                      </span>
                      <span className="tabular-nums text-ink-muted">
                        {outcome.n.toLocaleString("th-TH")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <p className="mt-5 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Activity size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.status.footnote}
          </p>
        </>
      )}
    </main>
  );
}
