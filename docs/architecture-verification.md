# Architecture Verification

**Performed: 2026-09-15; rerun after final-review corrections and owner decisions RD-1 through RD-10. Result: architecture handoff checks pass; Architecture Freeze v1.0 was subsequently declared by the project owner; implementation activation gates remain.**

## 1. End-to-end walkthrough

| Transition | Input -> output | Owner | Missing/failure behavior | Provenance/performance |
|---|---|---|---|---|
| Browser -> public backend | Thai React/Vite form -> same-origin Hono `/api/v1` -> RunAccepted/RunResultEnvelope | Web frontend/Public interface | Thai field errors; capability cookie required; fixed polling; no direct source/DB/AI access | schema versions; HTTPS when hosted; <=1-second p95 acknowledgement gate |
| Intake -> resolution | PropertyIntake -> ResolvedTarget candidates/scope | Public interface; geography/property module | invalid hierarchy rejects; absent optional facts continue; ambiguity retained | assertion provenance; indexed admin lookup |
| Resolution -> evidence plan | ResolvedTarget/scope/date -> RequirementSet, CoverageAssessment and acquisition DAG | Evidence planner | missing parcel caps scope; unavailable product recorded | reference/product versions; cached coverage |
| Database/source -> observations | AcquisitionRequest/SourceProductManifest -> AcquisitionResult, SourceRecords and Observations | Source gateway/ingestion | unauthorized path disabled; transient retry; schema drift quarantine; empty outcome typed | raw hash/locator/version; parallel source budgets |
| Observations -> EvidenceLinks | observations + target/question -> selected/contradicting/proxy links | Evidence engine | no fit remains unresolved; conflicts retained | match/purpose dimensions; indexed candidate blocking |
| Evidence -> features | EvidenceSet -> DerivedFeatures, OpportunitySignals and OpportunityBrief | Feature engine | missing never zero; invalid dependencies prevent feature; omitted material signal recorded | full lineage; cached fingerprint |
| OpportunityBrief -> concepts | bounded evidence/signals/vocabulary + `th-TH` -> Thai PotentialUseConcept[] | Gemini gateway | invalid/schema/language output one repair then discard; quota failure is operational | prompt/model/schema/context digest; `gemini-3.1-flash-lite`; one normal/two maximum calls |
| Concept -> requirements | characteristics -> legal/physical/demand/economic requirements | Requirement compiler | UNMAPPED stays UNKNOWN/unsupported | versioned vocab/requirements; deterministic |
| Requirements -> validations | RequirementInstances + target/evidence/rules/methods -> separate legal/physical/demand ValidationResults | Validators | missing rule/input/method UNKNOWN; critical PARTIAL/UNKNOWN cannot become FEASIBLE | exact rule/evidence/method versions; parallelizable |
| Economic behavior -> graph | requested IDs + registry -> validated component DAG | Registry/scenario | only ACADEMIC_REVIEWED executes; unknown behavior UNSUPPORTED_MODEL; cycle/unit/double count reject | pinned component/review record |
| Parameters -> cash flow | evidence hierarchy -> resolutions/cash flows/metrics | Resolver/scenario | unresolved omits affected metric; numeric failure isolated | basis/version retained; batched deterministic |
| Uncertainty -> robustness | ranges/conflicts -> states and reversal analysis | Scenario/comparison | unsupported ranges disclosed; no AI per state | stored method/state |
| Candidates -> status | dispositions/common basis/robustness -> ComparisonResult | Comparison | incomparable INCONCLUSIVE; inadequate basis INSUFFICIENT | pairwise reasons/decisive evidence |
| Decision -> output | accepted result + evidence cards -> Thai FinalAnalysis | Presentation | required academic/scope/status policy and verification actions; deterministic Thai renderer is default | cited dependencies; no normal final AI call |
| Run -> public result | stage/final/partial records -> RunResultEnvelope | Run-access module | process failure is not evidence status; safe partial artifacts optional | opaque ID plus separate capability; no secret in contract |
| Run -> expiry | protected on-screen result -> 24-hour expiry and purge | Run/operations/UI | reads do not extend expiry; expired unavailable; no result export/share; shared evidence unaffected | isolated capability; pinned output policy; rights audit |

## 2. Scenario traces

### A. Area-only outside EEC

