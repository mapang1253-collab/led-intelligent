-- WP3/WP4: SourceProduct registry and the Observation/EvidenceLink corpus
-- (docs/implementation-plan.md §2, docs/data-architecture.md §4-8, docs/database-design.md §2-5).
--
-- Two rules shape this migration:
--
--   1. Activation is runtime configuration with an audited approval, never hard-coded
--      (docs/implementation-plan.md §4). A product is ACTIVE only while it points at an
--      activation_record naming who accepted each gate item — enforced here by a CHECK, so no
--      application bug can execute an unapproved source.
--   2. Observations are shared and durable; EvidenceLinks are run-scoped and die with the run
--      (docs/data-persistence-and-lifecycle.md §3). A link is fitness *for one target and one
--      question*, so it can never outlive the run that asked.
CREATE SCHEMA IF NOT EXISTS source;
CREATE SCHEMA IF NOT EXISTS evidence;

-- ---------------------------------------------------------------------------
-- reference: controlled vocabulary the evidence corpus depends on
-- ---------------------------------------------------------------------------

CREATE TABLE reference.unit (
  code        text PRIMARY KEY,
  name_th     text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('CURRENCY_PER_PERIOD', 'CURRENCY', 'COUNT', 'RATIO', 'AREA', 'LENGTH'))
);

-- A generic "price"/"value" measure is forbidden: measure_type stays explicit so an asking price can
-- never be compared with an official assessment (docs/data-architecture.md §4).
CREATE TABLE reference.measure_definition (
  measure_id          text NOT NULL,
  definition_version  integer NOT NULL DEFAULT 1,
  name_th             text NOT NULL,
  measure_type        text NOT NULL CHECK (
    measure_type IN (
      'official_assessment', 'appraisal', 'forced_sale_realized', 'asking',
      'declared_registered', 'index', 'count', 'rate', 'model_estimate'
    )
  ),
  statistic           text NOT NULL CHECK (statistic IN ('MEAN', 'MEDIAN', 'TOTAL', 'RATE', 'SHARE', 'SINGLE')),
  unit_code           text NOT NULL REFERENCES reference.unit (code),
  note_th             text,
  PRIMARY KEY (measure_id, definition_version),
  -- Lets observation_value prove its unit belongs to its measure (docs/database-design.md §4).
  CONSTRAINT measure_definition_measure_unit_key UNIQUE (measure_id, unit_code)
);

-- ---------------------------------------------------------------------------
-- source: who published what, under which rights, and whether it may run
-- ---------------------------------------------------------------------------

