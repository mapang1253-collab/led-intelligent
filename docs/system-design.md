# System Design

**Status: FROZEN WEB-APP DESIGN — included in Architecture Freeze v1.0; modular monolith plus Cloudflare Workflows for MVP. Technology is fixed by [technology-stack.md](technology-stack.md).**

## 1. Deployment shape

Use one TypeScript full-stack Cloudflare project: a React/Vite SPA, Hono Worker API, Cloudflare Workflows, R2 and Supabase PostgreSQL/PostGIS through Hyperdrive. Enforced packages share typed domain contracts. The browser communicates with the backend through same-origin HTTP/JSON. This reduces distributed failure while isolating durable jobs. Split backend modules into services only after independent scaling, security or ownership is demonstrated.

The browser never receives provider credentials, restricted raw objects, source-adapter access, formula execution or direct database access. A university demonstration may run locally or on Cloudflare, but it uses the same web interfaces and server ownership. Local development uses the Cloudflare Vite plugin and a hosted Supabase development project; it does not require Docker.

## 2. Modules

| Module | Responsibility |
|---|---|
| Public API | intake, opaque run ID, capability-protected status/result |
| Orchestrator | dependency graph, deadlines, stage state, degradation |
| Geography/property | admin validation, location/identity candidates |
| Source gateway/ingestion | manifests, budgets, capture, parsing, normalization, quarantine |
| Evidence/features | observations, links, conflicts, substitutions, deterministic features |
| AI gateway | context, schema output, repair, audit |
| Validation | legal, physical and demand requirements |
| Economic registry/scenario | pack lookup, graph validation, calculation, sensitivity |
| Comparison/presentation | dominance, final status, evidence cards/report |
| Run access | anonymous capability validation, protected result viewing, expiry and cancellation |
| Operator tools | authenticated source/rule/component curation, activation, replay and audit |

Modules exchange typed contracts. Direct cross-module writes are prohibited; database schemas reinforce ownership.

## 3. Request flow

1. Create expiring isolated AnalysisRun.
2. Resolve admin hierarchy and optional assertions.
3. Read cache and schedule only authorized missing evidence.
4. Run independent acquisition/features concurrently within deadlines.
5. Generate structured concepts once.
6. Validate legal, physical, demand and component mappings concurrently where independent.
7. Calculate and sensitize eligible scenarios without LLM calls.
8. Compare and produce structured status/reasons.
9. Render the accepted decision with deterministic Thai templates; AI final synthesis remains disabled until its evaluation gate passes.
10. Return a RunResultEnvelope that separates operational completion from analytical recommendation status.

The client can show progress, but the normal experience returns one completed analysis without a user parameter round trip.

## 4. Jobs and source isolation

Workflow instances use the run ID as a deterministic instance identity. Steps include a stable name/version, idempotency key, dependencies, priority, deadline, attempt and classified result. Step writes are idempotent, validate the pinned dependency fingerprint and publish an accepted version once; a replay cannot overwrite a different accepted result. Retries are bounded and error/source specific with backoff/jitter; semantic/auth/licence failures are not blindly retried.

Per-source concurrency/rate budgets and circuit state isolate failures. Duplicate work coalesces by semantic cache key. Adapters expose declared discover/fetch/parse/normalize/health/coverage capabilities, each independently disabled.

CAPTCHA, session-token and member-login flows are not automated without explicit authorization. OSM production queries use local/licensed extracts; public Nominatim/Overpass are not application backends. Adapters accept normalized acquisition keys, not arbitrary user-controlled URLs, and enforce configured destinations and response bounds.

## 5. Frontend

Provide a responsive browser experience with:

1. dependent province/district/subdistrict selection and progressive optional property fields;
2. one submit action that creates the analysis run;
3. honest queued/running/stage progress without fabricated percentages or investment conclusions;
4. complete/partial/failed/expired states from RunResultEnvelope;
5. one final report that visually distinguishes scope, recommendation and validation status, evidence/proxy/benchmark/assumption, geography/as-of and verification needs; and
6. protected on-screen result viewing before expiry.

Material limitations and the `academic-output-v2` disclaimer are visible by default. The user experience is Thai-only and uses the typed `th-TH` catalog and bundled Noto Sans Thai specified in [technology-stack.md](technology-stack.md). React Router, TanStack Query, React Hook Form/Zod and the recorded component system implement keyboard-accessible desktop/mobile layouts. User-visible AI content must pass Thai-language validation before rendering.

No login, profile, personal dashboard, application download/export or public share link. The visible run ID is not authorization. A separate capability is protected from URLs/logs, checked on every status/result/cancel operation and expires 24 hours after run creation as specified in [security-privacy-compliance.md](security-privacy-compliance.md). Reading does not extend expiry.

## 6. Public web interface

The server provides the `/api/v1` administrative lookup and analysis-run routes fixed in [technology-stack.md](technology-stack.md). The client polls at the fixed two-second/five-second schedule; MVP does not use WebSockets or server-sent events. Request/response meaning comes from [api-contracts.md](api-contracts.md).

Run creation validates PropertyIntake and establishes the protected capability context. Status/result/cancel require that context and never accept the capability in a URL. Browser refresh may recover the run until expiry. Invalid input is a client-visible validation response; analytical partial success remains a successful RunResultEnvelope; infrastructure failures use retryable/final run states.

## 7. Configuration and observability

Credentials/operator privileges stay server-side in Cloudflare secret management. Hyperdrive, R2 and Workflow resources use typed bindings. Environments use separate activation manifests. Rule/component/source changes pass reviewed publication workflows.

Capture Workflow/stage duration, cache outcome, source result, evidence coverage, validator/model status, token/quota use, scenario count and final status without sensitive content. Correlation IDs and reason codes connect traces. Source health is separate from analytical validity.

Provider, language, UI framework, workflow and object-store choices are LOCKED by RD-8 through RD-10 and [technology-stack.md](technology-stack.md). Exact index tuning, bounded concurrency and safe dependency patch versions remain measurement-led implementation choices. End-user no-login does not remove authentication or authorization from operator publication tools.
