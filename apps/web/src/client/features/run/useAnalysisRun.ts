import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * Analysis-run client. The capability lives in an HttpOnly cookie, so requests only need
 * `credentials: "same-origin"` — the browser attaches it and JavaScript can never read it
 * (docs/security-privacy-compliance.md §3).
 */

export type RunState =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETE"
  | "PARTIAL"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "EXPIRED"
  | "CANCELLED";

export interface StageRecord {
  stage: string;
  state:
    | "PENDING"
    | "READY"
    | "RUNNING"
    | "SUCCEEDED"
    | "DEGRADED"
    | "FAILED"
    | "CANCELLED"
    | "SKIPPED";
  reason?: string;
  /** Set on a failed stage: whether running the same request again could plausibly get past it. */
  retryable?: boolean;
}

export interface EvidenceGroup {
  group_id: string;
  requirement_id: string;
  measure_name_th: string;
  area_label_th: string;
  source_title_th: string;
  attribution_th: string;
  geography_note_th: string;
  purpose_fitness: string;
  items: {
    observation_id: string;
    population_th: string;
    /** Set when the source published one number; null when it published a spread. */
    value: string | null;
    value_low: string | null;
    value_high: string | null;
    unit_name_th: string;
    period_th: string;
    source_note_th: string | null;
    temporal_match: string;
    disclosure_th: string;
  }[];
}

export interface RuleOutcomeView {
  rule_id: string;
  title_th: string;
  status: string;
  applicability: string;
  clause_th: string;
  instrument_th: string;
  explanation_th: string;
  requirement_th: string | null;
  missing_inputs: { input_id: string; label_th: string; unit: string; obtained_from_th: string }[];
}

export interface ConceptCard {
  concept_id: string;
  label_th: string;
  description_th: string;
  supporting_reason_th: string;
  uncertainty_th: string;
  building_type_th: string;
  unmapped_activities_th: string[];
  demand_hypotheses: {
    population_th: string;
    mechanism_th: string;
    counter_evidence_th: string;
  }[];
  legal: {
    status: string;
    status_reason_th: string;
    pack_id: string;
    pack_version: string;
    unresolved_inputs: { input_id: string; label_th: string; obtained_from_th: string }[];
    approval_required: { title_th: string; clause_th: string; explanation_th: string }[];
    outcomes: RuleOutcomeView[];
  } | null;
}

export interface VerificationActionView {
  action_id: string;
  domain: string;
  priority: string;
  target_th: string;
  why_th: string;
  suggested_source_th: string;
  could_change_th: string;
}

export interface FinalAnalysisView {
  status: string;
  status_reason: string;
  output_scope: string;
  output_policy_version: string;
  analysed_on: string;
  disclaimer_th: string;
  scope_statement_th: string;
  status_statement_th: string;
  missing_basis_th: string[];
  evaluated_concepts_th: string[];
  verification_actions: VerificationActionView[];
}

export interface RunEnvelope {
  run_id: string;
  run_state: RunState;
  requested_scope?: string;
  permitted_scope?: string;
  created_at?: string;
  expires_at?: string;
  stage_records?: StageRecord[];
  final_analysis: FinalAnalysisView | null;
  partial_artifacts?: {
    resolved_target?: {
      resolution_level: string;
      province_name_th: string;
      district_name_th: string;
      subdistrict_name_th: string;
      output_scope_ceiling: string;
    };
    evidence?: EvidenceGroup[];
    concepts?: ConceptCard[];
    candidate_search?: {
      mode: string;
      model: string;
      calls_made: number;
      repair_attempted: boolean;
      stop_reason: string;
      duplicates_merged: number;
    } | null;
  };
  errors?: { code: string; retryable: boolean }[];
  notices?: { code: string; retryable: boolean }[];
}

const TERMINAL: readonly RunState[] = [
  "COMPLETE",
  "PARTIAL",
  "FAILED_FINAL",
  "EXPIRED",
  "CANCELLED",
];

export function isTerminal(state: RunState | undefined): boolean {
  return state !== undefined && TERMINAL.includes(state);
}

export function useCreateRun() {
  return useMutation({
    mutationFn: async (intake: Record<string, unknown>) => {
      const response = await fetch("/api/v1/analysis-runs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      });
      if (!response.ok) {
        throw new Error(`create run failed: ${response.status}`);
      }
      return (await response.json()) as { run_id: string; run_state: RunState };
    },
  });
}

/**
 * Fixed polling schedule from docs/technology-stack.md §7: every two seconds for the first thirty,
 * five seconds thereafter, paused while the page is hidden, stopped on a terminal state.
 */
export function pollIntervalFor(startedAt: number, state: RunState | undefined): number | false {
  if (isTerminal(state)) {
    return false;
  }
  return Date.now() - startedAt < 30_000 ? 2_000 : 5_000;
}

export function useRun(runId: string | undefined, startedAt: number) {
  return useQuery({
    queryKey: ["analysis-run", runId],
    queryFn: async (): Promise<RunEnvelope> => {
      const response = await fetch(`/api/v1/analysis-runs/${encodeURIComponent(runId ?? "")}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      // 404/410 carry a content-free envelope by design; surface it rather than throwing.
      return (await response.json()) as RunEnvelope;
    },
    enabled: Boolean(runId),
    refetchInterval: (query) => pollIntervalFor(startedAt, query.state.data?.run_state),
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useCancelRun(runId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/v1/analysis-runs/${encodeURIComponent(runId ?? "")}/cancel`,
        { method: "POST", credentials: "same-origin" },
      );
      return (await response.json()) as RunEnvelope;
    },
  });
}
