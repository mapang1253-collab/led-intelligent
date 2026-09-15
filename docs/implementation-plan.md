# Implementation Specification and Handoff Plan

**Status: FROZEN IMPLEMENTATION HANDOFF — included in Architecture Freeze v1.0; owner decisions RD-1 through RD-10 recorded; no application implementation is included.**

## 1. Delivery boundary

The implementation team builds from recorded decisions RD-1 through RD-10, the LOCKED behavior in project-overview.md, [technology-stack.md](technology-stack.md) and this package's accepted design. Research/activation gates below remain fail-closed. The team may choose only details that remain explicitly marked IMPLEMENTATION CHOICE.

## 2. Dependency-ordered work packages

| WP | Build | Depends on | Completion evidence |
|---|---|---|---|
| 0 | architecture decision log, TypeScript workspace, schemas, reason-code/enums and Thai catalog foundation | recorded RD-1 through RD-10 | exact locked stack; every contract versioned; no conflict with overview/technology profile |
| 1 | admin/reference/units/time foundation | WP0 | Thailand admin combinations and historical/version cases |
| 2 | Supabase PostgreSQL/PostGIS, Hyperdrive access, R2 raw store, SQL migrations, lineage and run isolation | WP0-1 | integrity, size guard, purge, replay and recovery tests |
| 3 | SourceProduct manifest and ingestion framework | WP1-2 | fixture, rights, coverage, quarantine, retry tests |
| 4 | target resolution and Evidence/Feature engines | WP1-3 | ambiguity, precision ceiling, conflict/proxy lineage tests |
| 5 | legal/physical/demand requirement engines and rule/method publication | WP4 | curated rule/method fixtures and PASS/FAIL/PARTIAL/UNKNOWN coverage |
| 6 | economic registry and deterministic scenario engine | WP0,2,4 | formula/unit/account/double-count/golden model tests |
| 7 | Gemini 3.1 Flash-Lite gateway, quota manager and Thai concept schema/evaluation | WP4-6 | one-normal/two-maximum call tests; Thai/adversarial/novel/unsupported evaluation |
| 8 | comparison, final status and presentation | WP4-7 | clear/inconclusive/insufficient cases with dynamic candidates |
| 9 | React/Vite Thai SPA, Hono `/api/v1`, Cloudflare Workflows and asynchronous run experience | WP2,8 | zero-config no-login end-to-end cases, fixed polling, progress, protected result viewing and expiry; no result export |
| 10 | Cloudflare/Supabase free-tier performance, security/privacy/source-rights, resilience and operations | all | locked latency gates, quota/admission, isolation/authorization, outage/load/restore/purge/rights-revocation drills |

Source adapters and rule packs are activated independently after their own gates; the core system can ship with limited coverage if the output remains honest.

## 3. Required validation

### Unit/property tests

- units, Thai BE/CE and validity intervals;
- formula dimensional correctness and cash-flow timing;
- graph cycle/double-count/shared-capacity rejection;
- identity normalization without stripping leading zeros;
- proxy hierarchy and no missing-to-zero conversion;
- final status decision table.

### Integration/contract tests

- database constraints/migrations and PostGIS query semantics;
- every active source adapter against versioned representative fixtures;
- every module interface against producer/consumer contract conformance fixtures;
- parser-change quarantine and idempotent ingestion;
- evidence lineage/conflict/supersession/rights invalidation;
- rule and component pack publication/version pinning;
- AI schema/enum/citation validation and one-repair behavior;
- AI `th-TH` fields, model allow-list, one-normal/two-maximum call count and quota-window behavior;
- Workflow step replay/idempotency, duplicate external-side-effect prevention and retry/backoff/circuit behavior.
- run failure versus analytical-status behavior, including concept AI and final-synthesis failure.

### Domain review cases

- every Thai province with valid dependent admin IDs;
- area-only intake and a progressively richer version of the same target;
- ambiguous/incorrect parcel/title identifiers;
- EEC and non-EEC legal coverage; boundary-near property;
- missing frontage is UNKNOWN, not FAIL;
- critical PARTIAL/UNKNOWN/CONFLICTED validation cannot become FEASIBLE;
- OSM missing POI is not real-world absence;
- LED price remains distressed evidence; REIC remains area context;
- Treasury lookup with ambiguous key or unknown cycle/unit is not exact evidence;
- historical flood intersection is not a prospective hazard probability;
- unsupported economic behavior and unresolved parameter;
- hybrid use sharing capacity/cost without double counting;
- candidate ranking reversal under credible sensitivity;
- demand hypotheses with geographic/population mismatch and no unsupported demand-to-occupancy conversion;
- CLEAR, INCONCLUSIVE and INSUFFICIENT outputs; zero or many candidates.