Admin input resolves to ADMIN_AREA. Point/parcel operations do not run. Coverage shows no complete legal pack or property facts. AI may propose area hypotheses. Property legal/physical validation remains UNKNOWN; site-capacity scenarios are unsupported. Final scope is AREA and cannot be relabeled as property HBU.

### B. Chon Buri point with incomplete rules

Point evidence enables EEC point-in-polygon screens and nearby OSM context if activated. A zone rule passes/fails only explicit clauses. Missing development controls, legal access and parcel geometry remain UNKNOWN. Historical flood intersection is exposure only. Conditional capacity cannot become legal PASS. A material ranking-reversal risk blocks CLEAR.

### C. Parcel with complete evidence

Identity is unambiguous; reviewed rule-family coverage is complete; physical evidence meets precision; component graph and parameters are supported. Scenarios compare unlevered property/residual value on one basis. A candidate is CLEAR only if it dominates every relevant alternative across credible states and no unresolved competitor can reverse it.

### D. Unsupported novel use

A material behavior has no registry component. Registry returns UNSUPPORTED_MODEL. AI cannot create a formula. Legal/physical findings may appear, but financial feasibility remains unsupported and the concept cannot win financial HBU comparison.

### E. Source outage and invalid AI

Cached evidence is selected only under freshness policy; otherwise source evidence becomes unavailable and completeness changes. Other work continues. Repeated invalid concept JSON leaves deterministic evidence analysis intact; no arbitrary candidates/winner are created.

### F. Critical PARTIAL and demand mismatch

A concept has a partially resolved access requirement and province-level population growth, but no validated conversion to project demand. Physical and demand results remain PARTIAL/UNKNOWN. The concept is UNVALIDATED, cannot be labelled FEASIBLE and cannot lead a PROPERTY CLEAR_RECOMMENDATION.

### G. Candidate search or AI process failure

If concept generation fails before any concept is accepted, the run is FAILED_RETRYABLE with a safe evidence summary and no recommendation status. If accepted concepts exist but a continuation is truncated, the run is PARTIAL and CLEAR is prohibited. Final-synthesis failure after deterministic comparison uses the deterministic renderer without changing status.

A valid completed search that returns no defensible concepts yields INSUFFICIENT_EVIDENCE with reason NO_DEFENSIBLE_CONCEPTS_GENERATED; it does not claim no possible use exists.

### H. Database failure and anonymous isolation

A failed transaction publishes no partial stage record. Database outage is an operational failure, not missing evidence; recovery resumes only accepted fenced/idempotent work. A public run ID alone cannot read or cancel a run, and one run capability cannot enumerate another run.

### I. Every evaluated candidate fails

Verified critical failures are preserved and are not called insufficient evidence. When every RD-6 precondition holds, the top-level result is INCONCLUSIVE with reason NO_FEASIBLE_CANDIDATE. The result is limited to the evaluated, adequately completed candidate search and never claims no imaginable use exists.

### J. Academic review, output and expiry

A DRAFT or RETIRED rule/method/component/parameter is rejected before execution. ACADEMIC_REVIEWED requires the complete named immutable review record and is rendered as academic screening, never professional certification. The protected screen uses one pinned FinalAnalysis and `academic-output-v2` wording. Access at or after `created_at + 24 hours` returns EXPIRED; reads cannot reset the deadline and no result-export or public-share route exists.

### K. Browser delivery

The same Thai responsive React/Vite flow accepts an administrative target from any province, creates an asynchronous Cloudflare Workflow through Hono and renders progress/final status. Refresh can recover the run only through the protected cookie before expiry. Provider secrets, raw restricted data, adapters, formulas and deterministic engines stay server-side. `pnpm dev` exercises the full localhost flow against hosted development Supabase without Docker. A CLI or notebook may exercise contracts in development but cannot replace the submitted web product.

### L. AI quota and Thai presentation

The quota manager reserves the configured Gemini RPM/TPM/RPD allowance and 20% daily reserve before calling the primary model. A normal run emits one request and an invalid structured/Thai response permits one repair. A 429 records the reset/retry boundary and produces the typed operational outcome without model hopping. Every screen, error and report value is resolved through `th-TH`; raw English codes and English-only AI text never appear alone to the user.

## 3. Invariant audit

