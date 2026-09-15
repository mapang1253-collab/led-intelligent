# Analysis Architecture

**Status: FROZEN — included in Architecture Freeze v1.0; no arbitrary universal score or winner margin.**

## 1. Analytical unit and effective basis

Each run fixes target identity/scope, property interest, effective date, currency/price basis and comparison horizon. Candidates are comparable only on this common basis. The analysis asks what use is best supported for the property under market-participant assumptions; it does not optimize for a user's capital, risk preference or financing.

## 2. Pipeline

1. Resolve target and output-scope ceiling.
2. Build a RequirementSet for baseline HBU evidence.
3. Link observations and select evidence/proxies per requirement.
4. Derive versioned features and opportunity signals.
5. Ask AI for structured use concepts tied to those signals.
6. Expand each concept into legal, physical, demand and economic requirements.
7. Evaluate each requirement deterministically where a verified rule/model exists.
8. Build eligible deterministic scenarios and uncertainty states.
9. Compare candidates on a common property-value/residual basis and robustness.
10. Determine final status/scope; generate explanation from structured records.

## 3. Feature contract

Every feature records feature_id/version, value/range/unit, target, purpose, parent EvidenceLinks, computation method/version, spatial/temporal scope, epistemic status, missing/conflict state and admissibility deadline.

Feature families include:

- identity/location precision and coverage;
- legal rule applicability and development capacity;
- physical site/access/environment;
- accessibility and surrounding context;
- demand/supply and market trajectory;
- value/acquisition evidence by distinct measure type;
- opportunity contrasts and relative position;
- evidence completeness/conflict/uncertainty.

Percentiles or similarity-based features require a declared reference population, sampling period and adequate coverage. They are not used when the reference population is biased or undefined.

## 4. Evidence selection

For each requirement:

1. reject evidence outside licence, effective time, geography or semantic fit;
2. preserve all contradicting admissible observations;
3. prefer exact subject evidence when purpose-fit;
4. otherwise select a proxy through declared similarity dimensions;
5. otherwise select a benchmark/reference matching use/geography/time;
6. otherwise use a model assumption only when a documented basis and uncertainty representation exist;
7. leave UNRESOLVED if none is defensible.

Proxy ranking is lexicographic by mandatory compatibility first, then similarity dimensions appropriate to the measure. There is no global distance-weight formula. Comparable-selection methods must be calibrated and reviewed by measure/use family before activation.

## 5. Candidate generation and diversity

AI receives an OpportunityBrief containing accepted evidence/features, conflicts, gaps and allowed vocabularies. It may return a dynamic number of concepts. Each must:

- identify activities, occupants/customers and demand mechanism;
- cite at least one supporting signal and relevant counter-signal/gap;
- state physical and legal characteristics;
- state economic behaviors without inventing components;
- avoid variants that differ only by marketing language.

A deterministic deduplicator compares normalized activity, space and economic behavior sets. It may merge near-duplicate labels while retaining distinct physical/economic variants. There is no quota and no fixed business universe.

CandidateSearchRecord stores the material opportunity signals presented, which concepts address each signal, deduplication relationships, unmapped signals, AI/schema failures, continuation reason and stop reason. A bounded continuation call is allowed when a material signal is unaddressed. Stop reasons distinguish EVIDENCE_SPACE_COVERED, NO_DEFENSIBLE_CONCEPTS, AI_FAILURE and RESOURCE_TRUNCATED. Only the first can support a clear result, and even then the user-facing claim is “best supported among the defensible concepts evaluated,” not proof over every imaginable use.

## 6. HBU sequence

Legal and physical requirements are evaluated before a candidate is described as feasible. Financial calculations may run conditionally while a requirement is UNKNOWN to show what would matter, but cannot convert the legal/physical result to PASS.

| Stage | Result |
|---|---|
| Legal | requirement statuses, scope coverage, unresolved approvals/rules |
| Physical | requirement statuses, conditional capacity and verification needs |
| Demand | hypothesis support/counter-evidence, geography and population limitations |
| Financial | model coverage, parameter provenance, cash flows/value and sensitivity |
| Productive comparison | dominance/robustness on common property basis |

## 7. Candidate disposition

- ELIMINATED: a critical applicable requirement has verified FAIL, or the concept is internally incoherent.
- UNSUPPORTED: a required economic behavior has no ACADEMIC_REVIEWED component or essential parameters have no defensible resolution.
- UNVALIDATED: no critical FAIL, but any applicable critical legal, physical or demand requirement is PARTIAL, UNKNOWN, CONFLICTED or has unresolved applicability/approval.
- FEASIBLE: every applicable critical legal, physical and demand requirement PASSes at the claimed scope, only non-critical PARTIAL items remain, and the financial model and material parameters needed for comparison are supported.

