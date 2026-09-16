-- WP2/WP9: isolated, expiring anonymous analysis runs.
--
-- Security model (docs/security-privacy-compliance.md §3, docs/data-persistence-and-lifecycle.md §3):
--   * `run_id` is public and opaque and grants NO access on its own.
--   * Access is granted by a separate high-entropy capability held in an HttpOnly cookie. Only its
--     SHA-256 digest is stored here; the plaintext capability never touches the database, URLs or
--     logs.
--   * `expires_at` is fixed at creation as created_at + 24 hours. Reading a run never extends it.
CREATE SCHEMA IF NOT EXISTS analysis;

CREATE TABLE analysis.analysis_run (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id             text NOT NULL UNIQUE,
  capability_digest  text NOT NULL,
  run_state          text NOT NULL CHECK (
    run_state IN (
      'QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL',
      'FAILED_RETRYABLE', 'FAILED_FINAL', 'EXPIRED', 'CANCELLED'
    )
  ),
  requested_scope    text NOT NULL CHECK (requested_scope IN ('AREA', 'PRELIMINARY_PROPERTY', 'PROPERTY')),
  permitted_scope    text NOT NULL CHECK (permitted_scope IN ('AREA', 'PRELIMINARY_PROPERTY', 'PROPERTY')),
  -- Run-scoped user assertions. Never promoted into the shared evidence corpus.
  intake             jsonb NOT NULL,
  province_id        bigint NOT NULL REFERENCES reference.administrative_area (id),
  district_id        bigint NOT NULL REFERENCES reference.administrative_area (id),
  subdistrict_id     bigint NOT NULL REFERENCES reference.administrative_area (id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  completed_at       timestamptz,
  CONSTRAINT analysis_run_expiry_is_24h CHECK (expires_at = created_at + interval '24 hours')
);

-- Authorisation lookup is by digest, so it must be unique and indexed; the plaintext is never stored.
CREATE UNIQUE INDEX analysis_run_capability_digest_idx
  ON analysis.analysis_run (capability_digest);

-- Expiry purge is a scheduled indexed sweep, never a request-time full scan
-- (docs/performance-and-reliability.md §8).
CREATE INDEX analysis_run_expiry_idx
  ON analysis.analysis_run (expires_at)
  WHERE run_state <> 'EXPIRED';
