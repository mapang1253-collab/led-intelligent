# Architecture Review Package

**Status: FINAL REVIEW COMPLETE — ARCHITECTURE FREEZE v1.0 DECLARED by the project owner on 2026-09-15.**

The owner-approved principles in [project-overview.md](project-overview.md) remain the primary source of truth. The supplied Master Prompt authorizes research, architecture, system design and implementation specification only. No application or application tests are implemented in this task.

## Reading order

1. [Architecture Freeze v1.0 record](../ARCHITECTURE-FREEZE.md): frozen baseline, authority and change control.
2. [Project overview](project-overview.md): product and existing LOCKED decisions.
3. [Architecture](architecture.md): responsibilities and end-to-end flow.
4. [Data](data-architecture.md), [lifecycle](data-persistence-and-lifecycle.md) and [database](database-design.md).
5. [Analysis](analysis-architecture.md), [validation](validation-architecture.md), [economic registry](economic-component-registry.md) and [scenarios](scenario-engine.md).
6. [AI](ai-architecture.md), [contracts](api-contracts.md), [system](system-design.md), [locked technology stack](technology-stack.md), [performance](performance-and-reliability.md), [security/privacy/source rights](security-privacy-compliance.md) and [final output policy](output-policy.md).
7. [Implementation plan](implementation-plan.md): work packages, acceptance gates and owner decisions.
8. [Final architecture review](final-architecture-review.md): independent findings, gap register, readiness scorecard and verdict.

## Decision labels

| Label | Meaning |
|---|---|
| LOCKED | Existing owner-approved constraint in the overview |
| DESIGN DECISION / RECOMMENDATION | Final-reviewed resolution accepted into Architecture Freeze v1.0 when it appears in a normative document listed by the freeze record |
| IMPLEMENTATION CHOICE | Team choice within documented interfaces and invariants |
| VERIFIED FACT | Directly supported by a cited primary source within its verification date/scope |
| PROFESSIONAL METHODOLOGY | Method stated by a professional primary source; product adaptation is separate |
| INFERENCE / ASSUMPTION | Reasoned interpretation or explicit model input, not observed evidence |
| KNOWN LIMITATION / FUTURE WORK | Unsupported capability with defined behavior |
| OPEN QUESTION | Research/source/operations uncertainty with a closure test |
| OPEN DECISION | Genuine owner choice, with alternatives and recommendation in the handoff |

A specified formula does not prove that its parameters are known or that its use for a Thai property has been validated.

## Reconciliation of active documents

Earlier documents contained several superseded positions. The active package resolves them as follows:

| Earlier position | Resolution |
|---|---|
| Chon Buri/EEC as an initial product boundary or detailed regional MVP | Rejected. One Thailand-wide pipeline serves every province; Chon Buri/EEC appears only in research and test/validation fixtures. |
| Investor profile, capital, horizon and risk preference determine ranking | Removed from MVP. Compare the same property interest and effective date under market-participant assumptions. |
| MVP only accepts LED properties | Replaced by nationwide administrative intake. Limited evidence reduces output scope rather than rejecting the target. |
| A map pin is required | Province/district/subdistrict always works in AREA mode. Optional details can improve precision. |
| Users normally adjust FAR, rent, occupancy and costs | Replaced by zero-configuration parameter resolution. Missing legal controls remain UNKNOWN; model assumptions are disclosed. |
| A Treasury building assessment is a construction-cost anchor | Kept only as an assessed-value reference unless an independently validated conversion exists. |
| A prohibited-use screen establishes legal feasibility | It establishes only the tested rule outcomes. Aggregate PASS requires complete applicable critical rule coverage. |
| A Treasury CSV key is automatically an exact identity | It is a candidate lookup until key uniqueness, units and cycle are verified. |
| LED deed number joins directly to Treasury land CSV | No verified direct join exists. Treasury's documented authorized API needs additional identifiers. |
| Historical flood polygons are a hazard model | They are historical-exposure evidence only. |
| HTTP success means a source is adopted | Access, licence, semantics, currency, geography and operational reliability are separate activation gates. |
| No login means no server-side request state | An isolated, expiring analysis run may be stored for recovery; there are no user accounts or shared history. |
| Derived caches expire only when input bytes change | Invalidation also considers effective dates, method/rule versions, source coverage and rights. |
| Framework, hosting, AI model and user language remain for the implementer to choose | RD-8 through RD-10 and [technology-stack.md](technology-stack.md) fix the TypeScript/React/Vite/Hono/Cloudflare/Supabase/Gemini profile and Thai-only user experience. |
| The MVP provides PDF/JSON result downloads | Superseded by the owner's result-only decision: the protected web page is the sole application result surface and no result-export route/control exists. |

## Research trail

Source-specific findings remain in docs/data-sources and research. Newly synthesized primary-source notes live in research/architecture. Historical investigations are evidence of what was checked, not instructions to activate an integration.

The corrected walkthrough and consistency checks are in [architecture-verification.md](architecture-verification.md). The independent final verdict is in [final-architecture-review.md](final-architecture-review.md).