PARTIAL never hides which subrequirements failed or remain unknown.

## 8. Comparison without a universal score

Candidates are compared using an evidence-backed decision table:

1. critical verified FAIL eliminates only the affected variant;
2. candidates need comparable property interests/date/currency/horizon;
3. primary economic comparison is unlevered property value or residual land/property value under consistent market-participant assumptions;
4. financing metrics are a separate overlay and do not redefine property-centred HBU;
5. legal/physical/demand validation and execution risk remain explicit constraints rather than arbitrary penalties;
6. sensitivity enumerates credible evidence/parameter states and records pairwise dominance.

One candidate dominates another only if it is no worse on mandatory feasibility, is economically preferable on the common basis, and that conclusion is not reversed by any material credible state tested. Otherwise candidates may be incomparable.

## 9. Final status decision

| Status | Deterministic rationale |
|---|---|
| INSUFFICIENT_EVIDENCE | no candidate reaches the minimum requirement set for the claimed scope, models are unsupported, or common-basis comparison is impossible |
| INCONCLUSIVE | multiple defensible candidates remain and plausible evidence/parameter states reverse or remove dominance |
| CLEAR_RECOMMENDATION | one candidate dominates all remaining defensible candidates throughout material credible states; unresolved items cannot plausibly reverse the conclusion and are disclosed |

The decision record contains candidate set, search completion, elimination reasons, common basis, uncertainty states, pairwise comparison, decisive evidence and reversal analysis. It does not contain a fabricated percentage gap.

The decision order is fixed:

1. establish the requested and permitted output scope;
2. require a completed or explicitly truncated CandidateSearchRecord;
3. classify each candidate before comparing it;
4. return INSUFFICIENT_EVIDENCE when no supported common-basis comparison exists for the claimed scope;
5. return INCONCLUSIVE when supported candidates exist but dominance is absent/reversible, or when evaluated candidates are useful but candidate search is truncated;
6. return CLEAR_RECOMMENDATION only when search stopped with EVIDENCE_SPACE_COVERED, the leader is FEASIBLE at the claimed scope, every relevant alternative is resolved, and dominance holds across the complete material credible state set.

AREA output uses an area-specific MinimumDecisionRequirementSet and must call its conclusion an area potential, never property HBU. PRELIMINARY_PROPERTY and PROPERTY scopes each have stricter versioned requirement sets. Downgrading scope is visible; it does not upgrade missing parcel facts.

Operational completion is separate from recommendation status. If concept generation fails before any accepted candidate set exists, the run returns a retryable operational failure plus the deterministic evidence summary; it does not manufacture one of the three analytical recommendation states. If valid candidates exist but a later AI continuation fails, the run may complete as PARTIAL, but CLEAR_RECOMMENDATION is prohibited. Final-synthesis AI failure uses deterministic rendering and does not change the already computed status.

A valid completed search with stop reason NO_DEFENSIBLE_CONCEPTS and zero accepted concepts returns INSUFFICIENT_EVIDENCE with reason NO_DEFENSIBLE_CONCEPTS_GENERATED because no HBU comparison can be supported. This states the analytical limit and does not assert that no possible use exists. AI_FAILURE with zero concepts remains the operational failure described above.

## 10. Confidence and scope

Report confidence is a structured profile, not one probability:

- scope: AREA, PRELIMINARY_PROPERTY or PROPERTY;
- evidence quality dimensions by decisive requirement;
- legal/physical/financial model coverage;
- stability of conclusion across credible states;
- named unresolved reversal risks.

The final explanation may use plain-language bands only when it also exposes the underlying dimensions and reason codes.

## 11. Unsupported conditions

The engine must return a valid result when there are zero concepts, every concept fails, every financial model is unsupported, legal evidence is missing, or no common comparison basis exists. These are analytical outcomes, not exceptions.

If a completed search stopped with EVIDENCE_SPACE_COVERED, accepted at least one concept, and every accepted concept is ELIMINATED by a verified applicable critical FAIL with no potentially feasible UNSUPPORTED/UNVALIDATED concept, return INCONCLUSIVE with reason NO_FEASIBLE_CANDIDATE. Show the evaluated search scope and every exclusion; omit a leading use and viable alternatives. It must not be worded as multiple viable alternatives or proof that no possible use exists. If any precondition is absent, use the normal incomplete-search, INCONCLUSIVE or INSUFFICIENT_EVIDENCE branch instead.
