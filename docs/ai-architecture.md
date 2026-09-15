# AI Architecture

**Status: FROZEN — included in Architecture Freeze v1.0. Provider/model, call budget and Thai-output behavior are LOCKED by [technology-stack.md](technology-stack.md). AI proposes; deterministic engines validate, calculate and render the default final explanation.**

## 1. Runtime profile

All model calls pass through the server-side `ai-gateway` package using the official `@google/genai` SDK. The primary model is `gemini-3.1-flash-lite`. A normal run makes one concept-proposal call. A second call is permitted only to repair a rejected structured response; `AI_MAX_CALLS_PER_RUN` is 2.

The default final report uses deterministic Thai templates and makes no synthesis call. `gemini-3.5-flash-lite` is an evaluation candidate/configured replacement, not an automatic escalation. `gemini-2.5-flash-lite` may replace a deprecated/unavailable primary only after the same regression and data-handling gates pass. A 429 never causes model hopping or an immediate retry.

## 2. AI stages

| Stage | Input | Output | Runtime rule |
|---|---|---|---|
| Concept proposal | OpportunityBrief with evidence/feature IDs, coverage, conflicts, allowed vocabularies and `locale: th-TH` | PotentialUseConcept[] with canonical IDs and Thai display fields | one normal call |
| Repair | rejected response plus machine validation errors and the same allowed context | corrected structured response | at most one call; no new facts/IDs |
| Final synthesis | accepted decision record and evidence cards | optional Thai narrative | disabled until evaluation proves material benefit and budget fitness |

AI never supplies formulas, validation status, financial calculations, source activation or professional certification. After schema validation, deterministic coverage checks compare returned concepts with material opportunity signals. Resource truncation or AI failure prevents the system from implying an exhaustive candidate search or returning CLEAR_RECOMMENDATION.

## 3. Context and structured output

Context is a bounded rights-filtered projection: target scope/date, evidence cards with unit/time/geography/quality/caveat, signals/conflicts, critical gaps, controlled vocabularies and required JSON schema. Source content and user text are untrusted data and cannot change instructions or authorize tools.

PotentialUseConcept contains `schema_version`, `locale: "th-TH"`, concept ID, `label_th`, `description_th`, `supporting_reason_th`, `uncertainty_th`, controlled activities, occupancy/operation characteristics, physical requirements, demand hypotheses, economic behaviors, requested existing component IDs and supporting/counter-evidence IDs.

Every visible AI field must be Thai. Official proper names, dataset names and established abbreviations may remain in their official form inside Thai text. Internal IDs/enums remain English. The application displays no raw AI response.

## 4. Validation and failure controls

Validate in this order: JSON parse; schema/version; `th-TH` locale and visible-language contract; closed enums and ID existence; citation membership in the supplied context; units/component compatibility; numerical support; duplicate concepts; deterministic-result reconciliation.

One constrained repair receives only the prior response, the machine errors and the original allowed context. Repeated failure yields `AI_OUTPUT_INVALID`. Unknown components yield `UNSUPPORTED_MODEL`. Unknown activities remain `UNMAPPED` and legal UNKNOWN; the gateway never substitutes a nearby ID merely to continue.

If concept generation fails before any accepted candidate set exists, the run is operationally `FAILED_RETRYABLE` with any safe deterministic evidence artifacts and no `FinalAnalysis`. If accepted candidates already exist but a bounded continuation fails, the run may be PARTIAL and cannot be CLEAR. Deterministic final rendering remains available after a valid decision record exists.

Required safe Thai messages are selected by stable reason code, not free-form provider text. For `AI_QUOTA_EXHAUSTED`, explain that the project's AI allowance is currently exhausted, show any safe evidence already collected, provide the recorded retry/reset time when known and make no recommendation.

## 5. Quota manager and cache

Gemini rate limits are deployment facts recorded from Google AI Studio as `GEMINI_RPM_LIMIT`, `GEMINI_TPM_LIMIT` and `GEMINI_RPD_LIMIT`. Reserve 20% of the daily request allowance and enforce the lower remaining bound across RPM, TPM, RPD and the two-call run cap.

Before a request, atomically reserve capacity in PostgreSQL by provider/project/model/window. Reconcile estimates with returned token metadata. On 429, record Retry-After/reset information where supplied, open the relevant budget window and stop automatic retry. Persist no prompt or user/source content in quota telemetry.

Reuse accepted output only when context, prompt, schema, model and rights-scope digests match. Context containing anonymous assertions stays run-scoped. Cache absence plus provider/quota failure follows the operational failure rule; it never triggers invented fallback concepts.

Supported modes are `LIVE_AI`, `RECORDED_AI` and `AI_DISABLED`. `RECORDED_AI` accepts only named versioned fixtures and labels the result as fixture output. `AI_DISABLED` may expose permitted evidence artifacts but creates no new recommendation.

## 6. Security and provider data handling

Minimize and sanitize every context. Exclude personal names/contact details, complete title/deed identifiers, credentials, restricted raw objects and data without third-party AI-transmission rights. The free Gemini service's data-use terms must be reviewed before activation and recorded with provider purpose, retention/training terms, subprocessors and deletion controls.

Treat prompt injection in source material as data. Model output cannot activate a source/rule/method/component/parameter, add an executable expression, overwrite evidence, change a validator result, authorize a tool or reveal a secret.

## 7. Evaluation and activation

Before LIVE_AI activation, evaluate Thai and mixed Thai/proper-name fixtures covering valid, novel, hybrid, ambiguous, unsupported and adversarial concepts; incomplete/conflicting evidence; quota exhaustion; timeout; invalid JSON; invalid IDs/citations; and English-only visible output.

Measure schema validity, Thai-language validity, citation precision, unsupported-ID rate, duplicates, material-signal coverage, requirement recall, validator contradiction, unsupported factual claims, latency and token use. Prompt/model/schema changes require regression evidence. Activation is complete only when the primary model passes the recorded quality, rights, quota and p95 20-second request gate.
