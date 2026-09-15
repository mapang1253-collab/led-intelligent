# Performance and Reliability Architecture

**Status: FROZEN — included in Architecture Freeze v1.0. Initial free-tier performance gates are fixed by [technology-stack.md](technology-stack.md) and require representative measurement before release.**

## 1. Critical path

    intake/resolution
      -> cache and evidence plan
      -> parallel bounded evidence/features
      -> concept generation
      -> parallel concept validation
      -> deterministic scenario/sensitivity
      -> comparison
      -> deterministic Thai render

Primary risks are external-source tails, unindexed geospatial/comparable queries, too many AI calls, multiplicative concept/scenario expansion, cache stampedes and one failed source blocking all work.

## 2. Request execution

The orchestrator builds a dependency DAG. Nodes declare dependencies, deadline, source/resource budget, idempotency, criticality and degradation. Ready independent nodes run concurrently; dependent nodes do not poll.

External-source work is normally off the interactive path through scheduled/bulk ingestion. Authorized on-demand work gets a per-source deadline shorter than the run deadline. When it expires:

- critical evidence missing narrows the scope or yields INSUFFICIENT_EVIDENCE;
- degradable evidence is marked unavailable/stale and reduces completeness;
- optional enrichment is omitted.

Criticality is requirement-specific. A zoning source can be critical to legal PASS but optional to an AREA opportunity context.

Admission control rejects or queues work before resource exhaustion. Per-run bounds cover evidence volume, candidate count, scenario states, AI context and execution time. Reaching a bound is recorded as RESOURCE_TRUNCATED; it cannot support a clear claim of completed candidate search.

## 3. Timeout, retry and isolation

Configure per operation from provider behavior and measurements:

- connection and total deadlines;
- retries only for transient/idempotent operations;
- exponential backoff with jitter and Retry-After respect;
- per-source concurrency/rate budgets;
- circuit breaker after classified repeated failures;
- bulkhead worker pools so one source/model cannot exhaust all capacity;
- cancellation propagation when results are no longer needed.

Authentication, permission, schema/semantic and licence failures are permanent until configuration changes. They open operator alerts rather than retry loops.

## 4. Cache design

| Cache | Key includes | Invalidation |
|---|---|---|
| source retrieval | product/version, normalized request and rights scope | source policy, negative-cache deadline |
| normalized evidence | source-record/reference/method versions | supersession/quarantine/rights |
| spatial/features | target geometry/precision, dataset vintage, method/parameters | any dependency/admissibility change |
| legal validation | concept characteristics, target, rule/evidence pack versions, effective date | rule/fact/time change |
| scenario | component graph/parameter/method versions | dependency change |
| AI concept output | exact evidence-context digest, prompt/model/schema versions | any digest/version change |

Final narratives are not reused across materially different evidence. Stampede protection uses single-flight/coalescing. Stale-while-refresh is allowed only where analytical policy permits.

## 5. Database algorithms

- canonical lookup uses indexed compound identifiers and version validity;
- matching generates candidates with blocking keys before expensive comparison;
- comparable retrieval applies mandatory filters, then indexed spatial/time search, then a bounded measure-specific ranking;
- nearby evidence uses spatial indexes and accepted target geometry/point;
- administrative joins use versioned IDs/polygon indexes;
- dependency invalidation uses reverse lineage indexes;
- component composition/topological evaluation detects cycles before calculation;
- Workflow/run/stage lookups use indexed state and deterministic instance/step identities.

Evidence, validations, parameter resolutions and scenarios are fetched in bounded batches for the run/candidate set. Per-row or per-candidate N+1 database access fails acceptance. Reusable features and invariant scenario graph nodes are calculated once per dependency fingerprint rather than once per narrative or sensitivity state.

Application full-table scans and unbounded all-pairs matching are prohibited. Query plans are tested at expected scale and worst geographic density.

## 6. AI and scenario cost

