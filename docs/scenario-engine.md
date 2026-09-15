# Scenario Engine

**Status: FROZEN — included in Architecture Freeze v1.0; deterministic calculations and a zero-configuration user experience.**

## 1. Inputs and outputs

Input: resolved property/interest/date, structured concept, validation results, ACADEMIC_REVIEWED component pack, RequirementSet, admissible EvidenceLinks and parameter-policy version.

Output: model coverage, parameter resolutions, periodic unlevered cash flows, eligible metrics, sensitivity states, financial-feasibility result and full dependency manifest.

## 2. Parameter resolution

Each ParameterRequirement declares meaning, unit/dimension, time/granularity, valid range, applicability and acceptable evidence classes. Resolution follows:

1. exact purpose-fit observed evidence;
2. relevant proxy selected by measure-specific rules;
3. professionally supported benchmark/reference;
4. explicit model assumption derived from a documented basis/distribution;
5. UNRESOLVED.

The result stores source rung, observation/evidence IDs, adjustment method, basis population/date/geography, uncertainty representation and disclosure. A point estimate is not created from an unknown range merely to complete the model.

Zero-configuration means the system performs this resolution. It does not weaken the evidence standard. If a defensible model assumption cannot be produced, the relevant scenario stays unsupported.

## 3. Cash-flow construction

Components compile into a periodic directed acyclic graph with unit checks, economic-account deduplication and a declared nominal/real convention. Construction/development timing, ramp/stabilization, replacement capital and terminal treatment are explicit. Tax, fees and financing are included only under verified, versioned models.

Base comparison is unlevered. A debt overlay may report lender/borrower metrics when financing assumptions have a valid market-participant basis, but it cannot change the underlying property HBU comparison.

## 4. Eligible metrics

| Metric | Use condition |
|---|---|
| NOI / stabilized net income | income-producing property with complete operating revenue/expense definition |
| Direct-capitalized indication | stabilized income and supported market capitalization rate |
| DCF property value / NPV | dated cash flows and supported market discount/terminal assumptions |
| Residual land/property value | development value less all consistently modeled development costs, timing, finance treatment and developer return |
| Development margin / yield on cost | development scenario, shown with basis and limitations |
| IRR | dated cash flow with sign changes suitable for a meaningful solution; multiple/no-solution cases disclosed |
| Break-even parameter | monotonic relationship verified within valid component domain |
| Payback | supplementary only; never substitutes for full time-value analysis |

Metrics with missing material behaviors/parameters are omitted and explained. Candidates are not compared by whichever metric makes each look best.

## 5. Feasibility and comparison basis

Financial feasibility is evaluated against a documented market-participant hurdle or residual/value relationship appropriate to the model, never a user's personal target. If no defensible hurdle/required return exists, report calculated economics and FINANCIAL_STATUS_UNKNOWN.

The maximally productive comparison uses the same property interest, date, currency, price basis, horizon, nominal/real convention and treatment of land/acquisition costs. Business goodwill and financing are kept separate.

## 6. Automatic sensitivity

Sensitivity is driven by uncertainty and decision impact:

1. identify parameters with material uncertainty, proxy/assumption status or conflicts;
2. obtain ranges/distributions from empirical history, benchmark definition, measurement error or alternate admissible evidence states;
3. screen local influence deterministically;
4. evaluate joint states preserving known dependencies/correlation;
5. refine around feasibility and candidate-ranking reversal boundaries;
6. report drivers, break-even values and dominance stability.

The engine does not use universal plus/minus percentages or call an LLM per scenario. If only bounded intervals are defensible, interval/corner analysis is used; if distributions are professionally supported, deterministic sampling with stored seed/method may be used.

## 7. Status and failures

Separate statuses:

- model_coverage: COMPLETE, PARTIAL, UNSUPPORTED;
- parameter_status: RESOLVED, PROXY, BENCHMARK, ASSUMPTION, CONFLICTED, UNRESOLVED;
- financial_status: FEASIBLE, INFEASIBLE, PARTIAL, UNKNOWN;
- calculation_status: SUCCESS, INVALID_GRAPH, UNIT_ERROR, NUMERIC_ERROR.

Missing Model is never converted into Missing Parameter. Calculation errors cannot be repaired by AI-generated formulas. A failed candidate scenario does not remove other candidates.

## 8. Reproducibility and precision

Store component/parameter/method versions, resolved values, exact formulas, input IDs, time convention and numeric precision/rounding. User-facing rounding must not alter comparison. Currency conversion requires dated, sourced rates; otherwise cross-currency comparison is unsupported.
