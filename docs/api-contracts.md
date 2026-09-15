# API and Internal Data Contracts

**Status: FROZEN IMPLEMENTATION SPECIFICATION — included in Architecture Freeze v1.0. Public routes and transport are fixed by [technology-stack.md](technology-stack.md); no production schemas are implemented.**

## 1. Contract rules

Every contract carries `schema_version`, stable identifiers and a creation/effective time where relevant. Public presentation contracts also carry `locale: "th-TH"`. Closed enums are versioned. Measured values carry definition, unit/dimension, currency, statistic, geography and time. Precision-sensitive values cross JSON as decimal strings. UNKNOWN, missing, conflicted, unsupported and operational failure are distinct. Natural-language parsing is never an internal interface.

A contract is immutable after acceptance in a run. Corrections create a new version and invalidate dependents. Producers validate before publication; consumers reject unsupported major versions and unknown enum values. Optional additive fields require documented defaults that cannot change analytical meaning.

## 2. RunResultEnvelope

Every public result is wrapped in:

| Field | Requirement |
|---|---|
| run_id | public opaque identifier; not authorization |
| run_state | QUEUED, RUNNING, COMPLETE, PARTIAL, FAILED_RETRYABLE, FAILED_FINAL, EXPIRED or CANCELLED |
| stage_records | stage ID/version; PENDING, READY, RUNNING, SUCCEEDED, DEGRADED, FAILED, CANCELLED or SKIPPED state; attempts, dependency IDs, started/completed times and safe reason codes |
| requested_scope / permitted_scope | AREA, PRELIMINARY_PROPERTY or PROPERTY, with downgrade reasons |
| final_analysis | present only when a valid analytical decision record exists |
| partial_artifacts | typed permitted artifacts: ResolvedTarget, CoverageAssessment, EvidenceSet summary, DerivedFeature summary or already accepted Validation/Scenario records; never an unvalidated recommendation |
| errors | stable code, stage, retryability, affected source/candidate and correlation ID; no secret/source payload |
| expires_at / replay_status | `created_at + 24 hours`; COMPLETE, REPLAY_LIMITED or UNAVAILABLE replay state |

An operational failure is not automatically INSUFFICIENT_EVIDENCE. If concept generation fails before an accepted candidate set exists, `final_analysis` is absent and deterministic evidence may appear under `partial_artifacts`. A final-synthesis failure after a valid decision produces deterministic rendering and may still be COMPLETE.

Viewing never extends `expires_at`. Expired runs return EXPIRED without content. The MVP exposes no result-export or public-sharing operation.

## 3. Public web operations

The browser uses the following versioned same-origin HTTP/JSON operations. It polls every two seconds for the first 30 seconds and every five seconds thereafter while active, pauses polling while hidden and stops on a terminal state.

| Method/path | Input -> output | Rules |
|---|---|---|
| `GET /api/v1/administrative-areas/provinces` | active version -> province summaries | normalized IDs |
| `GET /api/v1/administrative-areas/districts?province_id=...` | province/version -> district summaries | reject invalid parent/version |
| `GET /api/v1/administrative-areas/subdistricts?district_id=...` | district/version -> subdistrict summaries | reject invalid parent/version |
| `POST /api/v1/analysis-runs` | PropertyIntake -> RunAccepted | creates protected cookie capability; returns opaque run ID, state, `created_at`, fixed `expires_at`; no preliminary recommendation |
| `GET /api/v1/analysis-runs/:run_id` | run ID + capability cookie -> RunResultEnvelope | refresh/retry safe; access does not extend expiry; no capability in URL |
| `POST /api/v1/analysis-runs/:run_id/cancel` | run ID + capability cookie -> updated envelope | origin/CSRF control; idempotent |

API JSON uses UTF-8 and stable schemas as transport between the server and web application; it is not a user download feature. The browser renders the accepted result on the protected page and never calls external evidence/AI providers or the database directly. Invalid intake returns field-level Thai validation text plus a stable code; analytical PARTIAL is a successful envelope; missing authorization and expiry reveal no run content.

## 4. PropertyIntake and ResolvedTarget

`PropertyIntake` requires `province_id`, `district_id` and `subdistrict_id`. Optional MVP fields are normalized address parts, title/map-sheet/land/survey identifiers, site facts and acquisition evidence. A point assertion is reserved for a future/source-assisted interface and is not required or exposed by the initial public UI. Optional items carry USER_ASSERTED provenance and optional `as_of`.

Invalid administrative combinations fail input validation. Omitted optional fields do not.

`ResolvedTarget` contains target ID; resolution level; versioned admin IDs; location assertions; property/title candidates; MATCHED, POSSIBLE_MATCH, AMBIGUOUS, NO_MATCH or CONFLICT status; match reasons; precision dimensions; unresolved/conflicting identifiers; and output-scope ceiling. Candidate identities are never collapsed without an accepted resolution rule or explicit user disambiguation.

## 5. Source planning and acquisition

`SourceProductManifest` contains owner/product/version, authorized access channel, named analytical purposes, geography/time coverage, rights flags, freshness/admissibility policy, adapter version, operational limits and activation state.