CREATE TABLE source.source_owner (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id   text NOT NULL UNIQUE,
  name_th    text NOT NULL,
  contact    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source.source_product (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id            text NOT NULL UNIQUE,
  owner_id              bigint NOT NULL REFERENCES source.source_owner (id),
  title_th              text NOT NULL,
  -- Operator-configured locator. A user-supplied URL is never acquired (docs/security-privacy-compliance.md §5).
  access_url            text NOT NULL,
  catalogue_url         text,
  licence_id            text NOT NULL,
  attribution_th        text NOT NULL,
  -- Rights are recorded per action; display permission does not imply redistribution permission.
  may_acquire           boolean NOT NULL,
  may_store             boolean NOT NULL,
  may_transform         boolean NOT NULL,
  may_display           boolean NOT NULL,
  rights_expires_at     timestamptz,
  coverage_level        text NOT NULL CHECK (coverage_level IN ('PROVINCE', 'DISTRICT', 'SUBDISTRICT', 'POINT')),
  coverage_note_th      text NOT NULL,
  refresh_frequency     text NOT NULL,
  -- Outside its coverage a source is UNAVAILABLE, never a national proxy (docs/data-architecture.md §9).
  must_not_become_th    text NOT NULL,
  activation_state      text NOT NULL DEFAULT 'INACTIVE'
                        CHECK (activation_state IN ('INACTIVE', 'ACTIVE', 'SUSPENDED')),
  activation_record_id  bigint,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- The audited approval itself: every gate item of docs/implementation-plan.md §4, the named
-- reviewers required by RD-4, and the decision. Records are append-only history; suspension writes a
-- new row rather than editing the old one.
CREATE TABLE source.activation_record (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_product_id bigint NOT NULL REFERENCES source.source_product (id) ON DELETE CASCADE,
  decision          text NOT NULL CHECK (decision IN ('ACTIVATE', 'SUSPEND')),
  -- One key per numbered gate item, each carrying the evidence that satisfied it. Checked below so
  -- an approval cannot be recorded with items missing.
  gate_acceptance   jsonb NOT NULL,
  reviewer_names    text[] NOT NULL CHECK (array_length(reviewer_names, 1) >= 1),
  review_note_th    text NOT NULL,
  -- Academic review under RD-4. This is a lifecycle state, never a professional certification.
  lifecycle_state   text NOT NULL CHECK (lifecycle_state IN ('DRAFT', 'ACADEMIC_REVIEWED', 'RETIRED')),
  reviewed_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activation_record_gate_items_complete CHECK (
    decision <> 'ACTIVATE' OR (
      gate_acceptance ?& ARRAY[
        'owner_and_locator_verified',
        'access_authorized_and_reproducible',
        'field_semantics_units_time_verified',
        'coverage_and_resolution_documented',
        'licence_permits_acquire_store_transform_display',
        'privacy_minimization_reviewed',
        'update_revision_behavior_handled',
        'adapter_fixtures_pass',
        'operational_limits_configured',
        'analytical_fitness_approved'
      ]
    )
  )
);

ALTER TABLE source.source_product
  ADD CONSTRAINT source_product_activation_record_fkey
  FOREIGN KEY (activation_record_id) REFERENCES source.activation_record (id),
  -- The gate, in the schema: ACTIVE is unreachable without an approval record.
  ADD CONSTRAINT source_product_active_requires_record CHECK (
    activation_state <> 'ACTIVE' OR activation_record_id IS NOT NULL
  );

-- One acquisition of one product: what was fetched, when, and what it hashed to.
CREATE TABLE source.product_version (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_product_id  bigint NOT NULL REFERENCES source.source_product (id) ON DELETE CASCADE,
  version_label      text NOT NULL,
  retrieved_at       timestamptz NOT NULL DEFAULT now(),
  record_count       integer NOT NULL CHECK (record_count >= 0),
  payload_sha256     text NOT NULL,
  payload_bytes      bigint NOT NULL CHECK (payload_bytes >= 0),
  parse_status       text NOT NULL CHECK (parse_status IN ('PARSED', 'PARTIAL', 'QUARANTINED')),
  parser_version     text NOT NULL,
  CONSTRAINT product_version_product_label_key UNIQUE (source_product_id, version_label)
);

-- ---------------------------------------------------------------------------
-- evidence: target-independent facts
-- ---------------------------------------------------------------------------

CREATE TABLE evidence.observation (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Natural identity of the fact: product, measure, area, period and cohort. A re-publication with
  -- a different value appends a new version of the same key rather than overwriting history.
  observation_key           text NOT NULL,
  observation_version       integer NOT NULL DEFAULT 1,
  supersedes_id             bigint REFERENCES evidence.observation (id),
  -- Effective status, so "the figure that currently stands" is an indexed lookup rather than a
  -- recursive walk of the supersession chain (docs/database-design.md §5).
  is_current                boolean NOT NULL DEFAULT true,
  subject_type              text NOT NULL CHECK (subject_type IN ('ADMIN_AREA', 'PROPERTY', 'PARCEL')),
  measure_id                text NOT NULL,
  -- The exact cohort the figure describes. Never dropped, never averaged away
  -- (docs/adr/0002-no-fabricated-provincial-averages.md).
  population_th             text NOT NULL,
  admin_area_id             bigint NOT NULL REFERENCES reference.administrative_area (id),
  geography_level           text NOT NULL CHECK (geography_level IN ('PROVINCE', 'DISTRICT', 'SUBDISTRICT')),
  -- Calendar years in CE; any source-native calendar is converted at ingestion, never at read time.
  period_start_year         integer NOT NULL,
  period_end_year           integer NOT NULL,
  source_vintage            text NOT NULL,
  published_at              timestamptz,
  retrieved_at              timestamptz NOT NULL,
  epistemic_status          text NOT NULL CHECK (
    epistemic_status IN ('OBSERVED', 'USER_ASSERTED', 'DERIVED', 'ESTIMATED', 'BENCHMARK', 'MODEL_ASSUMPTION')
  ),
  source_product_version_id bigint NOT NULL REFERENCES source.product_version (id) ON DELETE CASCADE,
  source_record_locator     text NOT NULL,
  extraction_method         text NOT NULL,
  -- Ordinal quality dimensions with reason codes; deliberately no single weighted confidence number
  -- (docs/data-architecture.md §6).
  reliability               text NOT NULL CHECK (reliability IN ('AUTHORITATIVE', 'OFFICIAL_SURVEY', 'COMMERCIAL', 'CROWDSOURCED', 'UNVERIFIED')),
  completeness              text NOT NULL CHECK (completeness IN ('COMPLETE', 'PARTIAL', 'SPARSE')),
  parsing_flags             text[] NOT NULL DEFAULT '{}',
  -- Source-stated caveat carried verbatim, e.g. a survey-zero footnote.
  source_note_th            text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT observation_period_ordered CHECK (period_end_year >= period_start_year),
  CONSTRAINT observation_no_self_supersession CHECK (supersedes_id IS DISTINCT FROM id),
  CONSTRAINT observation_key_version_key UNIQUE (observation_key, observation_version),
  -- Lets observation_value prove it carries its observation's own measure.
  CONSTRAINT observation_id_measure_key UNIQUE (id, measure_id)
);

-- Exactly one representation per value; a range is not a scalar and must not be flattened into one.
CREATE TABLE evidence.observation_value (
  observation_id    bigint PRIMARY KEY REFERENCES evidence.observation (id) ON DELETE CASCADE,
  measure_id        text NOT NULL,
  -- Precision-sensitive values are numeric here and decimal strings across contracts; floating-point
  -- coercion is rejected (docs/database-design.md §4).
  value_scalar      numeric,
  value_low         numeric,
  value_high        numeric,
  value_structured  jsonb,
  unit_code         text NOT NULL,
  currency          text,
  statistic         text NOT NULL CHECK (statistic IN ('MEAN', 'MEDIAN', 'TOTAL', 'RATE', 'SHARE', 'SINGLE')),
  CONSTRAINT observation_value_one_representation CHECK (
    (value_scalar IS NOT NULL)::int
    + ((value_low IS NOT NULL OR value_high IS NOT NULL))::int
    + (value_structured IS NOT NULL)::int = 1
  ),
  CONSTRAINT observation_value_range_ordered CHECK (
    value_low IS NULL OR value_high IS NULL OR value_high >= value_low
  ),
  CONSTRAINT observation_value_belongs_to_observation
    FOREIGN KEY (observation_id, measure_id) REFERENCES evidence.observation (id, measure_id) ON DELETE CASCADE,
  -- The unit must be one the measure definition actually declares.
  CONSTRAINT observation_value_unit_matches_measure
    FOREIGN KEY (measure_id, unit_code) REFERENCES reference.measure_definition (measure_id, unit_code)
);

-- ---------------------------------------------------------------------------
-- evidence: fitness of a fact for one target and one question — run-scoped
-- ---------------------------------------------------------------------------

CREATE TABLE evidence.evidence_link (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Dies with the run: a link is run-scoped reasoning, not a durable fact.
  run_id              text NOT NULL REFERENCES analysis.analysis_run (run_id) ON DELETE CASCADE,
  observation_id      bigint NOT NULL REFERENCES evidence.observation (id) ON DELETE CASCADE,
  target_kind         text NOT NULL CHECK (target_kind IN ('RUN_TARGET_AREA', 'RUN_TARGET_PROPERTY')),
  target_admin_area_id bigint NOT NULL REFERENCES reference.administrative_area (id),
  requirement_id      text NOT NULL,
  purpose_th          text NOT NULL,
  role                text NOT NULL CHECK (role IN ('PRIMARY', 'SUPPORTING', 'CONTEXTUAL', 'CONTRADICTING', 'SUBSTITUTE')),
  -- Match dimensions stay separate: a perfect geographic match does not repair a stale period
  -- (docs/data-architecture.md §5-6).
  subject_match       text NOT NULL CHECK (subject_match IN ('EXACT', 'PARTIAL', 'PROXY', 'NONE')),
  geography_match     text NOT NULL CHECK (geography_match IN ('EXACT', 'CONTAINING_AREA', 'NEIGHBOURING', 'NONE')),
  temporal_match      text NOT NULL CHECK (temporal_match IN ('CURRENT', 'RECENT', 'DATED', 'UNKNOWN')),
  property_similarity text NOT NULL CHECK (property_similarity IN ('NOT_APPLICABLE', 'SIMILAR', 'DISSIMILAR', 'UNKNOWN')),
  purpose_fitness     text NOT NULL CHECK (purpose_fitness IN ('FIT', 'FIT_WITH_CAVEAT', 'CONTEXT_ONLY', 'UNFIT')),
  -- Area evidence answering a property question stays visibly a downgrade; it is never promoted.
  requested_level     text NOT NULL CHECK (requested_level IN ('AREA', 'PRELIMINARY_PROPERTY', 'PROPERTY')),
  actual_level        text NOT NULL CHECK (actual_level IN ('AREA', 'PRELIMINARY_PROPERTY', 'PROPERTY')),
  adjustment_method   text,
  adjustment_version  text,
  substitution_reason text,
  decision_impact     text NOT NULL CHECK (decision_impact IN ('CONTEXT', 'SUPPORTS', 'CONSTRAINS', 'DECISIVE')),
  -- Shown to the reader verbatim: what this evidence is and what it cannot answer.
  disclosure_th       text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_link_run_observation_requirement_key UNIQUE (run_id, observation_id, requirement_id)
);

-- ---------------------------------------------------------------------------
-- Indexes (docs/database-design.md §5) — retrieval is always indexed, never a table scan
-- ---------------------------------------------------------------------------

-- Current observations for an area and measure, newest period first.
CREATE INDEX observation_area_measure_period_idx
  ON evidence.observation (admin_area_id, measure_id, period_end_year DESC)
  WHERE is_current;

-- Supersession: find the standing version of one natural key without scanning its history.
CREATE UNIQUE INDEX observation_current_key_idx
  ON evidence.observation (observation_key)
  WHERE is_current;

-- Provenance/time-series walk by product.
CREATE INDEX observation_product_measure_period_idx
  ON evidence.observation (source_product_version_id, measure_id, period_end_year DESC);

-- Target requirement/evidence retrieval for one run.
CREATE INDEX evidence_link_run_requirement_role_idx
  ON evidence.evidence_link (run_id, requirement_id, role);

-- Source coverage applicability by purpose and state.
CREATE INDEX source_product_activation_idx
  ON source.source_product (activation_state, coverage_level);

-- ---------------------------------------------------------------------------
-- Controlled vocabulary for the measures this increment can carry
-- ---------------------------------------------------------------------------

INSERT INTO reference.unit (code, name_th, kind) VALUES
  ('THB_PER_MONTH', 'บาทต่อเดือน', 'CURRENCY_PER_PERIOD'),
  ('THB', 'บาท', 'CURRENCY'),
  ('PERSONS', 'คน', 'COUNT'),
  ('PERCENT', 'ร้อยละ', 'RATIO');

INSERT INTO reference.measure_definition
  (measure_id, definition_version, name_th, measure_type, statistic, unit_code, note_th) VALUES
  (
    'household_income_monthly_mean', 1,
    'รายได้เฉลี่ยต่อเดือนของครัวเรือน', 'rate', 'MEAN', 'THB_PER_MONTH',
    'ค่าเฉลี่ยต่อครัวเรือนจากการสำรวจตัวอย่าง จำแนกตามสถานะทางเศรษฐสังคม ไม่ใช่รายได้ของบุคคล และไม่ใช่ค่าเฉลี่ยรวมทุกครัวเรือน'
  );