### Performance/reliability tests

- cold/warm end-to-end benchmark at representative density/scale;
- query plans prove indexed spatial, temporal and comparable retrieval;
- source/model outage, slow tail, rate limit and stale-cache cases;
- concurrency/stampede, job crash/restart and database fail/recovery;
- cross-run access, expired capability, operator roles, adapter destination bounds and redaction;
- 24-hour expiry from creation, non-extending reads, automatic purge and absence of result-download/export routes;
- DRAFT/RETIRED packs cannot execute; ACADEMIC_REVIEWED requires the complete named review record;
- exact output-policy wording/placement and AI inability to remove verification actions;
- every positive and negative RD-6 precondition for NO_FEASIBLE_CANDIDATE;
- context/token and scenario expansion bounds;
- Thai-only UI/error/report fixtures and Noto Sans Thai browser rendering;
- `pnpm dev` localhost and `pnpm deploy` Cloudflare smoke paths without Docker;
- Workers CPU/request, Workflow-step, Hyperdrive-query, R2-operation, Supabase-size and Gemini-quota admission limits;
- backup restore and dependency-impact replay.

## 4. Source/rule/component activation evidence

An adapter is inactive until ownership, authorized access, semantics/units/time, geographic coverage, licence/storage/display, privacy, refresh, limits, fixtures and analytical purpose are accepted.

A legal pack additionally needs authoritative instruments, amendment/effective-date review and rule-family coverage. Academic execution requires the RD-4 named review record and limitations. Qualified Thai professional sign-off is required only before any future professional/legal-reliance claim.

A physical or demand method additionally needs accepted evidence methods/precision, applicability and criticality rules, representative counter-cases and uncertainty behavior. Academic execution follows RD-4; future professional-reliance claims require the relevant Thai surveying/engineering/market review.

An economic component needs formula/method basis, applicability, unit and timing review, double-count controls, golden cases and uncertainty behavior. Academic execution follows RD-4; future formal appraisal/feasibility reliance requires appropriate professional review.

Activation state is runtime configuration with audited approval. It is not hard-coded.

## 5. RECORDED OWNER DECISIONS

### RD-1 Academic university project

The owner confirmed on 2026-09-15 that this is a university project submitted to an instructor. It is not being designed as a commercial or public production service in the current phase. Architecture-level privacy, source-rights and reliability controls remain because academic status does not create permission to access, retain or redistribute restricted data.

For implementation, use lawfully accessible academic/open data and representative fixtures. Keep restricted/member/undocumented adapters disabled until explicit permission exists. Do not describe a classroom demonstration as a professionally certified legal, appraisal or investment product.

### RD-2 Thailand-wide product scope; Chon Buri/EEC only for testing

The system must accept and analyze properties in every province through the same contracts and analytical pipeline. Chon Buri/EEC is only the primary research, integration-test and validation fixture region. There is no Chon Buri-first product, EEC-only detailed mode or regional MVP.

Source coverage may legitimately vary by geography. The coverage resolver must report actual availability and reduce claim scope or return INSUFFICIENT_EVIDENCE where necessary; it must never route non-EEC properties through a weaker hard-coded product path. Tests must include all provinces and detailed non-EEC cases in addition to Chon Buri fixtures.

## 6. ADDITIONAL RECORDED OWNER DECISIONS

### RD-3 Anonymous run retention and result-only delivery

- An anonymous AnalysisRun expires exactly 24 hours after `created_at`. Reading the result does not extend expiry.
- The separate authorization capability expires with the run. After expiry, status/result/cancel returns EXPIRED and cannot reveal the prior content.
- Automatic purge removes run-scoped intake, user assertions, concepts, AI exchanges, validations, scenarios, final output and temporary objects. Shared source observations and permitted aggregate operational metrics are unaffected.
- A failed purge remains an operator-visible retry job until completed. Logs contain no full address, title/deed identifier, prompt or result body. Backup restoration must reapply expiry tombstones before service resumes.
- Before expiry, the authorized client may view the accepted FinalAnalysis, evidence disclosures, versions and disclaimer on the protected web page.
- MVP has no PDF/JSON/CSV or other result download/export, application print action, public share link, public run listing, saved history or account. Possession of a public `run_id` never authorizes access.

### RD-4 Academic review governance

Rule packs, physical/demand methods, economic components and parameter sets use `DRAFT`, `ACADEMIC_REVIEWED` and `RETIRED` lifecycle states in this project. `PRODUCTION_APPROVED` is reserved for a future non-academic deployment and cannot be inferred from `ACADEMIC_REVIEWED`.

