-- WP8: the run's final analytical result (docs/output-policy.md, docs/analysis-architecture.md §9).
--
-- Run-scoped and cascading, like every other artifact of a 24-hour anonymous run. Written once when
-- a candidate set exists; a run that never produced one has no row here at all, which is how an
-- operational failure stays distinguishable from an analytical verdict.
CREATE TABLE analysis.final_result (
  run_id                text PRIMARY KEY REFERENCES analysis.analysis_run (run_id) ON DELETE CASCADE,
  status                text NOT NULL CHECK (
    status IN ('CLEAR_RECOMMENDATION', 'INCONCLUSIVE', 'INSUFFICIENT_EVIDENCE')
  ),
  status_reason         text NOT NULL,
  output_scope          text NOT NULL CHECK (output_scope IN ('AREA', 'PRELIMINARY_PROPERTY', 'PROPERTY')),
  -- Pinned so a stored result can never be re-rendered under a policy it was not written for.
  output_policy_version text NOT NULL,
  analysis               jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
