-- WP7/WP10: AI quota reservation (docs/ai-architecture.md §5).
--
-- Capacity is reserved *before* a request is sent, atomically, so two concurrent runs cannot both
-- believe they hold the last call of the day. A window row is the unit of budget: one per model per
-- minute and per day, created on first use and never deleted early — the day row is the record of
-- what the project actually spent.
--
-- Nothing here holds a prompt, a response, a run id or anything a user or a source supplied
-- (docs/ai-architecture.md §5: "Persist no prompt or user/source content in quota telemetry").
-- Only counts, outcomes and timings.
CREATE SCHEMA IF NOT EXISTS operations;

CREATE TABLE operations.ai_budget_window (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider           text NOT NULL,
  model              text NOT NULL,
  window_kind        text NOT NULL CHECK (window_kind IN ('MINUTE', 'DAY')),
  -- Truncated to the window: the minute, or the day in the provider's own reset timezone.
  window_start       timestamptz NOT NULL,
  -- Incremented before the call. Never decremented on failure: a request that reached the provider
  -- consumed allowance whatever it returned.
  requests_reserved  integer NOT NULL DEFAULT 0 CHECK (requests_reserved >= 0),
  -- Reconciled after the call from the provider's own token metadata.
  tokens_used        bigint NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  -- Set when the provider reports a 429, so the window stays closed until it says otherwise.
  blocked_until      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_budget_window_key UNIQUE (provider, model, window_kind, window_start)
);

-- Outcome-only telemetry. One row per attempted call, for measuring what the allowance really is.
CREATE TABLE operations.ai_call_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider       text NOT NULL,
  model          text NOT NULL,
  -- Stable reason codes only; never a provider message, which can quote user or source content.
  outcome        text NOT NULL,
  input_tokens   integer,
  output_tokens  integer,
  latency_ms     integer,
  -- Present only when the provider stated one.
  retry_after_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Budget lookup is always by the exact window key; the unique constraint serves it.
CREATE INDEX ai_call_log_created_idx ON operations.ai_call_log (created_at DESC);
