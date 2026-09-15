# Technical methodology: evidence storage, execution and reliability

Research date: **2026-09-15**. Status: **research and design recommendations for final architecture review; not Architecture Freeze**. No implementation, benchmark or load test was performed.

Read with [project overview](../../docs/project-overview.md), [data architecture](../../docs/data-architecture.md), [persistence lifecycle](../../docs/data-persistence-and-lifecycle.md), and [prior OSM investigation](../osm/api-investigation.md). The overview wins over older restrictions or assumptions. In particular this research does not restore LED-only intake, investor profiles, mandatory maps, arbitrary financial assumptions, or permanent personal analysis histories.

Labels: **VERIFIED FACT** means directly supported by the linked primary documentation fetched on the research date, not a live capability test of this application. **PROFESSIONAL METHODOLOGY** means published technical or usability practice. **DESIGN RECOMMENDATION** means our proposed application of it. **INFERENCE** and **OPEN QUESTION** identify remaining limits. Each source link below was opened; the AWS Builders Library page redirected to an empty extraction and is deliberately not used as evidence.

## 1. Select storage from the actual workload

The required workload joins source observations to versioned administrative geography, evidence links, property identity assertions, feature dependencies and economic references. It needs integrity constraints, spatial predicates, historical vintages, concurrent ingestion and reusable analysis without accounts. These requirements come from the project, not a vendor benchmark.