`ACADEMIC_REVIEWED` requires a named reviewer (project author, instructor/advisor or documented subject specialist), reviewer role, reviewed version/hash, evidence/method references, review date, test results, limitations and an explicit academic-use decision. AI and automated tests cannot supply the approval. A reviewer may reject or retire a version without editing its history.

Only `ACADEMIC_REVIEWED` versions may execute in the submitted academic demonstration. Their PASS/FEASIBLE outputs mean that the encoded academic screening rule/model passed; they are not legal permission, engineering certification, formal appraisal or investment advice. If no reviewed method/pack covers a requirement, the result remains UNKNOWN, PARTIAL or UNSUPPORTED rather than falling back to a draft.

### RD-5 Required academic disclaimer and escalation

Every on-screen final result must include the versioned wording and scope/status additions in [output-policy.md](output-policy.md). The disclaimer is visible in the main result and cannot be hidden only in help text, a tooltip or a collapsed section.

The deterministic result supplies verification actions for every material UNKNOWN, PARTIAL, conflict, proxy, assumption and approval requirement. The UI groups these by legal/planning, survey/engineering, market/appraisal and source/property-document verification. AI may rewrite for clarity but cannot remove, weaken or invent an action.

### RD-6 All evaluated candidates have verified critical failures

Retain the three locked top-level states. Return `INCONCLUSIVE` with reason `NO_FEASIBLE_CANDIDATE` only when:

1. CandidateSearchRecord stopped with `EVIDENCE_SPACE_COVERED`;
2. at least one concept was accepted and evaluated;
3. every accepted concept is ELIMINATED by one or more verified applicable critical FAIL outcomes;
4. no candidate remains UNSUPPORTED or UNVALIDATED in a way that could still be feasible; and
5. the result shows every evaluated concept and its exact exclusion evidence/rule.

`leading_use` is absent and `alternatives` contains no viable alternative. The user-facing statement is “No evaluated candidate passed all critical requirements,” never “This property has no possible use.” If search is incomplete, a candidate is merely unsupported/unvalidated, or critical evidence is missing, use the normal INCONCLUSIVE/INSUFFICIENT_EVIDENCE rules instead and do not emit `NO_FEASIBLE_CANDIDATE`.

### RD-7 Browser-based web application

- The deliverable is a responsive web application accessed through a modern desktop or mobile browser. A CLI, notebook, native desktop app or native mobile app may be used only as developer tooling, never as the submitted product interface.
- The web frontend owns normalized property intake, progress/status presentation and the single protected final-result view with evidence and limitations.
- The server-side HTTP/JSON backend owns run creation/access control, data acquisition, credentials, database/cache access, evidence/feature processing, AI calls, deterministic validation, economic/scenario calculations and comparison. Secrets, source adapters, protected raw data and executable formulas never run in or ship to the browser.
- Long analysis is asynchronous. Initial submission returns an opaque `run_id` and protected capability context promptly; the browser uses the RD-8 fixed two-second/five-second polling schedule until COMPLETE/PARTIAL/FAILED/EXPIRED. It does not expose secrets in URLs.
- The normal user journey has no login and no professional parameter form: open the web app, select province/district/subdistrict, optionally add property details, submit once, observe honest progress and receive one final analysis.
- The initial MVP does not require an interactive map. Responsive layout, keyboard operation, readable status/validation distinctions and Thai text rendering are release acceptance requirements. Framework and component-system choices are fixed by RD-8; non-user-facing visual polish remains an implementation choice.

### RD-8 Fixed free-tier web platform

The owner fixed the implementation profile in [technology-stack.md](technology-stack.md): TypeScript strict; Node.js 24 LTS/pnpm development tooling; React/Vite SPA; Hono on Cloudflare Workers; Cloudflare Workflows, Cron, R2 and Hyperdrive; Supabase PostgreSQL/PostGIS; Kysely/`pg`; and the recorded UI, validation, testing and exact-arithmetic libraries. React static assets and `/api/v1` share one Cloudflare deployment/origin. Node.js is not the deployed application server.

Local development connects to a hosted Supabase development project and runs through the Cloudflare Vite plugin. Docker, Next.js, server-side rendering, Redis, Kubernetes, GraphQL, WebSockets and Cloudflare Queues are not initial dependencies. A provider/framework/runtime or major-version change requires an owner decision; dependency patch/minor updates require the full affected tests and a committed lockfile.

### RD-9 Gemini and quota strategy