| Invariant | Result |
|---|---|
| Thailand-wide core; EEC only validation region | PASS |
| responsive browser web app backed by HTTP/JSON and server-side analysis | PASS |
| locked React/Vite/Hono/Cloudflare/Supabase implementation profile | PASS |
| localhost and Cloudflare deployment require no Docker | PASS |
| property-centric; no Investor Profile/login | PASS |
| progressive minimum intake | PASS |
| property/location/granularity distinction | PASS |
| evidence provenance/quality/conflicts | PASS |
| visible proxy/assumption/limits | PASS |
| no fixed business list | PASS |
| AI proposes, engines validate, AI interprets | PASS |
| Gemini one-normal/two-maximum calls with quota admission | PASS |
| Thai-only user experience and displayed AI output | PASS |
| UNKNOWN distinct from FAIL | PASS |
| missing model distinct from parameter | PASS |
| deterministic formula/sensitivity | PASS |
| zero-configuration, one final output | PASS |
| dynamic candidates/no forced winner | PASS |
| persistent analytical store/cache | PASS |
| concurrent orchestration/degradation | PASS |
| critical PARTIAL/UNKNOWN cannot become FEASIBLE | PASS |
| demand evidence cannot silently become project capture | PASS |
| operational failure distinct from analytical status | PASS |
| anonymous run/operator/source security seams | PASS |
| 24-hour non-extending expiry; protected web result only; no export/share | PASS |
| ACADEMIC_REVIEWED lifecycle cannot imply professional approval | PASS |
| academic disclaimer/scope/status/verification actions on every output | PASS |
| RD-6 no-feasible-candidate preconditions and wording | PASS |
| specification only; no implementation | PASS |

## 4. Preserved research history

Files under research and docs/data-sources are dated research records. They may describe old proposals or endpoints. Active decisions come from project-overview.md and this review package, never from a superseded research conclusion.

Unresolved implementation risks are source rights/access/coverage, nationwide legal rules, local market/cost evidence, current provider quota/terms and measured performance achievement. Each has a closure path in implementation-plan.md. Run retention, academic governance, output wording, technology, AI runtime behavior and Thai delivery are locked owner decisions.

## 5. Final review rerun

All MAJOR architecture findings were corrected and rechecked. RD-1 through RD-10 record academic status, nationwide scope, result-only retention, academic governance, output policy, no-feasible-candidate semantics, browser delivery, the fixed free-tier stack, Gemini quota behavior and Thai-only presentation. Source/rule/method/component/provider activation evidence remains an implementation gate. The independent assessment and gap register are in [final-architecture-review.md](final-architecture-review.md). These checks support the Architecture Freeze v1.0 declaration recorded in [`ARCHITECTURE-FREEZE.md`](../ARCHITECTURE-FREEZE.md).

## 6. Final handoff audit

The complete handoff folder was audited again on 2026-09-15 before transfer to the implementation team:

- all 41 Markdown files are non-empty, have a top-level title, balanced fenced blocks and a final newline;
- all repository-relative Markdown links resolve and the package contains no dependency on an absolute path from the original workstation;
- all research/source-investigation files are explicitly marked as dated or historical and defer to the active nationwide architecture;
- active documents consistently use RD-1 through RD-10, `academic-output-v2`, the fixed React/Vite/Hono/Cloudflare/Supabase profile, Gemini 3.1 Flash-Lite and `th-TH` presentation;
- active documents contain no stale PDF/JSON/CSV result-export implementation, regional-MVP instruction, Docker requirement or initial Cloudflare Queues dependency;
- Workflow retry behavior uses deterministic instance/step identities, dependency/version guards and idempotent publication rather than an unselected queue/lease design;
- no credential, API key, connection string or personal workstation path is included; and
- macOS metadata is excluded by the repository `.gitignore`.

The Cloudflare React/Vite path, Workflows Free availability and idempotency guidance, Hyperdrive-to-Supabase path, Supabase Free 500 MB database behavior, Gemini 3.1 Flash-Lite model/free pricing and project-level quota behavior were rechecked against the official sources linked in [technology-stack.md](technology-stack.md). Runtime limits and availability remain deployment facts and must pass RQ-5/RQ-6 before the affected capability is accepted for the academic demonstration.

After this audit passed, the project owner declared Architecture Freeze v1.0 on 2026-09-15 (Asia/Bangkok).
