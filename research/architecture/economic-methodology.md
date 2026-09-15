# Economic methodology and HBU comparison research

Research date: **2026-09-15** (Asia/Bangkok). Status: **DESIGN RECOMMENDATION for final architecture review; not Architecture Freeze**.

Scope: economic behaviors, financial feasibility, automatic assumptions, uncertainty and property-centered comparison. This note follows `docs/project-overview.md`, read in full, and the owner's master prompt. It does not implement formulas, tests or an application. The proposed IDs below are not a professional standard's taxonomy and are not already approved registry entries.

## 1. Findings and professional basis

The following are short **PROFESSIONAL METHODOLOGY / VERIFIED SOURCE CONTENT** summaries. The remaining specification is an original **DESIGN RECOMMENDATION**, except where separately labelled. Foreign professional material supplies methods; it does not establish Thai law, local market parameters or permission to reuse commercial datasets.

| Source | Relevant finding and its limit |
|---|---|
| [S1 RICS development valuation](https://www.rics.org/content/dam/ricsglobal/documents/to-be-sorted/valuation-of-development-property---first-edition.pdf), glossary, §7, Appendix B1.2.8–9 | HBU concerns the asset's highest value subject to feasibility. Development analysis must account for timing and uncertainty. In project DCF, the target return represents development reward; debt analysis is separate. The guidance cautions against mixing financing, lump profit and discounting. This supports a consistent property/project basis, not a universal discount rate. |
| [S2 OCC commercial real estate lending, version 2.0](https://www.occ.treas.gov/publications-and-resources/publications/comptrollers-handbook/files/commercial-real-estate-lending/pub-ch-commercial-real-estate.pdf), Value Analysis and glossary | Direct capitalization uses stabilized NOI and an appropriate cap rate for a stable income stream. DCF accommodates timing and net exit proceeds. NOI covers property operating income less operating expenses; tenant recoveries and reimbursed costs need consistent treatment. US bank lending requirements are not Thai underwriting rules. |
| [S3 Fannie Mae operations definitions, Form 4254](https://multifamily.fanniemae.com/media/document/pdf/form-4254), Income and NCF | Rental analysis distinguishes potential rent, vacancy, concessions and collection effects. Its cash-flow reporting distinguishes NOI and replacement expenditure/reserve deductions. Deposits and asset sale proceeds are not recurring rental income. Product-specific assumptions are not adopted. |
| [S4 STR/CoStar FAQs](https://www.costar.com/products/str-benchmark/resources/faqs), ADR and RevPAR | ADR is room revenue divided by rooms sold; RevPAR uses rooms available. These are room revenue indicators, not profit measures. |
| [S5 STR reporting guidelines](https://www.costar.com/en-gb/gbr/products/str-benchmark/resources/guidelines/historical-benchmarking-data-reporting-guidelines), package rates, day use, revenue | Bundled hotel revenue needs allocation; food/service revenue is not all room revenue. Commission presentation depends on the booking arrangement. Same-day resale can produce reported hotel occupancy over 100%, so observed occupancy is not universally a bounded probability. |
| [S6 IAS 40, published 2021 text](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-40-investment-property.pdf), paragraphs 10–14 | Significant services can distinguish an owner-operated hotel from investment property; operating involvement matters. This is an accounting distinction supporting attention to the asset/business boundary, not an HBU ranking algorithm or a current Thai accounting opinion. |
| [S7 NIST capital investment analysis](https://www.nist.gov/el/applied-economics-office/manufacturing/capital-investment-analysis) | NPV compares discounted inflows and outflows; IRR solves zero NPV; payback measures recovery time. These identities do not supply project-specific hurdle rates. |
| [S8 NIST Handbook 135, 2022](https://nvlpubs.nist.gov/nistpubs/hb/2022/NIST.HB.135e2022.pdf), §3.2–3.3 | Discount cash flows consistently: nominal rates with nominal amounts, real rates with real amounts. Their exact relationship is multiplicative. US federal rates and planning assumptions are not transferable to Thai property investment. |
| [S9 HM Treasury Green Book 2026](https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government/the-green-book-2026), sensitivity and optimism bias | Test uncertain assumptions and switching values. Historical forecast errors and comparable projects can inform uncertainty. Probabilistic techniques require suitable assumptions. UK social discount rates, benefit metrics and generic optimism uplifts are not adopted. |
| [S10 US SBA break-even guide](https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), single product formula | For a simple linear model, break-even quantity equals fixed cost divided by unit price less unit variable cost. The site's miscellaneous percentage suggestion is not adopted. |
| [S11 IWG annual report 2025](https://investors.iwgplc.com/~/media/Files/I/IWG-IR/reports-and-presentations/2026/iwg-annual-report-2025-16-03-2026.pdf), note 4 | The operator reports workstation revenue, fee income and services separately. This is a real example of composable economic behaviors, not a Thai coworking benchmark. |

All eleven URLs above were fetched successfully on the research date. STR's former glossary failed to fetch and a former PDF redirected; the successful S4/S5 pages replace them. IFRS 13 full text redirected to login and is not claimed as reviewed. No paid local rent, cost, cap-rate or occupancy feed was acquired in this subtask.

## 2. What the existing research can and cannot supply

Reviewed `research/data-requirements-source-investigation/04-financial-reference.md` and the financial/evidence requirements in `research/data-architecture/data-requirements.md`. Their historical observations remain research records, not fresh verification in this note.

**CONFLICTS REQUIRING RECONCILIATION:** older notes prescribe user-adjustable financial defaults, investor-specific ranking, default operating ratios, or Treasury building assessment as a capex anchor. The overview supersedes the UX and investor choices. A number labelled an assumption still needs a defensible basis. An official assessed building value cannot establish current construction cost without an independently validated relationship. A policy/bond rate alone cannot establish property discount or capitalization rates. Neither geographic population nor visitor count establishes a project's demand capture.

**INFERENCE:** currently investigated sources do not establish a complete automatic property underwriting dataset. The architecture can be implementation-ready while particular model/parameter packs remain ineligible for live financial conclusions. Zero configuration means the system resolves or explicitly reports the gap; it does not mean every scenario must have a number.

## 3. Minimal practical component proposal

### Shared component envelope

Each registry version should contain `component_id`, immutable `version`, semantic definition, formula version, typed required/optional inputs, output account, applicability conditions, forbidden cases, resource claims, dependency references, evidence requirements, uncertainty inputs, rounding convention, examples, methodology references, review record and lifecycle state. Proposed lifecycle: `PROPOSED | VERIFIED | RETIRED`. `VERIFIED` means the particular formula and constraints passed professional review and implementation acceptance; it does not certify any property's inputs.

Use dimensions, not unrestricted unit strings: `THB`, `m2`, `unit`, `room`, `desk`, `bay`, `member`, `kWh`, `service`, and explicit time units. A rate retains its denominator and price date. Use `m2_month` and `room_night` as distinct dimensions; no automatic conversion between them. All inputs are period schedules where relevant. Negative adjustments use typed reversal accounts, never unexplained negative occupancy.

Eight behaviors are a practical starting point. Count is an engineering proposal, not a proof of mathematical minimality. More aggressively collapsing all arithmetic to quantity × rate loses essential contractual and resource semantics.

| Suggested stable ID | Meaning and deterministic identity | Required inputs / units | Optional refinements | Applicability and exclusions |
|---|---|---|---|---|
| `CAPACITY_TIME_REVENUE` | Sell exclusive use of capacity for time: `earned_t = Σ delivered_capacity_time[k,t] × rate[k,t]`. Forecast delivered quantity may be `available_capacity_time × utilization` only under an approved demand assumption. | Resource/segment ID; billable capacity-time; THB per matching capacity-time; availability calendar; rate definition. | Contract schedule, commencement, segment mix, concessions, turnover of inventory, rent review, credit loss and settlement bridge. | Units, floor area, room-nights, desk-hours, parking bay-hours, storage volume-time. Excludes unlimited access memberships, inventory transfers, manufacturing output and unverified capacity. Gross floor area is not automatically rentable area. |
| `SUBSCRIPTION_REVENUE` | Sell entitlement over a billing period: `earned_t = Σ active_billable_member_periods[k,t] × fee[k,t]`. | Contract/tier ID; member-period count; THB/member-period; entitlement/resource specification. | Proration, start/end dates, explicit acquisition/churn schedules, included allowances, payment schedule. | Flexible membership, coworking access, service subscription. Membership count is not simultaneous occupancy. Excludes assumed infinite service capacity or repeated sale of included benefits as new revenue. |
| `UNIT_SALE_REVENUE` | Deliver a priced item/service or transfer a sale asset: `earned_t = Σ delivered_quantity[k,t] × unit_price[k,t]`. | Product/service/asset identity; quantity and unit; THB/unit; delivery/transfer event; inventory or throughput constraint; settlement terms. | Returns, discounts, staged deposits, service duration, cost-of-sales drivers. | Property sellout, retail goods, service visits, metered energy sale, handling transactions. Development sales require unique asset inventory. Excludes using property resale proceeds as recurring operating revenue or treating deposits as earned revenue. |
| `BASIS_SHARE_REVENUE` | Contractually earn a fraction of an identified external base: `earned_t = share_t × eligible_base_t`. | Contract basis ID and definition; eligible THB amount; dimensionless share; timing; principal/agent role. | Only reviewed breakpoint/threshold variants in separately versioned formula definitions. | Simple management/commission/turnover arrangements. Excludes converting a merchant's gross sales into landlord revenue, self-referential bases and invented demand capture. A contractual revenue share is not a market-share assumption. |
| `FIXED_PERIOD_COST` | Resource/obligation cost independent of output within the specified range: `cost_t = fixed_obligation_t`. | Expense account; THB amount; period; payee/service/resource identity; covered scope. | Contract changes, active dates, known scheduled steps. | Security contract, insurance, salaried coverage and fixed charges with evidence. Excludes arbitrary all-in opex defaults or costs already inside a supplier quote. |
| `DRIVER_COST` | `cost_t = Σ quantity_of_driver[k,t] × cost_rate[k,t]`. | Driver reference and unit; THB/driver; account; payer; timing. | Reviewed tier schedules; resource conversion; payroll/utility breakdown. | Materials, cleaning per occupied room, metered utilities, staffing hours, goods sold, construction quantity-rate estimates. A cost per m2 must define the measured area and inclusions. Excludes pretending an index is a unit-cost level. |
| `BASIS_SHARE_COST` | `cost_t = share_t × eligible_base_t`. | Defined base account IDs; fraction; contract/benchmark basis; timing; expense scope. | Separately reviewed caps, floors, minimums and tax rules. | Evidenced agent fees, management charges or professional fees. Excludes unsupported generic expense percentages, arbitrary contingency and recursive percent-on-total formulas. |
| `CAPITAL_SCHEDULE` | Non-operating capital payment plan: `capital_t = Σ capital_event_amount[e]` for events paid in period t. | Work package/asset ID; THB amount; payment date; scope; quantity-rate derivation or evidenced quote; inclusion ledger. | Staged construction, fit-out, tenant improvements, replacement, demolition, remediation, disposal costs. | All concepts requiring physical investment. Excludes free-form AI-entered totals, double counting a capitalized quote and its underlying costs, or pretending a schedule is an engineering estimate. |

**Method basis:** S3 supports rental distinctions, S4/S5 room revenue semantics, S10 fixed/variable price-volume identities, and S11 mixed workspace revenues. The generalizations, IDs and restrictions above are this project's design. Formula arithmetic alone is insufficient for registry verification: the economic interpretation, cash timing, dimensions and exclusions require review.

### Components do not replace semantic adapters

Require reviewed adapters for lease schedules, room packages, memberships, sale inventory, tax treatment and settlements. These supply validated typed inputs to primitives. They cannot accept arbitrary executable expressions. An unimplemented tiered utility tariff or a novel profit waterfall is a missing model even if a human could express it with arithmetic.

Every required parameter is a `ParameterResolution` record; zero is allowed only as an evidenced or explicit non-applicability value. An optional input may be absent only when its applicability condition proves it unnecessary. Unknown bad debt, sales commission, infrastructure connection cost or taxes cannot silently become zero.

## 4. Breadth is composition, not a candidate catalog

The following is a **coverage challenge matrix**, not a fixed universe the AI must select from. Cost components are shared; each row still requires legal, physical and demand validation.

| Challenge case | Possible decomposition | Specific coverage gap to test |
|---|---|---|
| Residential rental / co-living | Capacity-time for units or bed-spaces; separate genuinely chargeable services | Do not rent the same bed as both whole unit and bed-space; shared amenities consume space; service bundle allocation. |
| Office / commercial space | Area-time leases plus evidenced service recovery | Contract rent versus market rent, rent-free periods, tenant works, break clauses, owner/tenant expense allocation. |
| Retail property | Landlord area-time and contractual turnover share | Tenant store sales belong to an operating-business scenario, not landlord gross income. |
| Hospitality | Room-nights plus incremental food/services; staff, utilities, distribution fees and FF&E | ADR/occupancy definitions, seasonal schedule, package overlap, operational goodwill and property value separation. |
| Industrial property | Area-time lease, yards and equipment if separately chargeable | Power, clear height, floor loading, access and tenant-specific fit-out; no unsupported manufacturing margin. |
| Logistics | Area/volume-time storage plus handling transaction charges if operator | Storage and movements are different drivers; queue/throughput, vehicles, equipment, labor and inventory responsibility. |
| Parking | Exclusive bay-time or contracts; separately justified additional services | Monthly reserved bays cannot simultaneously be sold hourly; turnover/dwell time and circulation. |
| Self-storage | Unit/area/volume-time, true incremental insurance/services | Gross building volume is not leasable storage; occupancy denominator and unit mix. |
| Coworking | Reserved desk-time, access memberships, incremental meeting/service sales | Entitlements share desk/meeting capacity; expected attendance is a separate demand model. |
| Consumer/business services | Service transactions or subscriptions, staffing/material drivers | Visits need throughput and demand evidence; property contribution cannot equal all operator profit. |
| Development for sale | Unique units sold over absorption schedule; construction and selling costs | Unsold inventory, transfer dates, presale deposits, price/absorption dependencies. |
| Mixed use / hybrid | Compose relevant behaviors with one resource/cash ledger | Shared land, circulation, equipment and costs; internal transfers eliminated; whole-property value basis. |

An EV charging hub can use metered sales and demand/energy cost drivers, but grid capacity, utilization, degradation, tariffs and peak-demand charging must be supported. A café can use sales and cost drivers, but no footfall-to-sales formula is thereby validated. Automated technology, agriculture, healthcare reimbursement, industrial manufacturing, complex franchises, contingent lease options and profit-sharing waterfalls are **not covered automatically**. Keep their supported submodels visible and mark the critical missing behavior.

## 5. Composition and cash integrity rules

These are deterministic design invariants, not professional numerical thresholds.

1. **One resource ledger.** Every exclusive physical claim references a resource and time slice. For each slice, sum of committed allocations cannot exceed verified usable capacity. Gross area, circulation, common areas and technical plant reconcile to an area budget; FAR is only one constraint, not proof of buildability.
2. **Membership is not occupancy.** A subscription grants rights; an independently supported attendance/service-demand schedule converts those rights to capacity consumption. Missing conversion means physical/service capacity remains unvalidated.
3. **Normalize denominators.** Source hotel occupancy over 100% may reflect same-day resale (S5). Keep the source value and definition; model smaller exclusive slots or a supported turnover definition. Only normalized exclusive-slot utilization is bounded by 0–1.
4. **No duplicate receipts.** Each charge has a unique payer, entitlement/asset, service interval and bundle reference. The hotel-plus-breakfast package and its allocations must reconcile to the same total, not add another breakfast charge. Common-area recovery equals the contractually recoverable cost basis; it is not free income.
5. **No duplicate expenses.** Every cost has an inclusion/exclusion scope and payer. Avoid all-in construction quote plus repeated MEP, or an opex benchmark plus every expense it already covers. Allocate shared costs once for candidate subviews; consolidate to the same total. Internal rent between a property and its own operator cancels in a consolidated project view.
6. **Inventory conserves units.** Opening sale inventory + completed units − transfers = closing inventory. Rent ends when the right transfers. Exit value excludes units already sold. Construction costs remain cash outflows; do not deduct accounting cost of sold property again in cash flow.
7. **Earned, billed and cash differ.** Record revenue, invoices, collections, deposits, refunds, expenses and payments distinctly. Deposits carry liabilities; late collection changes working capital. A simplified immediate-settlement assumption must be evidenced/labelled and sensitivity-tested when outcome-relevant.
8. **One terminal convention.** A retained property may have exit proceeds; do not add both a property-sale component and terminal value for the same asset. Explicitly handle selling costs, residual obligations, lease expiry and remaining useful life. Infinite freehold reversion is invalid for an expiring right.
9. **Finite dependency graph.** Components reference typed upstream outputs, never arbitrary formula strings. Reject cycles, inconsistent calendars/units, unsupported variants and rate-on-self bases. AI cannot insert a bypass component with a plausible name.
10. **Tax and risk ledgers.** Tax treatment records jurisdiction, taxpayer/transaction applicability, effective date, recoverability and cash timing. No Thai rate is asserted here. Risk adjustments record whether forecast cash flows, contingencies or the required return already represent a risk; avoid counting it repeatedly.

## 6. Scenario and metric specification

### Declare the comparison basis before calculation

Proposed `AnalysisBasis`: asset/right being valued; valuation date; currency; price basis (`NOMINAL | REAL`); tax basis; `PROPERTY_UNLEVERED | OPERATING_BUSINESS | EQUITY_FINANCED`; scenario calendar; market-participant return basis; treatment of acquisition, terminal assets and operating goodwill. These are internal analyst choices resolved from model policy/evidence, not investor-profile fields.

**Recommended main basis:** unlevered property/project cash flows on market-participant assumptions. Property taxes and transaction costs still matter; personal financing and personal income-tax preferences do not determine HBU. Compare the same interest at the same valuation date. A fee-simple result and leasehold result are not directly comparable. Dates/horizons should permit like-for-like discounted comparison; justify terminal treatment rather than impose an arbitrary ten-year hold.

### Cash identities and metric gates

Positive input amounts have account direction; cash flow is signed only during consolidation. For elapsed years `τ_t`, a constant annual discount rate gives `DF_t = (1+r)^(-τ_t)`. An approved term structure instead supplies the appropriate date discount factor. The system must specify day-count and rate compounding; monthly cash flows do not justify dividing an effective annual rate by 12. Exact annual-to-month conversion is `(1+r_annual)^(1/12)-1` (S8).

| Metric / output ID | Identity and conditions | When unavailable or misleading |
|---|---|---|
| `PROPERTY_NOI` | Property operating revenue − property operating expenses on a declared reporting convention (S2). Show a reconciliation of concessions, collection effects, recoveries and reserve treatment. | Development sellout revenue, debt draws and sale proceeds do not belong to recurring NOI. Business EBITDA is a different measure. |
| `UNLEVERED_CASH_FLOW` | Operating cash receipts − operating payments − development/replacement capital − other non-financing property payments + net property disposal receipts. An accrual route must instead reconcile working capital; never adjust working capital twice. | Incomplete payment timing, unidentified property/business boundary, absent material cost account. |
| `NPV` | `Σ CF_t × DF_t`, including all initial/acquisition cash flows where NPV is a transaction/project surplus (S7). THB at valuation date. | No defensible required-return basis: output unresolved, not a national default. Positive annual income alone is not financial feasibility. |
| `RESIDUAL_PROPERTY_VALUE` | Discount all candidate inflows and outflows **excluding the acquisition price of the subject interest**, using a consistent property/project return convention. Result is available value for that interest before any explicitly excluded acquisition costs. | If acquisition expenses depend on the unknown price, solve the fully specified acquisition-cost relation; do not hide the dependency. Do not add a second lump developer return and debt interest already represented by the chosen project DCF convention. |
| `CAPITALIZED_PROPERTY_VALUE` | Stabilized annual NOI / market-supported cap rate (S2); terminal valuation uses the appropriate forward income period and explicit selling costs. | No comparable cap-rate basis, unstable income, mixed-business profit, materially different NOI definition, or unsupported perpetual/terminal assumption. Cap rate ≠ discount rate. |
| `IRR` | Root of `Σ CF_t/(1+IRR)^τ_t = 0` (S7). Record periodicity and domain. | No root or multiple roots → corresponding unavailable/ambiguous status; never silently select a root. It is supplementary, not a ranking of mutually exclusive projects of different scale/timing. |
| `SIMPLE_PAYBACK` | First period cumulative undiscounted project cash flow recovers initial expenditure (S7). | No recovery within observed horizon → `NOT_REACHED`, not infinite or zero. Does not establish maximum property value. |
| `BREAK_EVEN_QUANTITY` | Fixed period costs / (unit price − unit variable cost), positive denominator and a valid linear single-output model (S10). Divide by matched available capacity only for break-even utilization. | Nonpositive contribution, mixed sales mix, nonlinear tariff, stepped staff or binding capacity → no universal shortcut; solve a reviewed model instead. |
| `DSCR` | Defined property net cash flow / contractual period principal-and-interest debt service; reporting convention travels with the metric. | No debt overlay → `NOT_APPLICABLE`; zero service is not infinite DSCR. No universal covenant threshold supplied. |

The residual expression is a **DESIGN operationalization** of property-centered comparison informed by S1. For an existing improved property, retain/continue current use is a counterfactual whenever evidenced. Compare redevelopment only after demolition, relocation, downtime and foregone existing use are correctly represented. Do not interpret a positive residual land number by itself as superiority to retention.

### Property value versus operating business

S6 motivates a boundary check, but the following are design rules. A hotel's room revenue, a retailer's sales or a coworking operator's margin contains operating-business economics. Do not capitalize it as pure real estate NOI. Permitted routes are: (a) property cash flow from an evidenced operator lease; (b) a separately reviewed trade-related property valuation method with the necessary operating, asset and market evidence; or (c) an operating-business scenario explicitly excluded from property-value ranking. Deducting an invented notional rent from business profit does not solve the boundary.

If route (b) is absent and route (a) has no evidence, a model may compute supported operator cash flows but must return `PROPERTY_VALUE_NOT_IDENTIFIED`. This is a model coverage limitation, not a reason to discard the concept or silently favor a simpler rental competitor.

Financing is an optional separate contractual overlay: debt draws, balance, interest, principal, fees and final repayment must reconcile. It must not change the main property-centered candidate ordering. Complex financing waterfalls remain unsupported until reviewed.

## 7. Automatic parameter resolution without fabricated defaults

Parameter hierarchy follows the locked overview: `EXACT_EVIDENCE → RELEVANT_PROXY → BENCHMARK → MODEL_ASSUMPTION`. A lower tier is usable only if its semantics and purpose remain compatible. Record rejected higher-tier evidence and the reason; conflicting exact observations do not justify silently picking the most favorable value.

Each resolved parameter records `parameter_id`, component/version, required dimension, value or bounds, target subject/geography/period, source evidence IDs, transformations, resolution tier, selection policy version, excluded alternatives, limitations, and assumption/range rationale. For a constant label such as occupancy, retain numerator, denominator, sampling period, seasonality and operating segment.

Proposed resolver process:

1. Determine the parameter's decision purpose and hard admissibility constraints: legal reuse, definition, unit, interest, property/operating segment and time coverage. Geographic proximity cannot rescue an incompatible measure.
2. Retrieve admissible comparables using existing matching infrastructure. Record similarity dimensions individually. Do not create an unexplained weighted confidence sum.
3. If one evidence set is no worse in the relevant dimensions and better in at least one, prefer it. Otherwise preserve the unresolved alternatives. A reviewed measure-specific policy may aggregate a homogeneous cohort, with sample/composition disclosure; there is no universal median, radius, age cutoff or minimum sample size in this proposal.
4. Derive values only through approved transformations: unit conversion, signed contract schedule, or validated time adjustment. A price index scales a compatible known level; it cannot create that level. A materials index cannot automatically inflate a total construction budget including labor and land.
5. An assumption is acceptable when its generating rule, source basis and applicability are inspectable: e.g. a contractually fixed price through expiry, or a calibrated reference-class forecast. Source-wide population × arbitrary capture percentage is not an evidence-based assumption policy.
6. Where plausible bounds exist without a justified center, compute ranges and switching values; do not manufacture a base case. Physical bounds alone, such as zero-to-full utilization, are not a market forecast. Where neither usable value nor outcome-relevant bounds exist, return `MISSING_PARAMETER` and the affected metrics.

**Activation gates:** each reusable rent, expense, development-cost, absorption, discount-rate or terminal-rate pack needs identified sources and reuse rights, geographic/segment scope, definition mapping, valid time coverage, forecast method, backtesting/professional validation record, and a withdrawal/fallback policy. No such nationwide pack is claimed complete here. Approving a formula is distinct from approving a parameter pack.

Optional factual transaction information from a user remains `USER_ASSERTED`; it does not make the source official or create an investor profile. The normal UI never requires the user to fill professional inputs to proceed.

## 8. Uncertainty, sensitivity and recommendation states

### Uncertainty set

For each candidate define an uncertainty set `U` of evidence-supported parameter schedules and unresolved admissible interpretations. Preserve shared assumptions across candidates: the same property area, construction-cost observation or market shock must not be independently redrawn merely because a different candidate uses it.

Bounds can come from comparable dispersion, supplier scope/ranges, unresolved source conflicts or validated historical forecast errors. A bound needs provenance and applicability just as a point does. An observed min/max is not automatically a confidence interval or future range. Distributional forecasts require calibration, dependence and selection-bias checks. With no justified distribution, do not display a probability of success. These are design controls informed by S9.

Calculate deterministic one-variable sensitivity and break-even/switching values first; run joint coherent schedules when uncertainties interact. Return the value at which NPV changes sign or candidate order changes. If a critical bound is unknown, disclose that robust ordering cannot be established. Generic ±10%/20% and fabricated conservative/base/optimistic values are prohibited.

The calculation trace records parameter set/version, scenario schedule, coherent dependency assumptions, method, and comparison outcomes. No additional AI call is required per perturbation. Sampling or three selected scenarios demonstrates only the evaluated cases; it cannot prove dominance across a continuous uncertainty set. A claimed universal result requires analytic bounds, interval bounds that safely enclose the outputs, exhaustive finite cases, or a validated optimization method. Unsupported nonlinear branches remain inconclusive.

### Preserve separate statuses

| Field | Suggested enum / meaning |
|---|---|
| `validation_status` | Existing `PASS | FAIL | PARTIAL | UNKNOWN`, per requirement/domain; unknown is never fail. |
| `model_coverage` | `COMPLETE | PARTIAL | NONE`; evaluate every material economic behavior and property-value bridge, not a percentage of component count. |
| `parameter_resolution_status` | `RESOLVED | BOUNDED | MISSING | CONFLICTING`; independent of model coverage. |
| `calculation_status` | `COMPLETE | PARTIAL | NOT_COMPUTABLE | INVALID`; arithmetic completeness does not imply feasibility. |
| `metric_status` | `AVAILABLE | NOT_APPLICABLE | MISSING_PARAMETER | UNSUPPORTED_MODEL | AMBIGUOUS | NOT_REACHED`; null value with reason when unavailable. |
| `recommendation_status` | Locked meanings: `CLEAR_RECOMMENDATION | INCONCLUSIVE | INSUFFICIENT_EVIDENCE`. |
| `scope` | `PROPERTY | PRELIMINARY_PROPERTY | AREA`; retain independent location precision. |
| `comparison_issue` | Examples: `UNRESOLVED_COMPETING_CANDIDATE`, `PROPERTY_VALUE_NOT_IDENTIFIED`, `INCOMPARABLE_BASIS`, `RANK_REVERSAL`, `UNBOUNDED_MATERIAL_INPUT`, `CANDIDATE_SEARCH_INCOMPLETE`. |

For financial validation, `PASS` requires the stated economic test, all decision-relevant model coverage, and adequate evidence for its stated scope. A viable conditional case and adverse case yield `PARTIAL`, with conditions. Demonstrated negative economic surplus throughout the supported uncertainty set can justify `FAIL` **for that defined scenario/basis**. Missing discount rate or missing operating costs yields `UNKNOWN`/`PARTIAL`, not failure. A speculative proxy-only computation cannot authorize a property-level PASS by arithmetic alone.

### Proposed deterministic decision procedure

1. Establish evidence scope, feasibility requirements and comparable economic basis. Confirm retention/current use and other evidence-supported alternatives were considered where relevant. Dynamic generation has no fixed Top N; record concept search coverage and reasons for exclusions.
2. Separate demonstrated infeasible candidates from unresolved candidates. An unresolved but potentially competing candidate remains visible and can block a clear winner. A computable rental model must not win merely because the hotel model is unsupported.
3. Compare common-basis property values or residuals. For each relevant pair and coherent uncertainty realization, compute `Δ_ab(u) = V_a(u) − V_b(u)`. Do not compare property NPV against operating-business EBITDA, or silently use financial-return preferences.
4. A sufficient, deliberately conservative **design rule** for clear recommendation is: one candidate remains legally/physically/economically supportable for the conclusion's scope and `inf[u∈U] Δ_ab(u) > 0` for every relevant alternative, with no unresolved competing candidate, no outcome-changing unbounded requirement and adequately completed candidate search. The infimum must be established, not presumed from sparse sampling. Any input measurement/model-error bounds travel into `U`.
5. Use `INCONCLUSIVE` when there is sufficient evidence to support viable candidates/comparison, but ties, overlaps, rank reversal or unresolved non-dominance prevent a defensible leader. Use `INSUFFICIENT_EVIDENCE` when the evidence/model basis cannot support that viable comparison at the requested scope. Scope-downgraded area potential remains possible without a property HBU winner.
6. Return the outcome, scope, viable alternatives, exclusions, blocked competitors, decisive requirements, sensitivity and missing evidence. A complete evidence-based result that rules out every assessed candidate is not automatically “insufficient”; report the demonstrated no-viable-use finding explicitly. Mapping that edge case to the locked three-state UX requires an owner-reviewed convention; recommend `INCONCLUSIVE` plus reason `NO_FEASIBLE_CANDIDATE`, with the restricted candidate-search scope visible.

This dominance rule is an **original conservative operational policy**, not a RICS-mandated test. It avoids arbitrary score/percentage gaps but may withhold a leader that a qualified valuer could otherwise reconcile. It establishes “best supported among evaluated defensible candidates”, not proof that no undiscovered use anywhere is better. Any later relaxation needs a documented validation study and architecture review, not an AI confidence score.

## 9. Decisions, limitations and future verification

| Classification | Item / recommendation | Alternatives and trade-offs |
|---|---|---|
| **LOCKED (existing overview only)** | Property-centered HBU, zero-configuration, evidence visibility, controlled formulas, missing model ≠ missing parameter, no forced winner. | No redesign proposed. |
| **DESIGN RECOMMENDATION** | Eight primitive IDs, typed resource/cash ledger, unlevered property basis and conservative dominance as specified here. | More generic algebra is smaller but unsafe semantically; more sector-specific models are easier initially but become a fixed model catalog. Final architecture review must approve the proposed boundary. |
| **IMPLEMENTATION CHOICE** | Money precision, approved date convention, graph executor and numerical library within these invariants. | Numerical tolerances are computational settings established through validation, not investment decision thresholds. |
| **KNOWN LIMITATION / activation prerequisite** | Thai parameter packs, legal tax-rule adapters and trade-related property valuation require licensed evidence and review before use. | Suppressing unsupported metrics preserves honest output; invented defaults give false completeness. No numeric country-wide hurdle/cap rate is supplied. |
| **OPEN DECISION** | How much licensed professional market data and specialist review will the owner fund? | Open-only sources give broad contextual coverage but limited defensible underwriting; licensed datasets/curated studies can improve it at recurring cost. Recommend approve sources based on demonstrated decision gaps, not buy every feed. Uncertainty: actual contracts/prices/coverage not investigated here. |
| **OPEN DECISION** | Confirm product mapping for fully evidenced “no assessed use is feasible” under the three locked result states. | Recommend `INCONCLUSIVE` + `NO_FEASIBLE_CANDIDATE`; this preserves locked states but requires a clear user-facing distinction from multiple viable alternatives. Creating a fourth top-level state would change the overview and is not done here. |

Architecture-level acceptance cases for the implementation team: reconcile rental concessions and arrears; hotel package without duplicate food revenue; source occupancy above 100% without silently clamping; membership overcommitting meeting rooms; office recovery with tenant-paid costs; parking reserved/hourly conflict; warehouse lease versus logistics operation; property sellout removing inventory and terminal value; delayed construction shifting openings and revenue; two IRR roots; undefined cap rate; incompatible price/cost index; unsupported operator valuation blocking a simpler competitor; assumption-driven rank reversal; infeasibility distinct from missing evidence; jointly correlated shocks; no fee/tax silently zero; recurring replacement reserve versus actual replacement not double counted; no candidate-count truncation disguised as dominance. These are specifications only; no tests were implemented.