| Candidate | Verified capability | Fit assessment — DESIGN RECOMMENDATION |
|---|---|---|
| PostgreSQL + PostGIS | PostgreSQL provides relational constraints and JSONB; PostGIS supports spatial predicates and indexes. [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [JSON](https://www.postgresql.org/docs/current/datatype-json.html), [spatial indexes](https://postgis.net/docs/using_postgis_dbmanagement.html#build-indexes) | Recommended baseline: keep lineage, geography and analytical joins in one authoritative store, with typed columns for core meaning and bounded JSONB for heterogeneous extensions. |
| MongoDB/document store | MongoDB has geospatial indexes, spherical geometry queries and indexed proximity operators. It is incorrect to dismiss it as having no geospatial capability. [MongoDB geospatial queries](https://www.mongodb.com/docs/manual/geospatial-queries/) | Feasible alternative, but this project's many shared, versioned relationships would need a deliberate reference/duplication strategy. No demonstrated need justifies a second primary database. This is a workload-fit judgment, not a performance claim. |
| SQLite | SQLite supports substantial local/server-side workloads, but permits one writer at a time per database file; its documentation recommends client/server systems for demanding concurrent-writer scenarios. [Appropriate uses](https://www.sqlite.org/whentouse.html) | Suitable for disposable research snapshots or offline artifacts; not the recommended shared spatial/ingestion baseline. Do not infer a universal user-count ceiling or claim SQLite cannot support websites. |

**DESIGN RECOMMENDATION:** keep authoritative fact value, variable, measure kind, unit, currency, geography reference, period, provenance ID and epistemic status outside unvalidated JSON blobs. JSON Schema validates extension shape before ingestion. PostgreSQL JSONB does not preserve original whitespace, key order or duplicate object keys; a JSONB value is therefore not a byte-exact source snapshot. Authorized raw artifacts need their own content hash and storage reference. [PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html)

**IMPLEMENTATION CHOICE:** supported database/version, hosting provider and language remain choices subject to this requirement set. Verify PostGIS extension availability, backups/restores, cost and chosen operator classes before deployment. Horizontal services, sharding and a separate broker are not prerequisites for the MVP.

## 2. Provenance and time

**VERIFIED FACT:** W3C PROV distinguishes entities, activities and agents, with specific relations for usage, generation, derivation and revision. [PROV-DM](https://www.w3.org/TR/prov-dm/)

**DESIGN RECOMMENDATION:** apply those concepts without requiring an RDF database: source snapshot → normalization activity/version → observation version → target-specific evidence link → feature/calculation activity → result. Retain source authority and extraction agent separately. Store source locator/page/table/row, retrieved timestamp and processing version. A hash detects content change; it does not certify source truth.

Record separately:

- Observation period: what interval the measurement describes.
- Valid/effective period: when a rule, boundary or other assertion applies.
- Publication time: when the source published it, if known.
- Retrieved/recorded time: when this system obtained/accepted it.
- Revision relationship: which previous assertion this version supersedes.

**DESIGN RECOMMENDATION:** never replace an old observation silently when a source revises it. A run pins an input manifest of explicit versions; an in-progress refresh cannot silently change its evidence halfway through. Historical source statements can conflict or overlap and must coexist. Non-overlap constraints apply only to curated canonical versions where overlap is invalid, not all raw legal/market observations.

**VERIFIED FACT:** PostgreSQL range types support indexed overlap/containment through GiST or SP-GiST, and exclusion constraints can enforce non-overlap. [Range types](https://www.postgresql.org/docs/current/rangetypes.html)

**DESIGN RECOMMENDATION:** B-tree indexes on source record identity/version and common geography-variable-period lookup paths; range indexes only where effective-period overlap queries justify them. A simple timestamp index is sufficient for many publication/retrieval queries. Retention expiry must invalidate derived data and indicate whether a result remains explainable from its permitted normalized inputs; do not promise exact replay after necessary inputs have been purged.

## 3. Spatial correctness before spatial speed

**VERIFIED FACT:** `ST_DWithin(geometry, geometry, distance)` uses coordinate-system units and requires matching SRIDs; geography distance is in metres and defaults to spheroidal measurement. It includes an index-assisted bounding-box filter. [ST_DWithin](https://postgis.net/docs/ST_DWithin.html)

**DESIGN RECOMMENDATION:** preserve original CRS metadata at ingestion; canonical longitude/latitude may be stored in EPSG:4326. For nationwide metric radius/distance, use indexed geography or a validated appropriate projected CRS and corresponding indexed geometry. Longitude/latitude degrees must never be compared to metre thresholds. Choose local projections by their area of validity; a single arbitrary local projection is not a Thailand-wide guarantee. Transform coordinates, not merely relabel their SRID. Do not treat an area centroid as a property anchor.

**VERIFIED FACT:** PostGIS `ORDER BY <->` supports index-assisted KNN with GiST. Geometry uses planar distance; geography KNN uses a sphere, unlike default spheroidal geography distance. Index use depends on the query shape. [KNN operator](https://postgis.net/docs/geometry_distance_knn.html)

**DESIGN RECOMMENDATION:** choose and disclose the metric. If exact spheroidal nearest order matters, evaluate exact distance over an analytically valid indexed radius population, or use a proven search-bound algorithm. A fixed small spherical KNN shortlist followed by spheroidal sorting is not proof of global exact nearest order. Similarly, nearest geographic objects are only a retrieval pool for comparables; measure type, property similarity, period and evidence relevance still determine admissibility. A retrieval limit is not a fixed number of recommended uses.

**VERIFIED FACT:** PostgreSQL's generic SP-GiST framework supports distance ordering for some operator classes. However, the current **PostGIS geometry SP-GiST** documentation explicitly reports no KNN support. These statements concern different operator classes and are not contradictory. GiST is the versatile default spatial index; BRIN depends on spatial ordering and low update frequency. [PostgreSQL index types](https://www.postgresql.org/docs/current/indexes-types.html), [PostGIS spatial indexes](https://postgis.net/docs/using_postgis_dbmanagement.html#build-indexes)

| Query family | DESIGN RECOMMENDATION |
|---|---|
| Canonical identifier/admin lookup | B-tree primary/unique and lookup indexes; textual source identifiers preserve leading zeros. |
| Nearby features/radius | GiST on the queried geometry/geography expression; `ST_DWithin` before exact distance ranking. |
| Zone/parcel/admin intersection | Spatial index plus exact predicate; retain every intersection and any boundary ambiguity. Bounding boxes alone do not prove containment. |
| Comparables | Indexed geography or admin partition plus measure/type/time admissibility; deterministic relevance policy after candidate retrieval. |
| Effective-period applicability | Typed ranges and matching range index when needed; distinguish data revision time. |
| Heterogeneous tag search | Targeted GIN/expression indexes only for actual JSONB/tag queries. |
| Large ordered archives | Consider BRIN/partitioning after workload and retention measurements; avoid speculative indexes on every field. |

**PROFESSIONAL METHODOLOGY:** inspect query plans and real row counts with `EXPLAIN`/`EXPLAIN ANALYZE`; an index existing does not establish that a query uses it. [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)

**DESIGN RECOMMENDATION:** acceptance cases include dense and sparse areas, province-boundary points, long polygons, null/invalid geometry, stale boundaries and cross-region properties. Require index-assisted selective spatial retrieval at realistic volume. Do not forbid all planner-selected sequential scans: scans of tiny reference tables or genuinely broad whole-table analysis can be appropriate. Forbid loading the national dataset into application loops to implement selective nearby queries. Routing, if later justified, needs a network graph and travel assumptions; straight-line distance is not travel time or legal road access.

## 4. Acquisition and resilient execution

**PROFESSIONAL METHODOLOGY:** retry only plausible transient failures; consider idempotency and avoid nested retries that amplify delay. Long-running faults need failure isolation rather than endless retry. Circuit breakers separate closed, open and limited half-open recovery states. [Retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry), [Circuit breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)

**DESIGN RECOMMENDATION:** represent work as dependencies, not a sequence of source names. After geography and permitted acquisition keys resolve, independent sources can run concurrently through one acquisition boundary. A database-only read must not wait for an irrelevant remote source. The boundary owns per-source and total concurrency, rate limits, queue admission, deadlines, retry count, cooldown, cancellation and a source-specific failure classification. Coordinate budgets across workers; a per-worker cap multiplied by workers is not an application-wide limit.

| Outcome | DESIGN RECOMMENDATION |
|---|---|
| Timeout/transient server failure | Retry only if safe, budget remains and another attempt can finish before the deadline; use capped exponential delay with jitter. |
| Rate limit | Honor the provider's retry instruction and shared source budget; do not switch accounts/IPs to evade it. |
| Invalid request or unsupported query | Correct the adapter/request; no blind retry. |
| Credential, permission, CAPTCHA or terms block | Mark access unavailable and require an authorized integration path; retries do not grant access. |
| Parsing/schema drift | Quarantine payload; preserve permitted diagnostic metadata; no publication as valid observations. |
| Source timeout with admissible cached evidence | Reuse only under analytical freshness policy; show source and last-confirmed date. |
| Required evidence unavailable | Dependent validation becomes `UNKNOWN`/`PARTIAL`, or the conclusion becomes `INSUFFICIENT EVIDENCE`; unrelated work continues. |

**VERIFIED FACT:** HTTP `Retry-After` can express a delay in seconds or a date. [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)

**DESIGN RECOMMENDATION:** connect, read and overall execution timeouts are separate controls. Retry one layer with the full request context. Select their numeric values from observed latency distributions, permitted traffic, hosting limits and user-wait experiments; this research supplies no universal seconds or retry counts.

### Durable work without claiming exactly-once execution

> **Historical alternative evaluated:** the queue/lease design below informed the reliability requirements. The final platform decision selects Cloudflare Workflows and does not include PostgreSQL or Cloudflare Queues in the initial implementation. Implement the deterministic Workflow instance/step identities and idempotent publication rules in `docs/technology-stack.md`, `docs/system-design.md` and `docs/performance-and-reliability.md`; do not implement this alternative queue design unless a later measured architecture decision activates it.

**VERIFIED FACT:** PostgreSQL documents `SKIP LOCKED` as useful to multiple consumers of a queue-like table, but unsuitable for general analytical queries because it skips locked rows. [SELECT locking](https://www.postgresql.org/docs/current/sql-select.html)

**DESIGN RECOMMENDATION:** a PostgreSQL queue is a proportionate starting option when the same database already owns ingestion state. A dedicated managed queue is also valid if deployment needs justify it. Required behavior, regardless of technology:

1. Claim ready jobs atomically in a short transaction; write owner, lease expiry, attempt and monotonic fencing token; commit before remote work.
2. Process outside the database transaction. Renew only the current live lease. Recovery can reclaim an expired lease.
3. Completion checks current ownership/fencing token. Late workers cannot overwrite newer outcomes.
4. Publish accepted observation versions and job completion atomically where possible. Use a durable outbox when a separate broker must receive events after database commit.
5. Deduplicate by source/product, normalized acquisition key, requested period/version, adapter version and authorization scope. Coalesce identical refresh work. Do not coalesce private analysis results across visitors.
6. Repeated delivery must not create duplicate observations or expensive repeated side effects. Enforce unique ingestion keys and result fingerprints. Retried AI calls may incur additional charges; checkpoint accepted stage outputs.
7. Exhaustion yields an explicit failed/dead-letter state with safe diagnostics; support cancellation and queue expiry. Distinguish operational failure from a completed analysis with insufficient evidence.

Lease duration, heartbeat interval, queue depth, worker count and retry schedule are **IMPLEMENTATION CHOICES requiring benchmark evidence**. A lease does not make a remote side effect exactly-once. For local atomic idempotency, rely on database uniqueness/transaction behavior, not a check-then-insert race. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## 5. Cache reuse must preserve meaning

**VERIFIED FACT:** HTTP caching defines freshness, validation and storage controls; `no-cache` and `no-store` have different meanings. These are HTTP rules, not a determination that an old legal or financial observation is analytically safe. [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html)

**DESIGN RECOMMENDATION:** distinguish source-response cache, persistent observations, target evidence links, derived features and request-scoped run output. A fresh HTTP response may contain old measurements. An old observation may remain appropriate historical evidence. Define freshness per variable, purpose, publication schedule and source coverage rather than one global TTL.

Cache fingerprints include target precision/geometry or area version, evidence versions, gazetteer/crosswalk, transform, matching policy, legal rules, component registry, economic references and calculation version as applicable. AI reuse additionally depends on model, prompt/schema and exact permitted context. Changed inputs invalidate their dependents. Store coverage and retrieval outcome separately: `NO_RECORD`, `OUTSIDE_COVERAGE`, `TIMEOUT`, `ACCESS_DENIED` and `PARSE_ERROR` must not all become an empty dataset.

**DESIGN RECOMMENDATION:** background refresh can serve eligible stale context with disclosure. Expired or unverified legal applicability cannot silently support a current `PASS`. License revocation or required deletion invalidates use even if TTL is unexpired. Negative caching prevents repeated known misses but never claims absent real-world features. Cache-fill coalescing prevents refresh storms. Request-scoped information must never enter shared cache keys, records or public responses by accident.

## 6. OSM services, rights and privacy

**VERIFIED FACT — current public Nominatim policy:** the aggregate application maximum is one request per second; identify the application, attribute results, support provider switching, and cache appropriately. Public autocomplete and systematic collection are forbidden; personal/confidential data must not be submitted. The policy now specifically addresses LLM-generated integrations and requires a deliberate informed developer decision. These rules apply to the OSMF public endpoint, not every independently operated Nominatim instance. [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)

**DESIGN RECOMMENDATION:** use the local normalized administrative reference for progressive province/district/subdistrict selection. Do not implement it through public Nominatim. Optional address resolution needs a separately approved provider/local deployment and data handling review. No map or geocoder is required to perform area-level analysis.

**VERIFIED FACT:** the Overpass maintainer identifies ordinary applications depending on public instances as a problematic use and recommends a self-operated instance. The published approximate 10,000 daily queries/1 GB guideline is a fairness guideline, not reserved capacity or an SLA. [Overpass commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)

**DESIGN RECOMMENDATION:** retain permitted filtered extracts scoped to analytical needs or contract for service capacity; public Overpass is not a production fallback during local failure. Downloading a transient source extract and retaining all national features are different persistence decisions. Do not convert prior research sample timings or file sizes into current capacity guarantees.

**VERIFIED FACT:** OSM data is ODbL-licensed, with attribution and relevant share-alike obligations; its copyright page links the legal terms. [OSM copyright](https://www.openstreetmap.org/copyright)

**DESIGN RECOMMENDATION:** track license/access tier, allowed ingestion, storage, processing, display, redistribution, AI transmission, attribution, expiry and policy-review date per source product. Serving a public URL or separating tables does not itself establish permission or remove derivative-database obligations. Keep license lineage through derived data and exports. Final ODbL classification of combined/derived products remains a source-rights review question; do not assert automatic compliance. Existing LED/REIC/government-access findings require their own authoritative confirmation where marked unresolved; this technical note does not upgrade them into granted rights.

## 7. No login is compatible with private temporary work

**PROFESSIONAL METHODOLOGY:** OWASP recommends secure session handling and notes that URL-carried secrets can leak through logs, history and referrers. HTTPS and appropriately protected cookies reduce exposure. [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

**DESIGN RECOMMENDATION:** no account or login flow; an anonymous, expiring run capability authorizes status/result/cancel access. A random public run ID alone is not authorization. Prefer a Secure, HttpOnly, SameSite cookie bound server-side to temporary runs, with request-origin/CSRF protections for mutations. Do not put capability secrets into URLs, analytics or logs. No public run-list or personal saved-history endpoint.

Use only the minimum temporary private data needed to finish the requested analysis, with server-enforced expiry and deletion. Separate shared source data from ephemeral property assertions and final output. Operational metrics exclude names, deed/address contents and prompt bodies. If retained ephemeral storage is introduced to survive worker restart, disclose and enforce its lifetime; disk persistence is not made harmless by calling it a cache. A temporary run may be lost after expiry; do not promise permanent recovery. Log/back-up/provider retention must match the policy, not just main-table deletion. Data retention duration and paid/provider deployment budget remain owner decisions where they materially affect cost or privacy; no numerical duration is invented here.

## 8. AI correctness and computational cost

**VERIFIED FACT:** JSON Schema's validation vocabulary specifies structural assertions. Format checks may be annotation-only unless validation is enabled. [JSON Schema 2020-12 validation](https://json-schema.org/draft/2020-12/json-schema-validation)

**INFERENCE:** valid structure is not evidence that a source exists, a value is true, a legal rule applies or a component mapping is economically valid. Typed outputs improve the interface, not epistemic authority.

**DESIGN RECOMMENDATION:** validate AI output in distinct steps: parse/schema → allowed IDs and enums → reference existence and request-context membership → dimensional/component compatibility → evidence entailment and claim strength → deterministic validator/calculation reconciliation. A schema-valid hallucinated evidence ID still fails. Unsupported components produce model-coverage gaps; missing parameters use the documented resolution hierarchy. AI cannot change engine outcomes. Refusal, truncation, timeout and invalid output are distinct stage outcomes with bounded correction attempts and deterministic fallback reporting.

**PROFESSIONAL METHODOLOGY:** externally supplied documents and tool content can carry indirect prompt injection; separating instructions from data and validating outputs are defenses, not a guarantee of complete prevention. [OWASP LLM prompt-injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

**DESIGN RECOMMENDATION:** pass selected structured evidence, stable IDs, counter-evidence and limitations to AI, not entire arbitrary source pages. Retrieved text is data and cannot authorize tool actions, new downloads, formula changes or secrets access. Whitelist analytical tools and resource bounds. Sensitive intake fields are omitted unless necessary and provider transmission is permitted.

**DESIGN RECOMMENDATION — minimal normal path:** combine evidence interpretation, dynamic concept proposal and structured mapping into one proposal stage where evaluations show quality is adequate; perform legal/physical/economic validation and scenarios deterministically; then use a synthesis stage. This is a proposed call-graph shape, not a professional rule that every run needs exactly two model calls. Short-circuit on insufficient inputs; correction/subdivision calls only when necessary. Parallelize independent candidate validation after proposals, not synthesis before results exist.

Measure input/output tokens, stage latency, corrections, model/provider version and cost. Prompt/context caching may be used only where privacy, licensing and exact dependency fingerprints permit. Restrict context by relevance while preserving material contrary facts and omitted-evidence disclosure. If the evidence packet cannot fit safely, stage or summarize with explicit lineage instead of silently dropping constraints. Provider, model and context limits must be evaluated at implementation; no current price or quality superiority claim is made here.

**DESIGN RECOMMENDATION:** compile each validated scenario into a dependency graph of controlled components, unit checks, capacity/resource constraints and cash-flow periods. Reuse invariant calculations across sensitivity runs; only affected dependencies recompute. Reject cycles and duplicate shared costs/revenues. Deterministic sensitivity needs no repeated LLM interpretation per sample. Computational budgets may bound exploration, but must disclose truncation and cannot pretend the explored candidates exhaust every possible use. Use model-evaluation fixtures to assess reproducibility of proposals separately from exact reproducibility of deterministic calculations.

## 9. Latency: credible UX guidance is not an app SLA

**PROFESSIONAL METHODOLOGY:** Nielsen's published guidance describes roughly 0.1 seconds for a feeling of immediate reaction, 1 second for continuity and 10 seconds for sustained attention, with useful progress feedback for longer work. These are usability heuristics, not a promise that this multi-source AI analysis completes in 10 seconds. [Response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)

**VERIFIED FACT:** web.dev classifies good INP at ≤200 ms and LCP at ≤2.5 s at the 75th percentile. These concern browser interaction/page loading, not end-to-end backend analysis completion. [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

**DESIGN RECOMMENDATION:** show submission acknowledgement and honest stage progress while a run executes. Status updates are not a preliminary investment recommendation: preserve one final analytical output. Show cancellation and explicit expiration/failure; do not fabricate percent complete or completion times for unpredictable dependencies.

| Measurement | Evidence required before setting numerical target |
|---|---|
| Acknowledgement/admin lookup/UI responsiveness | Browser/device/network tests on likely Thai user environments. |
| Warm-cache complete analysis | Stage traces for representative property/area, candidate count and evidence volume. |
| Cold-source analysis | Permitted real-source latency, throttling and queue tests; separate missing/stale/source-blocked cases. |
| Spatial/comparable retrieval | Query plans at realistic dense/sparse volumes and feature distributions. |
| Scenario/sensitivity execution | Largest supported composition, horizon and uncertainty exploration. |
| AI proposal/synthesis | Evaluated models and realistic context/output sizes including repair/refusal rates. |
| Capacity and cost | Concurrent requests, queue age, admitted/completed/rejected work, cache hit rates and token/CPU/storage costs. |
| Recovery | Worker/database outage, duplicate delivery, expired lease, restored backups and licensing-deletion propagation. |

**DESIGN RECOMMENDATION:** derive stage budgets from the dependency critical path: independent work overlaps, dependent stages add, and queue/admission time remains visible. Report percentile latency and error/timeout rates by warm/cold/degraded path. Good aggregate latency must not conceal rural coverage failure. Establish final completion SLO, availability objective and recovery targets through these benchmarks and owner operating expectations before launch. An architecture specification can define this acceptance process now without inventing measured performance.

## 10. Decisions and follow-through

| Classification | Conclusion |
|---|---|
| DESIGN RECOMMENDATION | PostgreSQL/PostGIS; modular API, acquisition workers and shared analytical store; start with small operational surface. |
| DESIGN RECOMMENDATION | GiST for normal PostGIS KNN/radius; metric correctness and precision gating are mandatory analytical requirements. |
| DESIGN RECOMMENDATION | Source-aware concurrency, idempotency, leases, freshness and failure isolation; no generic all-source blocking. |
| IMPLEMENTATION CHOICE | Frameworks, provider, queue product, exact indexes, worker counts and durations within the stated contracts. |
| OPEN QUESTION | Commercial/deployment budget, private temporary-run retention, source rights/tiers, and approved AI-provider handling where owner policy is needed. Continue independent architecture work. |
| KNOWN LIMITATION | No application benchmark establishes completion SLO, capacity, recovery time or model quality yet. |
| REQUIRED REVIEW | Recheck version-sensitive technical docs, public-service policies and rights before integration; final architecture review must resolve owner decisions without interpreting this note as Architecture Freeze. |

The implementation validation plan should exercise duplicate delivery after timeout, stale-worker completion, concurrent refresh coalescing, cross-visitor run access, expired result retrieval, full cache invalidation on source/policy change, missing spatial anchors, spherical/spheroidal order differences, invalid AI references, source outages and no-winner results. These are specifications for future tests; none were implemented by this research.
