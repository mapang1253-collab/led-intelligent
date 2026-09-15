# Architecture

**Status: FROZEN — included in Architecture Freeze v1.0 declared on 2026-09-15.**

## 1. Architectural invariant

The system converts a request into one evidence-bounded analytical result:

    Property intake
      -> location/property resolution
      -> admissible evidence set
      -> deterministic features and opportunity signals
      -> AI-proposed structured concepts
      -> legal, physical and demand validation
      -> controlled economic component mapping
      -> deterministic scenarios and sensitivity
      -> candidate comparison and sufficiency decision
      -> deterministic Thai result presentation

Every transition carries identifiers to its inputs, method/rule versions and limitations. No later stage can increase the spatial precision, epistemic strength or legal/financial certainty of an upstream fact.

## 2. Bounded contexts and ownership

| Context | Owns | Must not own |
|---|---|---|
| Intake | normalized admin input; optional address, title and site facts; anonymous run request | investor profile, professional parameter questionnaire |
| Resolution | canonical geography/property candidates, match hypotheses, precision and confidence | silently choosing an ambiguous parcel |
| Source acquisition | source manifests, schedules, throttles, raw capture, parsing, licence/coverage metadata | analytical interpretation |
| Evidence | observations, evidence links, conflicts, substitutions, quality dimensions and disclosure | one opaque confidence score |
| Feature preparation | versioned, question-specific derived values with lineage | recommendations |
| Opportunity discovery | evidence-backed signals and AI concept proposals | legal/physical/financial certification |
| Validation | requirement-by-requirement outcomes and missing critical facts | rewriting source facts or AI prose |
| Economic registry | ACADEMIC_REVIEWED component definitions and formula versions | arbitrary business catalogue or prompt-authored formula |
| Scenario | parameter resolution, cash-flow graph, deterministic calculation and sensitivity | deciding truth of a legal rule |
| Comparison | dominance/robustness analysis and final status | forcing a fixed candidate count or winner |
| Explanation | concise rendering from accepted structured results and cited evidence | hidden reasoning, new facts or overridden validator results |
| Operations | jobs, cache, observability, source/rule/component activation | product decision making |

## 3. Granularity and output scope

| Resolved target | Permitted analysis | Forbidden claim |
|---|---|---|
| ADMIN_AREA | area opportunity context and concepts that explicitly require property verification | property-specific HBU |
| APPROXIMATE_ADDRESS | preliminary property analysis with disclosed location uncertainty | parcel-specific legal/spatial claims |
| POINT | point-based surroundings and applicable point-in-polygon screens | parcel shape/frontage/legal access |
| PARCEL | parcel analysis within verified geometry/title coverage | certainty beyond incomplete legal, physical, market or financial evidence |

Output scope is determined independently from final recommendation status. An AREA analysis may be CLEAR about area-level potential while still being unsuitable as a property recommendation.

## 4. Candidate lifecycle

1. The system creates an opportunity brief from evidence and derived signals.
2. AI returns zero or more structured PotentialUseConcepts. Each includes activities, occupancy/operational characteristics, physical requirements, demand hypotheses and economic behaviors.
3. Schemas and controlled vocabularies are validated. Invalid concepts are retried once with validation errors; repeated invalid output is discarded.
4. Deterministic validators evaluate individual requirements as PASS, FAIL, PARTIAL or UNKNOWN. A critical verified FAIL eliminates the affected variant. Any critical PARTIAL, UNKNOWN, CONFLICTED, unresolved applicability or required approval keeps it visible as unvalidated rather than feasible.
5. Economic behavior is mapped only to ACADEMIC_REVIEWED registry components. Unknown required behavior produces UNSUPPORTED_MODEL; it never triggers formula generation.
6. The Scenario Engine resolves parameters and calculates only eligible metrics. Each result names its evidence/assumption inputs and model coverage.
7. Comparison uses common property interest, effective date, rights, currency, price basis and analysis horizon. Candidates with incomparable bases are not ordinally ranked.
8. All defensible candidates are returned. The result can be CLEAR_RECOMMENDATION, INCONCLUSIVE or INSUFFICIENT_EVIDENCE.

## 5. Status semantics

Status is a reasoned decision tree, not a score threshold:

- INSUFFICIENT_EVIDENCE when no candidate has the critical legal/physical facts and economic model/parameters needed for the requested output scope, or candidates cannot be compared on a common basis.
- INCONCLUSIVE when one or more supported candidates can be discussed but dominance changes across credible parameter/evidence states, material unresolved constraints/search truncation could reverse the result, or no defensible dominance relation exists.
- INCONCLUSIVE with reason NO_FEASIBLE_CANDIDATE when and only when RD-6 proves every concept in an EVIDENCE_SPACE_COVERED search has a verified applicable critical FAIL; this is limited to evaluated concepts.
- CLEAR_RECOMMENDATION when one candidate passes every applicable critical requirement at the claimed scope, is comparable on a common value basis, candidate search is adequately completed, and remains preferred throughout the material, evidence-grounded uncertainty set. The conclusion states the scope and unresolved non-decisive items.

No fixed numerical gap is required. The comparison record stores the decisive evidence, sensitivity states tried and why plausible unresolved states could or could not reverse the result.

## 6. Dependency and failure rules

Each analysis plan is a dependency graph. Nodes declare required inputs, output contract, criticality, deadline and degradation rule. Independent evidence collection and validation nodes may run concurrently. Missing critical analytical evidence narrows the output or yields INSUFFICIENT_EVIDENCE. Critical infrastructure/process failure uses the separate run outcome contract. Failed optional nodes reduce completeness. An AI failure cannot erase deterministic partial results.

Results are immutable snapshots tied to a run. Reuse comes from versioned source/evidence/features and calculation caches, not from mutating an earlier final report.

Run completion and analytical status are separate. A failed critical infrastructure or concept-generation stage can return a retryable run failure with safe deterministic partial artifacts; it cannot be mislabeled as an evidence-based recommendation. Once a valid candidate set and deterministic decision exist, final-narrative AI failure falls back to deterministic rendering without changing that decision.

Every completed result follows `academic-output-v2`: visible academic disclaimer, deterministic scope/status wording and verification actions on the protected web page. Runs and capabilities expire 24 hours after creation; access does not extend expiry and no application export, public sharing or saved history exists.

## 7. Architecture fitness

The design is complete enough to implement when:

- every boundary exchanges a versioned contract from api-contracts.md;
- every source/rule/component has an activation state and closure evidence;
- every conclusion traces to observations and method versions;
- missing, conflicting, stale and inaccessible evidence has a defined result;
- the end-to-end cases in implementation-plan.md can be exercised without natural-language parsing between services.
