# Technology Stack and Implementation Profile

**Status: FROZEN LOCKED OWNER DECISION — included in Architecture Freeze v1.0. Decision date: 2026-09-15.**

This document is the single source of truth for implementation technology, runtime boundaries, repository shape, Thai-language delivery, AI-provider behavior and the free-tier operating profile. Domain semantics remain governed by [project-overview.md](project-overview.md) and the specialized architecture documents. If another active document still describes one of the choices fixed here as an `IMPLEMENTATION CHOICE`, this document governs. The MVP presents results on the protected web page and has no application download/export feature.

## 1. Delivery constraints

The implementation is a responsive Thailand-wide web application. Chon Buri/EEC data is test and validation coverage only. The initial university deployment uses Cloudflare, Supabase and Google Gemini free tiers. It must run locally and deploy without Docker.

Use one full-stack Cloudflare project so that the React application, static assets and HTTP API share one origin. Keep all credentials, source adapters, database access, AI calls, validation, scenario calculations and authorization on the server side.

## 2. Locked stack

| Concern | Required choice |
|---|---|
| Language | TypeScript with `strict` enabled; ECMAScript modules |
| Developer toolchain | Node.js 24 LTS and pnpm 10 |
| Web client | React 19 single-page application built with Vite |
| Routing | React Router |
| Styling/components | Tailwind CSS 4; committed shadcn/ui component source using Radix primitives; Lucide icons |
| Forms/contracts | React Hook Form and Zod schemas shared with the server |
| Server state | TanStack Query; local React state for component-local state |
| Public API | Hono on Cloudflare Workers |
| Long-running orchestration | Cloudflare Workflows; Cron Triggers for scheduled maintenance |
| Database | Supabase-hosted PostgreSQL with PostGIS |
| Database access | Cloudflare Hyperdrive, `pg` and Kysely |
| Raw-object storage | Cloudflare R2 Standard, subject to source rights |
| AI SDK/model | Official `@google/genai`; `gemini-3.1-flash-lite` primary |
| Exact arithmetic | PostgreSQL `numeric` plus `decimal.js`; decimal values cross contracts as strings |
| Tests | Vitest, Testing Library and Playwright |
| Formatting/linting | Biome |
| Deployment | Wrangler to Cloudflare Workers |

Pin exact dependency versions and commit `pnpm-lock.yaml` when implementation begins. Patch/minor security updates are permitted only after the required test suite passes. A framework, provider, runtime or major-version change requires a recorded architecture decision.

Cloudflare directly supports a React/Vite SPA, a Worker API and local Workers-runtime emulation through its Vite plugin. This application does not require server-rendered public content, React Server Components or Next.js-specific routing. Static SPA assets should be served without invoking the Worker; `/api/v1/*` is handled by Hono. Next.js, OpenNext and vinext are outside this implementation profile.

## 3. Deployment topology