The normal run makes one `gemini-3.1-flash-lite` concept-proposal call. One repair is allowed only after structured/ID/citation/numerical-support/Thai-language rejection; the absolute per-run maximum is two. Final Thai rendering is deterministic by default. Independent candidates may validate concurrently, but model concurrency is budgeted.

Context contains only decision-relevant evidence cards. Repeated source text and raw documents are excluded. Cache use is allowed only for identical versioned context with compatible data rights.

Sensitivity evaluates the deterministic graph in vectorized/batched form. It never repeats AI calls. Adaptive refinement focuses on feasibility/dominance boundaries rather than a blind Cartesian grid.

## 7. Latency and scale acceptance

The first implementation must test these release gates:

| Target | Acceptance threshold |
|---|---|
| usable application shell | p95 <= 2.5 seconds on the documented mobile profile |
| run acknowledgement | p95 <= 1 second, excluding client network variability |
| first truthful progress state | <= 2 seconds after acknowledgement |
| warm representative analysis using pre-ingested evidence | p95 <= 30 seconds |
| interactive run deadline | 60 seconds |
| each Gemini request | 20-second deadline |

Benchmark cold/warm runs by area/point/parcel, evidence availability and concept count; measure p50/p95/p99 stages and end-to-end time under expected concurrency; load-test spatial/comparable queries at projected size; and verify Workflow recovery, source outage and model timeout behavior. A target becomes a supported claim only after its benchmark passes. A capability that misses the gate remains inactive or is narrowed rather than silently requiring paid infrastructure.

The browser polls every two seconds for the first 30 seconds and every five seconds thereafter, pausing while hidden and stopping on a terminal state. Progress uses real stage states rather than fabricated percentages. One source cannot cause an unbounded wait.

Scale grows by shared/versioned evidence and features, geographic partition opportunities only when measured, bounded candidate/scenario work, worker autoscaling within source limits and database query optimization. Adding a component/source must not introduce a serial global step.

## 8. Reliability and recovery

Stages are idempotent and persist accepted outputs atomically. A failed or restarted Workflow resumes from completed versioned steps and may safely retry an incomplete step. Duplicate instance creation or external side effects are prevented by deterministic identities, unique constraints and idempotency keys. Calculation and validation failures are isolated per candidate.

Database unavailability stops new authoritative writes and returns FAILED_RETRYABLE unless a complete immutable result can be served from an authorized cache. A transaction failure publishes no partial stage output. After recovery, deterministic instance/step identities, accepted-stage versions and dependency fingerprints prevent a replay from overwriting newer work. Corruption, incompatible migration or failed integrity checks are FAILED_FINAL until operator remediation; they are never translated into missing evidence.

If concept-generation AI fails before any valid candidate set exists, the run returns an operational failure with any safe deterministic evidence summary. If accepted candidates already exist but continuation is truncated, analysis may complete PARTIAL and cannot be CLEAR. Final-synthesis AI failure uses deterministic rendering of the accepted decision.

Run expiry is a scheduled indexed purge path, not a request-time full-table scan. At `created_at + 24 hours`, access fails immediately and an idempotent purge job removes run-scoped rows/objects; failures retry and remain observable. The protected web page renders the accepted FinalAnalysis and pinned output-policy version; reading cannot extend expiry. The MVP creates no result export artifact.

Backups, point-in-time recovery, restore drills, schema migration rollback/forward plan and raw-object integrity checks are release requirements. Recovery point/time objectives are BENCHMARK-REQUIRED IMPLEMENTATION TARGETS selected from owner operating expectations and measured restore behavior. Dependency manifests allow impact analysis when a source/rule/component is corrected.

## 9. Operational signals

Monitor Workflow age/steps, Worker requests/CPU, Hyperdrive query count, R2 operations/storage, Supabase database/index size, run stage duration, source cache/failure/staleness, circuit state, parser quarantine, evidence coverage by geography, Gemini RPM/TPM/RPD reserve and validity/token use, scenario failures, database query latency/index usage and final status mix. Admission control uses the lowest remaining provider budget and refuses work that cannot finish safely. Alerts use actionable reason codes and avoid user/source personal data.