`CoverageAssessment` contains target/date/question, applicable product versions, finest available geography, FRESH/STALE_USABLE/STALE_BLOCKED/HISTORICAL/UNAVAILABLE states, missing critical capabilities and output-scope ceiling.

`AcquisitionRequest` contains product/version, normalized source key, requested period/coverage, purpose, authorization scope, deadline, priority and idempotency key. It cannot contain an arbitrary user-controlled URL.

`AcquisitionResult` contains request ID; SUCCESS, NO_RECORD, OUTSIDE_COVERAGE, TIMEOUT, RATE_LIMITED, ACCESS_DENIED, INVALID_RESPONSE, QUARANTINED or CANCELLED outcome; retrieval/raw references where rights permit; source timestamps; retry classification; cache disposition; and safe diagnostics. An empty record set is never used to represent all outcomes.

## 6. RequirementSet, Observation and EvidenceSet

`RequirementSet` contains version, output scope, concept/use-family when applicable, requirement IDs, domain, applicability inputs, criticality, accepted evidence methods/precision and completion rules.

`Observation` contains immutable identity/version; subject; typed value/range; measure definition; unit/currency/statistic; geography/granularity/precision; observed/effective/published/retrieved times; source record/product/version; epistemic state; quality dimensions; rights; and lineage. Missing is represented by an absent observation plus a reason, never zero.

`EvidenceLink` contains observation ID/version; target; requirement/question; PRIMARY, SUPPORTING, CONTEXTUAL, CONTRADICTING or SUBSTITUTE role; subject/geography/time/similarity/purpose fitness dimensions; requested and actual level; adjustment method; substitution reason; decision impact; and disclosure.

`EvidenceSet` contains RequirementSet version; selected and contradicting EvidenceLinks; conflicts; substitutions; RESOLVED, UNRESOLVED, CONFLICTED and UNSUPPORTED requirements; CoverageAssessment; and dependency manifest. Selection never rewrites the underlying Observation.

## 7. DerivedFeature and OpportunityBrief

`DerivedFeature` contains ID/version, typed value/range, target, purpose, parent EvidenceLinks, method/version/parameters, spatial and temporal scope, epistemic status, missing/conflict state and admissibility deadline.

`OpportunitySignal` contains signal ID/type, supporting and counter-evidence/feature IDs, target scope, materiality reason, applicable use characteristics and limitations. Materiality is method-defined, not an AI confidence number.

`OpportunityBrief` contains exact target/effective basis; evidence/feature context digest; selected signal IDs; conflicts; critical gaps; source and output coverage; allowed vocabularies; resource bounds; and the evidence cards permitted for AI use. Omitted material signals are recorded.

## 8. PotentialUseConcept and candidate search

`PotentialUseConcept` contains schema version, `locale: "th-TH"`, concept ID, `label_th`, `description_th`, Thai supporting/uncertainty text, activities with controlled ID or UNMAPPED, occupancy/operation characteristics, physical requirements, demand hypotheses, economic behaviors, requested component instances, supporting/counter-evidence IDs and uncertainties.

`CandidateSearchRecord` contains OpportunityBrief digest, material signal IDs, signal-to-concept coverage, deduplication groups, unmapped signals, accepted/rejected concepts, attempts, validation failures and one stop reason: EVIDENCE_SPACE_COVERED, NO_DEFENSIBLE_CONCEPTS, AI_FAILURE or RESOURCE_TRUNCATED.

Only EVIDENCE_SPACE_COVERED can support CLEAR_RECOMMENDATION. AI_FAILURE before any accepted candidate set is an operational run failure. RESOURCE_TRUNCATED or continuation failure with accepted candidates permits a PARTIAL result but never CLEAR_RECOMMENDATION.

NO_DEFENSIBLE_CONCEPTS with a valid completed search and zero accepted concepts maps to INSUFFICIENT_EVIDENCE with reason NO_DEFENSIBLE_CONCEPTS_GENERATED; it never claims that no possible use exists.

## 9. Requirements and validation

`RequirementInstance` contains ID/version, concept/target, LEGAL, PHYSICAL, DEMAND or ECONOMIC domain, applicability state and inputs, predicate/unit, criticality, accepted evidence methods and decision impact.

`ValidationResult` contains validator/domain/version; concept/target/scope; PASS, FAIL, PARTIAL or UNKNOWN overall status; applicability and requirement outcomes; rule/evidence/method IDs; rule-family or method coverage; missing/conflicting inputs; approval state; verification actions; and decision impact.

Every referenced RulePack or physical/demand ValidationMethod has DRAFT, ACADEMIC_REVIEWED or RETIRED status plus review-record ID. Only ACADEMIC_REVIEWED may execute. Its review record pins reviewer identity/role, content hash/version, evidence basis, tests, limitations and review date.

Aggregate FEASIBLE requires every applicable critical legal, physical and demand requirement to PASS. Critical PARTIAL, UNKNOWN, CONFLICTED, unresolved applicability or required-but-unconfirmed approval yields UNVALIDATED. A critical verified FAIL may eliminate only the affected variant. Domain results remain separately visible.