```text
Browser
  |-- React/Vite static assets
  `-- same-origin /api/v1/*
        |
        v
Cloudflare Worker (Hono public API)
        |
        +-- AnalysisWorkflow / MaintenanceWorkflow
        |      +-- source adapters
        |      +-- Gemini gateway
        |      +-- deterministic domain engines
        |      `-- accepted stage persistence
        |
        +-- Hyperdrive --> Supabase PostgreSQL/PostGIS
        `-- R2 --> rights-permitted raw source objects
```

Node.js is a local build, migration, test and deployment tool. Production application code executes in the Cloudflare `workerd` runtime. Enable only the Workers compatibility flags required by audited dependencies.

Cloudflare Workflows is the initial background-work mechanism. Use the run ID as the deterministic Workflow instance identity. Each durable step has one stable name/version, one bounded responsibility, an idempotency key, a deadline and classified retry behavior. Independent source steps may run concurrently. A replay validates the pinned dependency fingerprint and cannot overwrite a different accepted result. Persist only accepted, schema-valid stage output. Cloudflare Queues is not an initial dependency; add it only after measurements prove that Workflows cannot supply the required isolation or throughput.

## 4. Repository shape and module boundaries

```text
apps/
  web/
    src/
      client/
        app/
        routes/
        components/
        features/
        styles/
      worker/
        api/
        middleware/
        routes/
        index.ts
      workflows/
        analysis-workflow.ts
        maintenance-workflow.ts

packages/
  contracts/
  domain/
  analysis-engine/
  evidence-engine/
  validation-engine/
  scenario-engine/
  ai-gateway/
  data-access/
  source-adapters/
  i18n/
  ui/
  test-fixtures/

database/
  migrations/
  seeds/
  reviewed-packs/

tools/
  ingestion/
  validation/
  benchmarks/

public/
  fonts/
```

`contracts` and `domain` do not import UI, database, Cloudflare, Supabase or provider modules. Analytical engines consume and return typed domain contracts and contain no provider calls. `data-access` owns SQL and transaction boundaries. `ai-gateway` is the only module that calls Gemini. `source-adapters` is the only module that calls evidence providers. UI code consumes public contracts and never imports server modules. Reject circular package dependencies in the build.

MVP operator publication is performed through authenticated, audited migration/seed tooling. A future operator web UI must sit behind Cloudflare Access or an equivalent owner-approved control; no operator route is public.

## 5. Browser experience and component ownership

Required user-flow components are:

- `PropertyIntakeForm`, `ProvinceSelect`, `DistrictSelect`, `SubdistrictSelect` and `OptionalPropertyFields`;
- `AnalysisSubmit`, `AnalysisProgress` and `RunStateNotice`;
- `ResultHeader`, `AcademicDisclaimer`, `ScopeBadge` and `RecommendationSummary`;
- `CandidateComparison`, `ValidationMatrix`, `EvidenceCard`, `ScenarioTable` and `SensitivitySection`;
- `AssumptionList`, `LimitationList` and `VerificationActions`;
- `ExpiredRun`, `RetryableError` and `FinalError`.

TanStack Query owns remote run state. Use React state for local UI state and introduce no additional global-state library without a measured need. The browser and server reuse Zod input contracts, but the server always validates independently. Use semantic HTML, visible focus, keyboard operation, sufficient contrast and responsive layouts.

The first release has no interactive map. A route may display a source-provided static location summary, but it cannot imply parcel precision not present in `ResolvedTarget`.

## 6. Thai-language contract

The product locale is fixed for MVP:

```text
DEFAULT_LOCALE=th-TH
SUPPORTED_LOCALES=th-TH
```

All end-user navigation, fields, validation, progress, errors, evidence explanations and analytical results are Thai. The MVP exposes no language selector. UI text comes from a typed catalog in `packages/i18n`; user-facing strings are not scattered through components.

Internal identifiers, JSON property names, enum values and reason codes remain stable English ASCII. The presentation layer maps every public code to Thai text and never shows an untranslated raw error as the only explanation. Proper names, registered organization names, source-product names and established abbreviations may remain in their official form when surrounded by Thai context.

Store instants as ISO 8601 UTC. Render user-facing dates with `th-TH` and `Asia/Bangkok`. Format money with an explicit currency and Thai locale. Use ordinary 0-9 digits for readability. Bundle and self-host Noto Sans Thai for consistent browser output.

Every AI contract includes `locale: "th-TH"`. User-visible AI fields use explicit names such as `label_th`, `description_th`, `supporting_reason_th` and `uncertainty_th`. Validate the locale, required fields, IDs and content before presentation. Escape all source, user and AI text. A language failure receives the same single bounded repair opportunity as any other schema failure; repeated failure is `AI_OUTPUT_INVALID`.

## 7. Public HTTP operations

The public API uses these same-origin routes:

| Method and path | Meaning |
|---|---|
| `GET /api/v1/administrative-areas/provinces` | active province summaries |
| `GET /api/v1/administrative-areas/districts?province_id=...` | valid districts for a province/version |
| `GET /api/v1/administrative-areas/subdistricts?district_id=...` | valid subdistricts for a district/version |
| `POST /api/v1/analysis-runs` | validate intake, create capability context and start workflow |
| `GET /api/v1/analysis-runs/:run_id` | read protected status/result envelope |
| `POST /api/v1/analysis-runs/:run_id/cancel` | idempotently request cancellation |

Run creation returns `run_id`, `run_state`, `created_at` and fixed `expires_at` promptly. The browser polls every two seconds for the first 30 seconds and every five seconds thereafter while the run is QUEUED or RUNNING. Polling stops for a terminal state and pauses while the page is hidden. MVP does not use WebSockets or server-sent events.

The server puts the independent run capability in an HttpOnly, SameSite=Lax cookie; use Secure in hosted environments and an equivalent safe localhost configuration. The cookie contains or protects one current run capability and is never available to application JavaScript. The public `run_id` may appear in the application route but grants no access. Mutating operations verify same-origin requests and CSRF controls.

## 8. Database, spatial work and object storage

SQL migrations are the schema authority. Kysely provides typed queries; it does not replace explicit migrations, database constraints or reviewed SQL. Worker code connects through Hyperdrive and never exposes the database connection or Supabase service role to the browser.

Use PostgreSQL `numeric` and decimal strings for money, rates, areas and other precision-sensitive values. Use `decimal.js` in deterministic calculations. JavaScript `number` is permitted for coordinates and explicitly approximate values only. PostGIS performs intersection, containment, radius, nearest-neighbor and coverage queries through matching GiST indexes. Application full-table spatial loops fail acceptance.

R2 stores only raw or large objects whose acquisition, retention and processing rights have passed the source gate. PostgreSQL stores their hashes, metadata, rights and lineage. Do not load complete nationwide OSM/Treasury raw data into the Supabase Free database. Preprocess large authorized files with bounded local ingestion tools, keep raw objects in R2 and load only the normalized/indexed records activated for analysis.

The 500 MB Supabase Free database ceiling is an operating constraint. Measure database and index size after each import and refuse an import that would exceed the configured safety threshold. Nationwide product behavior means all 77 provinces use one pipeline; it does not claim equal active evidence coverage. Uncovered locations return the documented narrower scope or evidence status.

## 9. Data structures and algorithms

Use discriminated unions for run, evidence, validation, model and recommendation states. Use branded TypeScript IDs so incompatible entity IDs cannot be interchanged. Use `Map` for bounded indexed lookup, `Set` for deduplication and adjacency lists for dependency/component graphs.

Evaluate a validated component graph with cycle detection and Kahn topological ordering in `O(V + E)`. Entity matching first applies indexed blocking keys, then bounded candidate comparison. Evidence selection applies mandatory admissibility filters before measure-specific lexicographic fitness; do not invent a universal weighted score. Spatial and temporal shortlists execute in PostgreSQL/PostGIS before bounded application ranking.

Run independent acquisition/feature work concurrently under per-source limits and collect classified outcomes without letting one degradable source abort unrelated work. Reuse invariant component nodes across scenarios. Sensitivity calculation recomputes only affected descendants and never invokes AI. Every cache key includes the exact source/evidence/context and the rule, method, component, parameter, prompt, schema and model versions that determine the value.

## 10. Gemini model, calls and quota behavior

The official Google GenAI SDK runs only in `ai-gateway`. The default model ID is `gemini-3.1-flash-lite`, selected for structured, low-latency, high-volume tasks. The normal run makes one concept-proposal request. A second request is permitted only to repair a schema, ID, citation, numerical-support or Thai-language validation failure. `AI_MAX_CALLS_PER_RUN` is fixed at 2.

The accepted deterministic comparison is rendered through versioned Thai templates by default, so final presentation consumes no additional AI quota and remains available after an accepted candidate set exists. An AI final-synthesis call remains disabled until evaluation proves material quality benefit within the free-tier budget.

`gemini-3.5-flash-lite` may be evaluated as a configured replacement, not called automatically as an escalation. `gemini-2.5-flash-lite` may replace the primary only if the primary model is unavailable/deprecated for the project and the replacement passes the same regression and data-handling gates. A 429 never triggers model hopping or an immediate retry.

Gemini quotas are provider/project facts, not constants in source code. Record the current AI Studio limits at deployment:

```text
GEMINI_RPM_LIMIT
GEMINI_TPM_LIMIT
GEMINI_RPD_LIMIT
AI_MAX_CALLS_PER_RUN=2
AI_DAILY_RESERVE_PERCENT=20
```

Before every call, reserve capacity atomically in a PostgreSQL quota window keyed by provider, project, model and time window. Enforce RPM, TPM, RPD, a 20% daily reserve and the per-run cap. Reconcile estimated tokens with returned usage metadata. On 429, store the provider reset/retry time where supplied, open the matching budget window and return a typed quota outcome.

Reuse an accepted AI result only when its exact context/prompt/schema/model digest and rights scope match. Context containing anonymous user assertions remains run-scoped. If concept generation has no accepted cached result and quota/provider access is unavailable, the run is operationally FAILED_RETRYABLE with safe deterministic evidence artifacts and no recommendation. Never manufacture concepts to conceal AI failure.

Support three explicit modes:

- `LIVE_AI`: call the configured Gemini model;
- `RECORDED_AI`: use versioned accepted responses for named test/demo fixtures and visibly label them as fixture output;
- `AI_DISABLED`: produce permitted deterministic evidence artifacts without generating a new recommendation.

The free Gemini service may permit provider product improvement using submitted content. The gateway therefore sends only a rights-filtered, minimized evidence projection. It excludes personal names/contact details, complete title/deed identifiers, credentials, restricted raw documents and any content lacking third-party AI-transmission rights.

## 11. Result presentation

The protected run endpoint returns the accepted `FinalAnalysis`, Thai display strings, evidence disclosures, verification actions, versions, creation/expiry times and output-policy version. The browser renders this result on the web page. The application provides no PDF, JSON, CSV, print or other download/export action and creates no public share URL. A browser or operating-system screenshot/print command is outside the application contract and receives no special implementation support.

## 12. Free-tier operating profile and performance gates

Move scheduled/bulk source ingestion outside the interactive path. A normal run reads pre-ingested evidence, performs indexed queries, makes at most one normal AI call, runs bounded deterministic validation/calculation and renders Thai output. Split CPU work into bounded Workflow steps and let PostGIS perform spatial work.

Initial release targets are:

| Target | Acceptance threshold |
|---|---|
| usable application shell | p95 <= 2.5 seconds on the documented mobile profile |
| run acknowledgement | p95 <= 1 second, excluding client network variability |
| first truthful progress state | <= 2 seconds after acknowledgement |
| warm representative analysis | p95 <= 30 seconds |
| interactive run deadline | 60 seconds |
| each Gemini request | 20-second deadline |

These are benchmark gates, not unsupported promises. If a representative run misses them, reduce interactive work, improve indexes/cache or keep the affected capability inactive. The free-tier profile cannot silently enable paid services.

Admission control uses the minimum remaining budget across Workers requests/CPU, Workflow steps, Hyperdrive queries, R2 operations, Supabase capacity and Gemini RPM/TPM/RPD. Emit a safe Thai capacity message before starting work that cannot finish. Monitoring records request/stage time, query count, Workflow steps, R2 operations and AI tokens without user/source content.

## 13. Local development and deployment

The implementer needs Git, Node.js 24 LTS, pnpm and accounts/projects for Cloudflare, Supabase and Google AI Studio. Hosted Supabase supplies development PostgreSQL/PostGIS; local application work does not run `supabase start` and does not require Docker.

The implementation must provide these commands:

```text
pnpm install
pnpm setup:check
pnpm db:migrate
pnpm db:seed:academic
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm benchmark
pnpm deploy
```

`pnpm dev` starts the React application and Worker through the Cloudflare Vite plugin and connects to the configured hosted development database. `pnpm deploy` validates configuration, runs non-destructive pre-deploy checks, builds and deploys the Cloudflare application; database migrations remain an explicit preceding command and are never hidden inside page startup.

Provide `.dev.vars.example`, `.env.migration.example` and `wrangler.jsonc`. Generate typed Cloudflare bindings. No secret may use the public `VITE_` prefix. Never commit Gemini keys, database connection strings, deployment tokens or capability/signing secrets.

## 14. Required verification

Implementation is incomplete until all of the following hold:

- `pnpm dev` opens the full web flow on localhost without Docker;
- `pnpm deploy` deploys the same application to Cloudflare;
- no production branch hard-codes Chon Buri/EEC;
- no user-visible screen, error or report field lacks a Thai rendering;
- user-visible AI output is Thai and schema/ID/citation validated before display;
- the browser contains no provider/database secret and performs no analytical calculation that belongs to the server;
- Gemini is called once normally and never more than twice per run;
- quota exhaustion terminates with the documented typed outcome and no invented recommendation;
- spatial plans use the expected PostGIS indexes and application full-table spatial loops do not exist;
- money/precision tests prove decimal-safe behavior;
- the screen derives only from the accepted server-side `FinalAnalysis` and exposes no application export action;
- Worker/Workflow, database, source, AI, expiry and cross-run failure tests pass;
- measured free-tier representative runs satisfy the accepted performance gates or the affected capability remains inactive.

## 15. Verified platform basis

Platform facts used for this decision were checked on 2026-09-15 against primary documentation:

- Cloudflare React/Vite and local Workers runtime: <https://developers.cloudflare.com/workers/framework-guides/web-apps/react/>
- Workers limits: <https://developers.cloudflare.com/workers/platform/limits/>
- Workflows pricing/limits: <https://developers.cloudflare.com/workflows/reference/pricing/>
- Workflows retry/idempotency rules: <https://developers.cloudflare.com/workflows/build/rules-of-workflows/>
- Hyperdrive pricing: <https://developers.cloudflare.com/hyperdrive/platform/pricing/>
- Hyperdrive with Supabase and `pg`: <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/> and <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/>
- R2 pricing: <https://developers.cloudflare.com/r2/pricing/>
- Supabase pricing/database ceiling: <https://supabase.com/pricing> and <https://supabase.com/docs/guides/platform/database-size>
- Supabase PostGIS: <https://supabase.com/docs/guides/database/extensions/postgis>
- Gemini 3.1 Flash-Lite: <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite>
- Gemini rate limits: <https://ai.google.dev/gemini-api/docs/rate-limits>
- Gemini pricing/data-use disclosure: <https://ai.google.dev/gemini-api/docs/pricing>

Provider quotas and terms are rechecked before implementation acceptance because they may change. A changed quota updates deployment configuration and capacity tests; it does not change the domain architecture.
