# Controlled Economic Component Registry

**Status: FROZEN — included in Architecture Freeze v1.0; minimal composable registry, not a business list. Only ACADEMIC_REVIEWED versions execute in the university demonstration.**

## 1. Boundary

Components represent economic behavior. A concept can compose multiple components; a component applies to many concepts. Registry versions are immutable and approved independently from model parameters.

## 2. Initial minimal component set

| Stable ID | Behavior | Core deterministic relationship | Typical coverage |
|---|---|---|---|
| CAPACITY_TIME_REVENUE | exclusive capacity sold per time period | available capacity-time × utilization × rate | rental units/area, rooms, desks, parking, storage, service capacity |
| SUBSCRIPTION_REVENUE | recurring access membership | eligible subscriptions × active rate × periodic fee | coworking/membership services |
| UNIT_SALE_REVENUE | discrete units sold | sum(saleable units × achieved unit price) by period | residential/commercial development sales |
| BASIS_SHARE_REVENUE | revenue as verified share of a defined external basis | basis amount × contractual share | turnover rent/revenue-share arrangements only |
| FIXED_PERIOD_COST | cost incurred by period independent of modeled volume within range | sum(fixed amount by period) | land tax, insurance, base staffing/maintenance where evidenced |
| DRIVER_COST | cost caused by an explicit quantity driver | driver quantity × unit cost | utilities, cleaning, consumables, transaction handling |
| BASIS_SHARE_COST | cost as verified share of named revenue/value/cost basis | basis amount × rate | management fee, commission, statutory/contractual percentage |
| CAPITAL_SCHEDULE | development/acquisition/replacement outflows over time | sum(quantity × unit capital cost) plus evidenced fixed items by period | acquisition, construction, fit-out, replacement |

CAPACITY_TIME_REVENUE uses normalized exclusive time slots and utilization between zero and one. A source occupancy metric may exceed 100 percent under a different definition, such as same-day room resale; it is not inserted until its denominator/time semantics are reconciled.

## 3. Component definition contract

Every registry entry defines ID/version, semantic meaning, formula expression, variables/units/dimensions, required/optional parameters, timing convention, applicability/non-applicability predicates, compatible/incompatible components, aggregation basis, double-count controls, output measures, parameter evidence requirements, uncertainty behavior, limitations, professional source basis, verification cases and approval status.

Formulas are expressions in an allow-listed deterministic language. AI may supply IDs and mappings, never expressions.

## 4. Composition

The ScenarioDefinition is a directed acyclic cash-flow graph. Outputs have economic account IDs so components cannot double count the same revenue/cost/capacity. Shared capacity and mixed-use allocation require explicit allocation rules and totals. Circular dependencies, incompatible units, unbalanced allocations and duplicate economic accounts fail validation.

Mixed-use concepts combine component instances, not business models. For example, flexible workspace may combine capacity-time use, subscriptions, driver costs, fixed costs and capital schedule. Its name does not select a formula.

## 5. Model coverage

Coverage is COMPLETE only when every material economic behavior has an approved component and no material double count/omission exists. PARTIAL identifies unsupported behaviors and forbids metrics whose meaning would be misleading. UNSUPPORTED means a material behavior lacks a validated model.

Examples deliberately unsupported until a professional model is approved include profit participation without contract basis, advertising/data/network-effect revenue, franchise/intangible enterprise value, speculative appreciation as operating revenue, and operating-business goodwill. The system does not invent a residual percentage.

## 6. Property versus business economics

The property-centred comparison separates:

- property cash flow attributable to space/rights;
- development capital and timing;
- operating-business cash flow/goodwill;
- financing cash flow.

Enterprise earnings are not automatically capitalized as property value. A service/hospitality concept needs a documented allocation/management/lease structure before its operating economics can support property HBU.

## 7. Governance

A new component requires methodology citation, unit/dimensional review, applicability boundaries, golden calculations, double-count tests, sensitivity behavior and a named review record. Parameter changes create parameter-set versions; formula changes create component versions. Existing reports keep their original versions.

Lifecycle states are DRAFT, ACADEMIC_REVIEWED and RETIRED. Only ACADEMIC_REVIEWED versions execute in this project. Its reviewer may be the project author, instructor/advisor or documented specialist and must record role, content hash/version, evidence, tests, limitations and date. AI/tests cannot approve a version. Academic review permits prototype execution only; future professional/production approval is a separate state and process.

The initial set becomes ACADEMIC_REVIEWED only after the verification plan in implementation-plan.md passes. Financial FEASIBLE remains an academic model result under output-policy.md, not formal appraisal or investment advice.
