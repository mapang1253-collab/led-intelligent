-- WP7/WP5: run-scoped AI proposals and the deterministic screens applied to them
-- (docs/database-design.md §2, docs/analysis-architecture.md §5).
--
-- Both relations are run-scoped and cascade with the run: a proposal is reasoning about one target
-- at one moment, not a durable fact, and it must not outlive the 24-hour run
-- (docs/data-persistence-and-lifecycle.md §3).
--
-- The search record is stored even when no concept survives, because "the model failed" and "the
-- evidence supported nothing" are different answers and the run has to be able to say which.

CREATE TABLE analysis.candidate_search_record (
  run_id          text PRIMARY KEY REFERENCES analysis.analysis_run (run_id) ON DELETE CASCADE,
  mode            text NOT NULL CHECK (mode IN ('LIVE_AI', 'RECORDED_AI', 'AI_DISABLED')),
  model           text NOT NULL,
  calls_made      integer NOT NULL CHECK (calls_made >= 0 AND calls_made <= 2),
  repair_attempted boolean NOT NULL,
  stop_reason     text NOT NULL CHECK (
    stop_reason IN ('EVIDENCE_SPACE_COVERED', 'NO_DEFENSIBLE_CONCEPTS', 'AI_FAILURE', 'RESOURCE_TRUNCATED')
  ),
  duplicates_merged integer NOT NULL DEFAULT 0,
  -- Why each rejected proposal was rejected. Kept so a run can account for what it discarded.
  rejected        jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_code    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analysis.potential_use_concept (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      text NOT NULL REFERENCES analysis.analysis_run (run_id) ON DELETE CASCADE,
  concept_id  text NOT NULL,
  label_th    text NOT NULL,
  -- The accepted concept exactly as it passed validation. The raw provider response is never stored.
  concept     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT potential_use_concept_run_concept_key UNIQUE (run_id, concept_id)
);

CREATE TABLE analysis.validation_result (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      text NOT NULL REFERENCES analysis.analysis_run (run_id) ON DELETE CASCADE,
  concept_id  text NOT NULL,
  -- Legal, physical and demand results stay separate even when a view summarises them
  -- (docs/validation-architecture.md §9).
  domain      text NOT NULL CHECK (domain IN ('LEGAL', 'PHYSICAL', 'DEMAND')),
  status      text NOT NULL CHECK (status IN ('PASS', 'FAIL', 'PARTIAL', 'UNKNOWN')),
  pack_id     text NOT NULL,
  pack_version text NOT NULL,
  validator_version text NOT NULL,
  result      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_result_run_concept_domain_key UNIQUE (run_id, concept_id, domain)
);

-- Run/candidate batch retrieval (docs/database-design.md §5).
CREATE INDEX potential_use_concept_run_idx ON analysis.potential_use_concept (run_id, concept_id);
CREATE INDEX validation_result_run_domain_idx ON analysis.validation_result (run_id, domain, status);
