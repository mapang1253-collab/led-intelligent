-- WP10: durable record of expiry purges (docs/data-persistence-and-lifecycle.md §3).
--
-- "A durable purge job retries failures" — so the sweep has to leave a trace of what it did and
-- whether it finished. The log holds counts and timings only: the run ids it deleted are exactly
-- the thing the policy says must not survive expiry.
CREATE TABLE operations.purge_run (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  runs_deleted   integer NOT NULL DEFAULT 0 CHECK (runs_deleted >= 0),
  -- Set when the sweep could not complete, so the next one knows work remains.
  failure_reason text,
  trigger_source text NOT NULL CHECK (trigger_source IN ('CRON', 'MANUAL'))
);

CREATE INDEX purge_run_started_idx ON operations.purge_run (started_at DESC);
