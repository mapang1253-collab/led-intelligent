# Database Design

**Status: FROZEN — included in Architecture Freeze v1.0. Provider and access choices are LOCKED by [technology-stack.md](technology-stack.md).**

## 1. Technology

Use Supabase-hosted PostgreSQL with PostGIS because this workload needs relational integrity/versioned provenance, flexible source metadata, range/time queries and indexed geometry/geography predicates. Cloudflare Workers connect through Hyperdrive using `pg` and Kysely. SQL migrations and database constraints are authoritative; Kysely supplies typed application queries. The browser has no direct database or Supabase service-role access.

Raw authorized payloads belong in Cloudflare R2 Standard with hashes/metadata in PostgreSQL. Cloudflare Workflows provides initial background execution but is not the analytical source of truth. The Supabase Free database ceiling is an operating constraint: large nationwide source files remain in R2 and only rights-approved normalized/indexed data is loaded into PostgreSQL. Imports measure projected database/index size and stop before the configured safety threshold.

## 2. Logical schemas

| Schema | Principal relations |
|---|---|
| reference | administrative_area, area_name, boundary_version, unit, measure_definition, controlled_vocabulary |
| source | source_owner, source_product, product_version, coverage, access_right, retrieval, source_record, raw_object |
| property | property, property_candidate, title_interest, offering, location_assertion, identity_hypothesis |
| evidence | observation, observation_value, evidence_link, evidence_conflict, lineage_edge |
| method | feature_definition, requirement_definition, rule_pack, legal_rule, component_pack, economic_component, parameter_policy |
| analysis | analysis_run, run_dependency, potential_use, requirement_instance, validation_result, scenario_definition, parameter_resolution, cash_flow, scenario_result, comparison_result, verification_action, final_result |
| operations | job, job_attempt, source_budget, refresh_state, quarantine_event |

Reference IDs are immutable. Mutable definitions get version rows with effective intervals. Foreign keys prevent executing a component/rule absent from the run's pinned pack.

## 3. Core relation fields

| Relation | Required field groups |
|---|---|
| source_product/version | owner, stable product ID, access channel, coverage, update/revision policy, licence/right flags, effective dates, activation state |
| source_record | product version, native compound key, retrieval/raw hash, source timestamps, parse status/version |
| administrative_area | stable code/type, parent, names/variants, valid range, boundary version |
| property_candidate | run/shared target, proposed identity, resolution status, precision, reason set |
| location_assertion | subject, assertion type, admin/geometry, source, method, precision, observed/effective time |
| observation | version, subject/type, measure definition, epistemic status, geography/time, provenance, quality, rights |
| observation_value | scalar/range/structured typed value, unit/currency/statistic; one representation constraint |
| evidence_link | observation, target, requirement/purpose, role, match dimensions, fitness, adjustment, disclosure |
| evidence_conflict | member links, conflict type, resolution state/rule |
| lineage_edge | parent entity/version, child entity/version, activity/method |
| rule/component definition | stable ID, immutable version, semantics/executable representation, inputs/outputs, applicability, sources, DRAFT/ACADEMIC_REVIEWED/RETIRED lifecycle and immutable review record |
| analysis_run | opaque run ID, authorization-capability digest, state, scope, input digest, pack versions, `created_at`, `expires_at = created_at + 24 hours` and completion |
| run_dependency | run, dependency kind/ID/version, admissibility/replay status |
| potential_use/search | structured concept, supporting IDs, search coverage/stop reason, disposition |
| validation/scenario/comparison/final | exact input IDs/versions, status/reasons, outputs, warnings and timestamps |
| verification_action | final/result requirement, domain, decision impact, verification target, suggested reviewer/source category and linked evidence/candidate IDs |
| workflow_instance/stage_attempt | deterministic instance/step identity, idempotency key, dependency, state, deadline, attempt and classified result |

## 4. Constraints

- source owner/product/native key/version uniquely identify SourceRecord;
- Observation versions append; supersession cannot form cycles;
- values require compatible unit/measure definitions;
- geometry stores SRID and transformation lineage;
- EvidenceLink requires target, requirement and role;
- a run pins one method/rule/component/parameter/reference version set;
- executable rule/method/component/parameter versions are ACADEMIC_REVIEWED and carry a named review record;
- parameter resolution has value/unit/provenance rung or unresolved reason;
- final results reference accepted comparison/validation/scenario records only.
- final results pin `academic-output-v2` and expire with the run; the MVP creates no export artifact.
- precision-sensitive values use PostgreSQL `numeric`, cross TypeScript contracts as decimal strings and are calculated with `decimal.js`; floating-point coercion is rejected.

## 5. Spatial representation and indexes

Keep source geometry in its declared CRS and normalized geometry in a declared analysis CRS. Use geography for earth-distance predicates where appropriate. Never retain only derived latitude/longitude from authoritative geometry.

| Query | Index |
|---|---|
| canonical/source lookup | unique compound B-tree |
| area hierarchy/name/effective lookup | B-tree on parent, code, normalized name and validity |
| current observations | partial/composite B-tree on subject, measure and effective status |
| provenance/time series | B-tree on product, measure and time |
| target requirement/evidence retrieval | composite B-tree on target, requirement/purpose, role and admissibility |
| source coverage applicability | GiST on coverage geometry plus B-tree on product, purpose and valid time |
| intersection/radius/nearest | PostGIS GiST matching the actual operator/type |
| lineage/invalidation | B-tree on dependency IDs |
| anonymous run access/expiry | unique B-tree on capability digest; B-tree on expiry/state; never index/store plaintext capability |
| run/candidate batch retrieval | composite B-tree on run, candidate and result/status type |
| job claim | partial B-tree on runnable state, available_at and priority |

Do not specify PostGIS geometry SP-GiST for KNN unless the deployed operator class/version proves support; current PostGIS guidance makes GiST the safe default. Geography KNN and exact-distance semantics need explicit tests; a KNN shortlist is not silently called exact spheroidal ordering.

Confirm indexes with representative EXPLAIN ANALYZE plans. Full-table application loops for spatial, temporal or comparable retrieval fail acceptance.

## 6. Partitioning, retention and migrations

Do not partition by default. Add it only when measurements show pruning/maintenance benefit and cross-region queries remain sound. Ephemeral runs may use time-based purge. Restricted data follows source-specific rights; cache expiry never deletes the sole fact. Run-scoped relations always carry `run_id`; repository queries require an authorized run context and cannot enumerate another anonymous run.

Migrations remain compatible with in-flight runs. Rule/component/reference publication uses immutable content versions rather than ad hoc edits. Operator approvals are audited without adding end-user accounts.