## 10. Economic and scenario contracts

`EconomicComponent` contains ID/version, semantics, formula AST in the allow-listed language, inputs/outputs/units, applicability, compatibility, account/resource IDs, uncertainty behavior, limitations, professional basis and DRAFT|ACADEMIC_REVIEWED|RETIRED lifecycle status. Only ACADEMIC_REVIEWED executes in this project.

`ComponentInstance` references an active existing version, binds typed inputs and resource/account allocations, and contains no executable free text.

`ParameterResolution` contains requirement ID; RESOLVED, PROXY, BENCHMARK, ASSUMPTION, CONFLICTED or UNRESOLVED status; value/range/distribution and unit; EXACT, PROXY, BENCHMARK, MODEL_ASSUMPTION or UNRESOLVED rung; evidence/basis IDs; adjustment; population/geography/date; uncertainty; and disclosure.

ParameterPolicy and parameter-set versions use the same DRAFT, ACADEMIC_REVIEWED and RETIRED lifecycle; a draft or retired value cannot silently resolve a parameter.

`ScenarioDefinition` contains target/concept, component DAG, resource/account ledgers, property interest/effective date/currency basis, horizon/frequency, nominal-real/tax/financing conventions, parameter resolutions and pinned versions.

`ScenarioResult` contains model coverage, calculation and financial statuses; periodic cash flows; eligible metrics; sensitivity method/states/drivers; break-even results; warnings; and dependency manifest. Invalid graph, unit and numeric errors remain distinct. A missing model is never represented as a missing parameter.

## 11. Comparison and final analysis

`ComparisonResult` contains CandidateSearchRecord reference; ELIMINATED, UNSUPPORTED, UNVALIDATED or FEASIBLE disposition per candidate; common basis; pairwise dominance/incomparability; complete material credible states; reversal risks; decisive evidence; and decision reasons.

`FinalAnalysis` contains analysis ID/effective date/scope; CLEAR_RECOMMENDATION, INCONCLUSIVE or INSUFFICIENT_EVIDENCE status; reason codes; leading use only when clear; dynamic alternatives; candidate-search scope; reasons/counter-evidence; separate validations; model/parameter coverage; scenarios/sensitivity; evidence/proxies/benchmarks/assumptions/limitations; structured verification actions; method/source dates; `output_policy_version`; disclaimer/scope/status statements; and replay status.

CLEAR_RECOMMENDATION requires a FEASIBLE leader, EVIDENCE_SPACE_COVERED, common-basis comparison and dominance across the complete material credible state set. Area conclusions are labelled area potential.

INCONCLUSIVE + NO_FEASIBLE_CANDIDATE requires EVIDENCE_SPACE_COVERED, at least one accepted concept, every accepted concept ELIMINATED by verified applicable critical FAIL, and no UNSUPPORTED/UNVALIDATED candidate that may still be feasible. `leading_use` is absent; no viable alternative is returned; every exclusion is cited. It never means that no imaginable use exists.

## 12. AI exchange contracts

Every AI exchange records stage, model/provider, prompt/schema version, exact context digest, allowed IDs, `locale`, structured response, validation errors, repair count, token/cost metadata and outcome. Validation order is parse/schema, Thai-language contract, closed enums and ID existence, context citation membership, units/component compatibility, numerical support and deterministic-result reconciliation. The normal call count is one and the per-run maximum is two.

Source/user text is untrusted data. AI output cannot activate a source/rule/component, add a formula, overwrite evidence, change a validator result or authorize a tool action.

## 13. Errors, reason codes and compatibility

Reason codes live in a versioned registry with stable meaning, owning module, safe public text and retry class. Required initial families cover intake/identity, scope/coverage, source/cache, evidence/conflict, validation/applicability/approval, model/parameter/calculation, candidate search/comparison, AI validation, infrastructure and expiry/rights.

Partial analytical success is a valid `RunResultEnvelope`. Invalid intake, authorization failure, unavailable critical infrastructure with no defensible artifact, corruption and incompatible contract versions are run failures. Stored runs are never silently reinterpreted.

## 14. Cross-contract invariants

- Every downstream fact or conclusion references accepted upstream IDs and versions.
- No stage increases geographic precision, epistemic status or claim scope.
- Area evidence cannot satisfy a parcel evidence method.
- UNKNOWN/PARTIAL/CONFLICTED cannot be coerced to PASS or FAIL.
- AI IDs must exist in the pinned vocabulary/pack and citations must exist in its context.
- Deterministic values cannot be replaced by narrative values.
- Run authorization secrets never appear in these analytical contracts, URLs, logs or public IDs.
- Only ACADEMIC_REVIEWED definitions execute; AI/tests cannot self-approve them and the output cannot call them professionally certified.
- Every final-result screen conforms to output-policy.md and the same pinned policy version.
- Every end-user string is Thai; English codes/keys are translated by the presentation contract and never appear alone as user guidance.
- Contract conformance fixtures at each module seam are required before integration.