The primary model is `gemini-3.1-flash-lite` through the official server-side Google GenAI SDK. A normal run makes one concept-proposal call. One repair is permitted only after structured/ID/citation/numerical-support/Thai-language validation failure, so the absolute maximum is two calls per run. The default final report is rendered from deterministic Thai templates and consumes no additional AI request.

The quota manager atomically enforces deployment-recorded RPM, TPM and RPD limits, a 20% daily reserve and the per-run cap. It respects provider reset/Retry-After behavior, never immediately retries 429 and never changes model merely to avoid a rate limit. If no accepted cached candidate set exists, quota/provider failure returns an operational FAILED_RETRYABLE run with safe evidence artifacts and no recommendation. Replacement models require the same evaluation and data-handling gate.

### RD-10 Thai-only user experience

The MVP locale is `th-TH` and exposes no language selector. Navigation, form labels, validation, progress, errors, evidence explanations and results are Thai. Internal identifiers, transport JSON keys, enums and reason codes remain English, but the presentation contract maps them to versioned Thai messages and never displays a raw code alone.

Every displayed AI field carries `locale: "th-TH"`, uses explicit `*_th` fields and passes schema, ID/citation and Thai-language validation before display. Official proper names and abbreviations may retain their official spelling inside Thai context. Deterministic Thai templates own required disclaimer, scope/status and verification wording. Browser output uses bundled Noto Sans Thai.

## 7. Classification B: RESEARCHABLE / activation questions

| ID | Question | Closure evidence |
|---|---|---|
| RQ-1 | Treasury CSV/API keys, units, cycles, geometry and authorized institutional access | owner documentation/contract, representative responses and semantic fixtures |
| RQ-2 | EEC and nationwide legal-layer currency, amendments, hierarchy, coverage and rights | authoritative instruments, amendment search, coverage statement and professional sign-off |
| RQ-3 | local arm's-length price, rent, capex, opex, yields and demand/absorption methods | licensed/authorized datasets, population definitions, calibration and appraisal/market review |
| RQ-4 | OSM-derived database/display duties and every other source's reuse/display terms | release-specific licence/contract review and tested attribution/purge behavior |
| RQ-5 | latency, rate, capacity and recovery configuration other than the locked 24-hour run expiry | provider rules and representative benchmark/load/restore evidence |
| RQ-6 | Gemini 3.1 Flash-Lite prompt/context fitness, current quota and handling terms | evaluated Thai structured-output quality, adversarial tests, latency/token/quota data and approved provider terms |

These do not require product invention. A source, rule, method or pack remains inactive until its own closure evidence exists.

## 8. Classification C: IMPLEMENTATION CHOICES

Exact normalized table decomposition, exact indexes validated by representative query plans, bounded Workflow concurrency, source-specific retry durations, non-user-facing visual polish and observability detail remain implementation choices. They must stay inside [technology-stack.md](technology-stack.md), the contracts, module ownership, PostGIS workload, free-tier budgets, rights, security, determinism, failure and benchmark requirements.

## 9. Classification D: KNOWN LIMITATIONS / FUTURE WORK

MVP has no end-user account/profile, interactive map selection, result download/export, saved history, public anonymous sharing or personalized financing optimization. Coverage varies nationally. A location without legal/property/financial evidence may receive AREA analysis, a scope downgrade or INSUFFICIENT_EVIDENCE. Novel enterprise economics remain unsupported until a governed component is added. Routing/travel time, prospective hazard models and complete nationwide legal automation remain future capabilities unless separately activated.

## 10. Classification E: OBSOLETE positions

Investor-profile ranking, mandatory login/map pin, LED-only intake, Chon-Buri-only core logic, normal user tuning of professional assumptions, Treasury building assessment as construction cost, deed-only LED-to-Treasury join, fixed Top-N, forced winner, prompt-authored formulas, string-based component/legal matching, UNKNOWN-as-FAIL and sequential all-source acquisition are resolved as superseded. Historical research may retain them only with its historical banner; they are not implementation instructions.

## 11. Definition of implementation-ready

Architecture Freeze v1.0 was declared after confirming that:

- recorded decisions RD-1 through RD-10 are reflected throughout the package;
- accepted DESIGN RECOMMENDATIONS are recorded as decisions;
- contracts and status semantics are stable;
- unreviewed source/rule/method/component versions remain inactive and activation evidence is an implementation/release gate;
- every work package has executable interface/domain/reliability/security cases;
- performance SLOs and recovery targets remain benchmark-required before demonstration/release acceptance;
- the end-to-end walkthrough produces no implicit responsibility or natural-language-only module interface.
