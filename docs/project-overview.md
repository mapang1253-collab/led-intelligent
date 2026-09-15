# Real Estate Investment Intelligence System

## Project Overview

**Current delivery context:** This is a browser-based web application designed as a university academic project submitted to an instructor. The analytical system covers all of Thailand. Chon Buri/EEC is used only for research, integration tests and validation fixtures. Academic use does not remove source-access, licence, privacy or attribution requirements.

**Architecture baseline:** Architecture Freeze v1.0 was declared by the project owner on 2026-09-15 (Asia/Bangkok). The frozen scope and change-control rules are recorded in [`ARCHITECTURE-FREEZE.md`](../ARCHITECTURE-FREEZE.md).

### 1. Project Purpose

The Real Estate Investment Intelligence System is a data-driven decision support system designed to evaluate the investment potential and possible utilization of real estate in Thailand.

The system combines property information, official government data, auction data, geographic and accessibility data, demographic and economic evidence, real estate market information, and other relevant external sources.

These inputs are transformed into structured evidence, analytical features, potential property-use concepts, and financial scenarios.

Artificial intelligence is used as an analytical reasoning layer to generate and compare potential uses, interpret evidence, identify opportunities and risks, and communicate the final recommendation.

The system is not intended to simply answer:

> “What is this property worth?”

Its primary analytical question is:

> **“Based on all available evidence, what type of use has the highest potential for this property?”**

The system follows the principle:

> **AI can propose; data must justify.**

---

## 2. What the System Is

The system is an:

> **Real Estate Investment Intelligence and Decision Support System**

Its product interface is a responsive web application used through a modern browser. A server-side backend owns data acquisition, secrets, evidence processing, deterministic validation/calculation, AI orchestration and persistence. The browser owns property intake, progress display and the single final analysis. The MVP displays the result on the protected web page and provides no application download/export feature. The analytical system must not be implemented entirely in client-side code.

It combines several analytical capabilities:

- property and location analysis;
- legal and regulatory screening;
- physical feasibility analysis;
- market and demand analysis;
- valuation and price evidence;
- potential-use generation;
- financial feasibility analysis;
- scenario and sensitivity analysis;
- AI-assisted interpretation and recommendation.

The system is designed to move from raw evidence toward a defensible investment conclusion rather than merely presenting data to the user.

---

## 3. What the System Is Not

The system is not:

- a property listing platform;
- a real estate marketplace;
- a simple property price calculator;
- a generic chatbot;
- a fixed business recommendation system;
- a replacement for legal, engineering, appraisal, or investment professionals;
- a system that guarantees investment returns;
- a personalized investor profiling platform.

The system must explicitly communicate uncertainty whenever available evidence is insufficient to support a strong conclusion.

---

# 4. Geographic Scope

The system is designed for:

> **Thailand-wide analysis**

The architecture must therefore remain location-agnostic and must not hard-code Chon Buri or the Eastern Economic Corridor into the analytical model.

However:

> **Chon Buri and the EEC are the primary research, integration-testing, and validation region during development.**

This does not create a Chon Buri/EEC product phase or a regional MVP. Every province must enter the same production pipeline and contracts. Chon Buri/EEC-specific fixtures, sources and rules are test coverage only and must never become a hard-coded branch, default location or limit on who can use the system.

Some external datasets may only cover particular regions.

For example, an EEC-specific planning dataset may provide useful regulatory evidence for properties inside the EEC but cannot be assumed to apply elsewhere in Thailand.

The system must therefore determine:

1. where the property is located;
2. which evidence sources cover that location;
3. which geographic level each source represents;
4. which alternative evidence can be used when preferred evidence is unavailable.

Different geographic areas may therefore have different evidence coverage without requiring different core system architectures.

---

# 5. Highest and Best Use Framework

The analytical backbone of the system is influenced by the Highest and Best Use (HBU) framework.

Potential uses are evaluated through four fundamental dimensions:

1. **Legally Permissible**
2. **Physically Possible**
3. **Financially Feasible**
4. **Maximally Productive**

HBU in this system is primarily a property-centered question.

It asks:

> What use is best supported by the characteristics, constraints, market environment, and economics of this property?

It does not ask:

> What use is best for a particular investor?

Therefore, the MVP does not contain an Investor Profile.

User-specific scenario values, if ever supplied as property or transaction information, must not change the conceptual meaning of HBU.

---

# 6. No Login and No Investor Profile

The MVP does not require:

- user accounts;
- authentication;
- investor profiles;
- personal investment preferences;
- saved personal analysis history;
- social features.

A user should be able to provide information about a property and receive an analysis directly.

The absence of user accounts does not mean that the system does not require a database.

The database primarily exists to support reusable analytical data rather than user identity.

---

# 7. Property Intake Philosophy

The system follows a:

> **Progressive Property Intake**

The user should provide the minimum information necessary to begin analysis.

The system should not require information that ordinary users may not know.

The initial geographic input is:

```text
Province*
District*
Subdistrict*

[ + Optional location details ]
```

Province, District, and Subdistrict should use normalized administrative identifiers through dependent dropdowns or autocomplete rather than unrestricted free text.

Optional information may include:

- house number;
- road or soi;
- village or development name;
- deed number;
- map sheet;
- land number;
- other property-specific information.

A future version may support:

- map pin;
- interactive map selection.

A map interface is not required for the initial MVP.

---

# 8. Property Identity and Location Are Different Concepts

The system must not treat an address as a Property ID.

Conceptually:

```text
Province + District + Subdistrict
        ↓
Administrative / Area Identity

Address / location description
        ↓
Approximate Location Evidence

Coordinate
        ↓
Point Location Evidence

Parcel identifiers / verified parcel geometry
        ↓
Property / Parcel Identity Evidence
```

Possible location-resolution states include:

```text
AREA / SUBDISTRICT
APPROXIMATE / ADDRESS
POINT
PARCEL
```

The system must retain the precision and confidence of the resolved location.

Area-level evidence must never be presented as parcel-level evidence.

---

# 9. Evidence Model

Evidence is a first-class concept in the architecture.

The conceptual Evidence Model is:

```text
Evidence
├── Subject
├── Fact / Value
├── Source / Provenance
├── Geography
├── Time
├── Matching / Relevance
└── Quality
    ├── Reliability
    ├── Freshness
    ├── Completeness
    └── Geographic Relevance
```

This model describes the meaning of evidence.

It is not necessarily the final database schema.

---

# 10. Evidence Principles

The following principles are mandatory.

### Principle 1 — Every value must retain its meaning

Values must not become detached from their units, definitions, geographic level, period, or analytical meaning.

### Principle 2 — Source is not Evidence Type

Where information came from and what the information represents are separate concepts.

### Principle 3 — Property-level is not Area-level

Province, district, subdistrict, point, and parcel evidence must remain distinguishable.

### Principle 4 — Derived information must be identified as derived

Calculated or inferred values must never appear as directly observed facts.

### Principle 5 — User Input is not Official Fact

User-provided information may be used, but its provenance must remain explicit.

### Principle 6 — Evidence Quality must be explicit

Reliability, freshness, completeness, and geographic relevance must be retained and considered during analysis.

---

# 11. Evidence Resolution and Proxy Policy

The system follows:

> **Exact evidence when available → best available relevant evidence when exact evidence is unavailable → explicitly disclose evidence quality.**

The nearest evidence is not necessarily the geographically closest evidence.

Relevance may include:

- geographic relevance;
- temporal relevance;
- property similarity;
- source reliability;
- completeness.

For example, comparable evidence may expand from:

```text
Exact / highly similar property
        ↓
Nearby similar property
        ↓
Same subdistrict
        ↓
Same district
        ↓
Province
        ↓
Broader benchmark
```

The actual proxy-selection methodology and weighting remain subjects for Analysis Architecture research and must not be arbitrarily invented.

---

# 12. Visible Evidence by Default

Evidence that materially affects a recommendation must be visible in the final analysis.

Important evidence must not be hidden behind a “View Details” interaction.

When a proxy replaces preferred evidence, the result should communicate:

```text
Requested Evidence Level
Actual Evidence Level
Source
Reason for Substitution
Impact on Confidence
```

Example:

```text
Requested: Property-level location evidence
Used: Subdistrict-level evidence
Reason: Exact property location could not be resolved
Impact: Location confidence reduced
```

---

# 13. Recommendation Strength and Evidence Strength

A fundamental system rule is:

> **Recommendation strength must never exceed evidence strength.**

For example:

### Property-Level Recommendation

Appropriate when sufficient property/parcel-specific evidence exists.

### Preliminary Property Recommendation

Appropriate when the approximate property is known but important property-specific evidence remains incomplete.

### Area Potential Analysis

Appropriate when only administrative-area information is available.

The system must not present an area-level analysis as a fully validated property-specific HBU conclusion.

---

# 14. Core External Data Sources

The initial data architecture includes several major source categories.

## Treasury Department

Primary role:

> **PROPERTY / OFFICIAL ASSESSED VALUE**

Potential evidence includes:

- official assessed land value;
- parcel-related identifiers;
- land area where available through authorized sources;
- coordinates where available through authorized sources;
- building assessed-value references.

Treasury assessed building values must not automatically be treated as real construction costs.

---

## Legal Execution Department — LED

Primary role:

> **AUCTION / DISTRESSED PROPERTY EVIDENCE**

Potential evidence includes:

- auction listings;
- property identifiers;
- official appraisal values;
- auction schedules;
- auction results;
- sold prices;
- highest bids;
- distressed-property opportunities.

Auction prices must not automatically be interpreted as normal arm's-length market values.

---

## OpenStreetMap — OSM

Primary role:

> **LOCATION / ACCESSIBILITY / SURROUNDINGS**

Potential evidence includes:

- roads;
- transportation infrastructure;
- railway access;
- nearby services;
- points of interest;
- accessibility indicators;
- geographic context.

Missing OSM features must not automatically be interpreted as proof that a real-world feature does not exist.

---

## Real Estate Information Center — REIC

Primary role:

> **REAL ESTATE MARKET CONTEXT**

Potential evidence includes:

- market trends;
- property indices;
- supply-demand context;
- market reports;
- selected geographic and property-type indicators.

Area-level indices must not be presented as property-level prices.

---

## Extensible Source Architecture

These four sources are not the complete data universe.

The architecture must support additional sources such as:

- demographic data;
- tourism data;
- industrial activity;
- zoning and planning;
- environmental evidence;
- flood history;
- elevation;
- transportation;
- economic statistics;
- construction references;
- rental evidence;
- other relevant market evidence.

Each source must retain information about its geographic coverage, granularity, access method, reliability, freshness, and licensing constraints.

---

# 15. Data Acquisition Philosophy

The system uses a hybrid:

> **On-Demand Acquisition + Persistent Analytical Storage**

Conceptually:

```text
User Request
     ↓
Backend
     ↓
Check Database
  ↙       ↘
Found     Missing / Stale
 ↓             ↓
Reuse      Acquire Source
                 ↓
             Normalize
                 ↓
              Persist
                 ↓
              Analyze
```

The database is:

> **a persistent analytical data store and reusable cache**

It is not merely a dump of API responses.

The system should persist data when persistence improves reuse, consistency, historical analysis, matching, or analytical efficiency.

The system does not need to download all possible nationwide data by default.

---

# 16. No Fixed Business List

This is a core architectural decision.

The system must not maintain a predefined universe such as:

```text
Apartment
Hotel
Restaurant
Café
Warehouse
Parking
...
```

and force the AI to select from that list.

Instead:

> **AI may generate Potential Use Concepts dynamically from available evidence.**

Examples could include conventional, hybrid, or novel concepts.

The system therefore avoids treating all possible property uses as a fixed classification problem.

---

# 17. AI-Generated Potential Use Concepts

The AI Analyst may generate concepts such as:

```text
Co-living for industrial professionals

EV Charging Hub + Café

Micro-warehouse + Last-Mile Logistics

Flexible Residential + Coworking
```

The name of a concept is not sufficient for validation.

The concept must first be transformed into a structured representation describing its underlying behavior.

Conceptually:

```text
Potential Use Concept
        ↓
Structured Concept Representation
├── Activities
├── Physical Requirements
├── Economic Behaviors
└── Demand Hypothesis
```

The exact ontology and schema require further professional research during Analysis Architecture design.

---

# 18. AI Proposes — Engines Validate — AI Interprets

A central architectural principle is:

> **AI proposes. Engines validate. AI interprets.**

AI may:

- interpret evidence;
- identify demand signals;
- identify opportunities;
- identify constraints;
- generate Potential Use Concepts;
- structure concepts;
- map concepts to supported analytical components;
- interpret validation results;
- compare scenarios;
- explain recommendations.

AI must not independently certify that its own proposal is legally, physically, or financially valid.

Conceptually:

```text
                  AI CONCEPT
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       LEGAL       PHYSICAL    ECONOMIC
      VALIDATOR    VALIDATOR    VALIDATOR
          │           │           │
          └───────────┼───────────┘
                      ↓
                ANALYSIS ENGINE
                      ↓
                FINAL AI ANALYST
```

---

# 19. Validation States

Validation must not be limited to binary PASS/FAIL results.

The system should support:

```text
PASS
FAIL
PARTIAL
UNKNOWN
```

The distinction between `FAIL` and `UNKNOWN` is critical.

Missing evidence does not prove infeasibility.

For example:

```text
Parcel frontage unavailable
```

does not mean:

```text
The proposed development is physically impossible.
```

It means that the relevant physical requirement may remain unvalidated.

---

# 20. Legal Validation

AI-generated concepts must be translated into activities or land-use characteristics that can be evaluated against applicable legal and regulatory evidence.

Conceptually:

```text
AI Concept
     ↓
Activities / Land-Use Characteristics
     ↓
Applicable Legal Classification / Rules
     ↓
Legal Evidence
     ↓
PASS / FAIL / PARTIAL / UNKNOWN
```

The system must not rely on string matching between an AI-generated business name and a zoning category.

The exact legal ontology, classification method, and applicable regulatory hierarchy require further research.

---

# 21. Physical Validation

Potential uses must also be evaluated against physical property requirements.

Possible requirements may include:

- usable land area;
- frontage;
- access;
- road characteristics;
- parcel geometry;
- building footprint;
- utilities;
- parking/circulation;
- environmental constraints;
- other use-specific requirements.

The system must distinguish between:

> evidence showing feasibility

and:

> absence of evidence proving infeasibility.

Physical validation methodology requires further research.

---

# 22. Controlled Economic Component Registry

Although the system has no Fixed Business List, financial modeling cannot be completely unrestricted.

The system therefore uses a:

> **Controlled Economic Component Registry**

The registry contains reusable economic behaviors rather than business types.

Illustrative examples may include:

```text
UNIT_RENTAL
AREA_RENTAL
ROOM_NIGHT
CAPACITY_USAGE
MEMBERSHIP
TRANSACTION_SALES
```

and reusable cost behaviors.

These examples are illustrative only.

The final component library must be derived from research into recognized real estate feasibility, underwriting, development, hospitality, commercial, industrial, mixed-use, and other relevant economic models.

The objective is not:

> “Create as many components as possible.”

The objective is:

> **Identify the smallest practical set of validated economic primitives capable of composing a broad range of property-use concepts.**

---

# 23. Component Identification

Economic components must use stable machine-readable identifiers.

The system must not depend on string equality between AI-generated text and component names.

For example:

```text
UNIT_RENTAL
```

should represent a defined economic behavior rather than merely a text label.

Each component should eventually define information such as:

- stable component ID;
- economic meaning;
- validated calculation behavior;
- required parameters;
- optional parameters;
- applicable cases;
- non-applicable cases;
- compatible components;
- evidence requirements.

AI selects or maps to these controlled identifiers using semantic definitions and structured output.

Backend validation verifies that requested components actually exist.

---

# 24. Missing Economic Model vs Missing Parameter

These are two different problems and must never be treated as equivalent.

## Missing Economic Model

Example:

```text
AI proposes Concept X
        ↓
No validated economic component can represent
an important revenue mechanism
```

The system must not allow AI to invent a new financial formula merely to complete the calculation.

The result should instead indicate that financial validation is incomplete.

---

## Missing Parameter

Example:

```text
UNIT_RENTAL exists

Required:
unit count        available
rent              unavailable
occupancy         unavailable
```

The economic model is valid, but evidence for some parameters is missing.

This case uses the Parameter Resolution hierarchy.

---

# 25. Parameter Resolution

The system follows:

```text
Exact Evidence
      ↓ unavailable
Relevant Proxy
      ↓ unavailable
Benchmark / Reference
      ↓ unavailable
Model Assumption
```

The exact selection methodology requires research.

Every parameter must retain provenance.

Examples:

```text
Rent
→ Market Proxy

Occupancy
→ Model Assumption

Land Price
→ Official / User-Supplied Evidence

Construction Reference
→ Benchmark
```

A Model Assumption must never be presented as observed market evidence.

---

# 26. Zero-Configuration Scenario Analysis

The user should not be required to configure financial models manually.

The system should attempt to complete the analysis itself.

Users should not normally need to provide:

- occupancy assumptions;
- operating expenses;
- construction cost assumptions;
- discount rates;
- rental assumptions;
- other professional modeling parameters.

The system resolves these values from evidence, proxies, benchmarks, or explicitly identified model assumptions.

Therefore:

> **The analytical burden belongs to the system, not the user.**

---

# 27. Dynamic Scenario Models

Different property uses require different economic models.

There must not be one universal scenario input schema for all Potential Uses.

Conceptually:

```text
Property Evidence
       ↓
Analysis Engine
       ↓
AI Analyst
       ↓
Potential Use Concept
       ↓
Economic Component Mapping
       ↓
Scenario Requirements
       ↓
Parameter Resolution
       ↓
Scenario Engine
```

Hybrid uses may combine multiple validated economic components.

---

# 28. AI Must Not Invent Financial Formulas

A mandatory rule is:

> **AI may design the scenario structure, but it must not invent unvalidated financial formulas.**

AI may determine which validated components are required for a concept.

The Scenario Engine performs deterministic calculations using approved formulas.

If a concept cannot be represented safely by validated components:

```text
Financial Model Coverage: PARTIAL
```

or equivalent status should be returned.

The system must prefer incomplete validation over fabricated precision.

---

# 29. Automatic Sensitivity Analysis

When important parameters contain meaningful uncertainty, the system should automatically test sensitivity rather than rely on a single potentially misleading point estimate.

Conceptually:

```text
Conservative Scenario
Base Scenario
Optimistic Scenario
```

The exact scenario-generation methodology must be professionally researched and should not be based on arbitrary percentage adjustments.

Sensitivity analysis should help determine whether a recommendation is robust.

For example:

```text
Use A wins under:
Conservative
Base
Optimistic

→ Recommendation appears robust
```

versus:

```text
Conservative → Use A
Base         → Use B
Optimistic   → Use C

→ Recommendation is highly assumption-sensitive
```

---

# 30. Analysis Pipeline

The current conceptual analytical pipeline is:

```text
PROPERTY
   ↓
DATA LAYER
   ↓
Normalize / Match
   ↓
Feature Engineering
   ↓
ANALYSIS ENGINE
   ↓
AI ANALYST
├── Understand demand
├── Identify opportunities
├── Identify constraints
└── Generate Potential Uses
   ↓
STRUCTURED POTENTIAL USE CONCEPTS
   ↓
LEGAL / PHYSICAL / ECONOMIC VALIDATION
   ↓
SCENARIO ENGINE
   ↓
Financial Simulation
   ↓
Sensitivity Analysis
   ↓
AI ANALYST
├── Interpret
├── Compare
└── Recommend
   ↓
FINAL INVESTMENT ANALYSIS
```

---

# 31. Single Final User-Facing Output

Although the internal architecture may contain multiple AI and analytical stages, the user should receive:

> **One Final Investment Analysis**

The user should not need to perform a first analysis, configure a scenario, and then perform a second analysis.

The system should complete the analytical process internally.

The final result should contain the relevant combination of:

- Best Potential Use, when defensible;
- alternative viable uses;
- analytical explanation;
- supporting evidence;
- counter-evidence;
- legal validation;
- physical validation;
- financial feasibility;
- scenario results;
- sensitivity;
- assumptions;
- proxies;
- evidence quality;
- limitations;
- confidence / recommendation status.

Every final-result screen must also display the versioned academic disclaimer, scope/status statement and verification actions defined in `docs/output-policy.md`.

---

# 32. Dynamic Candidate Count

The system must not force a fixed number of recommendations such as Top 3 or Top 5.

It should report:

> **all defensible candidate uses supported by the available evidence**

If only two concepts are sufficiently supported, only two should be presented.

If more are defensible, more may be presented.

The system must not manufacture weak candidates simply to satisfy a fixed output count.

---

# 33. The System Must Not Force a Winner

A recommendation may result in one of three high-level states.

## CLEAR RECOMMENDATION

Available evidence supports a sufficiently defensible leading use.

The result may present:

```text
Best Potential Use
+
Defensible Alternatives
```

---

## INCONCLUSIVE

Multiple candidates appear viable, but available evidence cannot defensibly establish a clear winner.

The system must explicitly communicate this rather than arbitrarily selecting one.

---

## INSUFFICIENT EVIDENCE

Available evidence is not sufficient to produce a defensible Best Potential Use conclusion.

This is a valid analytical result, not a system failure.

The system should identify the major evidence limitations responsible for the result.

The methodology used to distinguish these states must be researched during Analysis Architecture design. Arbitrary thresholds must not be introduced without justification.

---

# 34. Explainable Recommendation

The final recommendation must be visibly explainable.

The user-facing reasoning should follow approximately:

```text
AI Recommendation
       ↓
Why?
       ↓
Supporting Evidence
       ↓
Contradicting / Limiting Evidence
       ↓
Legal + Physical Validation
       ↓
Financial Scenario
       ↓
Sensitivity
       ↓
Assumptions / Proxies
       ↓
Uncertainty
       ↓
Conclusion
```

The system should provide concise evidence-backed explanations.

It must not expose private model chain-of-thought.

---

# 35. High-Level System Architecture

```text
USER / WEB BROWSER
  |
  v
FRONTEND / UI
  |
  | HTTP / API
  v
BACKEND
  |
  +-- Data Services
  +-- Matching / Resolution
  +-- Evidence Layer
  +-- Feature Engineering
  +-- Analysis Engine
  +-- Validation Engines
  +-- AI Analyst
  +-- Scenario Engine
  |
  v
DATABASE
```

External sources feed the analytical system through a controlled data pipeline:

```text
External Data Sources
        ↓
Data Acquisition
        ↓
Raw / Source Data
        ↓
Clean / Validate / Normalize
        ↓
Entity & Geographic Matching
        ↓
Canonical Analytical Data
        ↓
Feature Engineering
        ↓
Analysis Engine
        ↓
AI + Validation
        ↓
Scenario Engine
        ↓
Final Analysis
```

---

# 36. Development Philosophy

Technology choices must follow the analytical problem.

The project follows:

> **Business Question → Data → Analysis → Architecture → Technology**

and not:

> **Technology → Find something to build with it**

Technology decisions must therefore be justified by the data, analysis, and system requirements.

---

# 37. Current Project Status

Current high-level status:

```text
Phase 0 — Project Definition
Status: COMPLETE

Phase 1 — High-Level System Architecture
Status: COMPLETE — FROZEN IN ARCHITECTURE FREEZE v1.0

Phase 2 — External Data Source Research
Status: MAJOR INITIAL SOURCES RESEARCHED

Phase 3 — Data Architecture
Status: FINAL REVIEW COMPLETE — SOURCE ACTIVATION OPEN

Phase 4 — Analysis Architecture
Status: FINAL REVIEW COMPLETE — METHOD ACTIVATION OPEN

Phase 5 — Scenario Engine
Status: FINAL REVIEW COMPLETE — COMPONENT/PARAMETER ACTIVATION OPEN

Phase 6 — AI Architecture
Status: FINAL REVIEW COMPLETE — PROVIDER EVALUATION OPEN

Phase 7 — Technical / System Design
Status: FINAL REVIEW COMPLETE — BENCHMARK/POLICY TARGETS OPEN

Phase 8 — Documentation / Implementation Specification
Status: COMPLETE — FROZEN IMPLEMENTATION HANDOFF

Architecture Freeze
Status: DECLARED — v1.0 — 2026-09-15 (Asia/Bangkok)
```

---

# 38. Locked Architectural and Product Decisions

The following principles are frozen v1.0 project constraints and must not be silently redesigned during implementation or subsequent research.

1. Thailand-wide system architecture.
2. Chon Buri/EEC is the primary research and validation region, not the product boundary.
3. Property-centered HBU.
4. No Investor Profile in MVP.
5. No Login in MVP.
6. Progressive Property Intake.
7. Evidence Model is a first-class architectural concept.
8. Property-level and area-level evidence must remain distinguishable.
9. Exact evidence is preferred; proxies are allowed when explicitly disclosed.
10. Evidence quality must remain visible.
11. Recommendation strength must never exceed evidence strength.
12. No Fixed Business List.
13. AI may dynamically generate Potential Use Concepts.
14. AI-generated concepts must be transformed into structured analytical representations.
15. AI proposes; engines validate; AI interprets.
16. Legal, physical, and financial feasibility must not be certified solely by AI.
17. Validation supports PASS / FAIL / PARTIAL / UNKNOWN.
18. Controlled Economic Component Registry rather than fixed business models.
19. Components use stable machine identifiers and semantic definitions, not string matching.
20. Missing Model and Missing Parameter are separate conditions.
21. AI must not invent financial formulas.
22. Parameter resolution follows Exact Evidence → Relevant Proxy → Benchmark → Model Assumption.
23. Material assumptions must be explicitly disclosed.
24. Scenario analysis should be zero-configuration for the user.
25. Material uncertainty should trigger automatic sensitivity analysis.
26. The user receives one final analytical output.
27. Recommendation count is dynamic rather than fixed Top N.
28. The system must not force a winner.
29. CLEAR RECOMMENDATION, INCONCLUSIVE, and INSUFFICIENT EVIDENCE are valid final states.
30. Material evidence, counter-evidence, assumptions, proxies, limitations, and uncertainty are visible by default.
31. Database storage is an analytical data store and reusable cache, not simply an API-response dump.
32. This frozen handoff contains research, architecture and implementation specification rather than application code; application implementation belongs to the explicitly authorized next phase.
33. The current delivery is a university academic project; Chon Buri/EEC remains test/validation coverage and never the product boundary.
34. Anonymous runs expire 24 hours after creation; authorized users may view the result before expiry; no application download/export, public share link or saved history exists.
35. Only versioned `ACADEMIC_REVIEWED` rule/method/component/parameter packs execute in the academic demonstration; this status is not professional or production approval.
36. Every final-result screen displays the locked academic disclaimer, scope/status statement and deterministic verification actions from `docs/output-policy.md`.
37. When a completed candidate search proves every evaluated concept has a verified critical FAIL, the result is `INCONCLUSIVE` with reason `NO_FEASIBLE_CANDIDATE`, limited explicitly to evaluated concepts.
38. The product is a responsive browser-based web application backed by HTTP/JSON services, background analysis workers and PostgreSQL/PostGIS; it is not a CLI, native desktop/mobile application or browser-only analytical engine.
39. The implementation uses the locked TypeScript, React/Vite, Hono, Cloudflare, Supabase/PostGIS and Gemini profile in `docs/technology-stack.md`; local development and deployment do not require Docker.
40. Gemini 3.1 Flash-Lite is the primary AI model. A normal run uses one concept-proposal call and permits at most one bounded repair; quota or provider failure cannot be concealed with invented concepts or recommendations.
41. The MVP user experience is Thai-only. Every end-user screen, progress/error state and report is Thai, and every displayed AI field is validated as `th-TH` before presentation.

---

# 39. Frozen Designs and Remaining Activation Work

Detailed design for the areas below completed independent final review in docs/final-architecture-review.md and was accepted into Architecture Freeze v1.0. The list describes the original unresolved scope; remaining research and activation gates are maintained in docs/implementation-plan.md.

The specialized normative documents listed in [`ARCHITECTURE-FREEZE.md`](../ARCHITECTURE-FREEZE.md) govern these frozen designs. Completing a documented activation gate may enable a source or analytical pack without changing the architecture; changing the frozen contracts or behavior requires an owner-approved architecture decision and a new version.

### Analysis Architecture

The reviewed design defines:

- feature definitions;
- proxy-selection methodology;
- evidence relevance scoring;
- confidence methodology;
- evidence combination;
- candidate generation strategy;
- candidate filtering;
- candidate comparison;
- recommendation robustness;
- winner/dominance methodology;
- legal/physical/financial validation aggregation.

### Legal and Physical Validation

The reviewed design defines:

- activity/use ontology;
- legal classification;
- planning and zoning hierarchy;
- development-control evidence;
- physical requirement representation;
- property requirement validation;
- handling conflicting regulatory evidence;
- handling unresolved requirements.

### Economic Component Registry

The reviewed design proposes, subject to professional activation:

- validated primitive components;
- formulas;
- parameter definitions;
- component composition;
- model coverage;
- unsupported economic behaviors;
- financial metrics;
- economic-model validation.

The registry must optimize for broad composability rather than maximum component count.

### Scenario Engine

The reviewed design defines:

- scenario construction;
- financial feasibility methodology;
- parameter resolution;
- proxy selection;
- benchmark selection;
- assumption generation;
- sensitivity methodology;
- uncertainty propagation;
- comparison methodology.

### AI Architecture

The reviewed design defines:

- structured AI outputs;
- schemas;
- model responsibilities;
- component mapping;
- concept representation;
- evidence context;
- hallucination controls;
- validation boundaries;
- final explanation generation.

### Data Architecture

The reviewed design defines, with source-specific gaps still open:

- source coverage resolution;
- canonical entities;
- geographic resolution;
- source refresh strategy;
- persistence rules;
- database design;
- source licensing;
- unresolved source access;
- data quality and conflict handling.

### Technical Design

The reviewed design uses the modular system described in this package and the LOCKED implementation profile in `docs/technology-stack.md`. Exact dependency versions are pinned during implementation; measured resource limits and tuning remain implementation validation work.

---

# 40. Research and Design Rule

Unresolved professional or methodological questions must not be solved by arbitrary assumptions merely to complete documentation.

The required process is:

```text
Research
   ↓
Evaluate Evidence
   ↓
Compare Alternatives
   ↓
Design
   ↓
Document Decision
   ↓
Lock
```

If research cannot resolve an issue, it should be recorded as:

```text
OPEN DECISION
```

with:

- the question;
- why it matters;
- available alternatives;
- evidence;
- trade-offs;
- recommended direction;
- remaining uncertainty.

An open decision should not unnecessarily block unrelated design work.

---

# 41. Project Deliverable and Implementation Boundary

The objective of the current project phase is to produce a sufficiently complete architecture and implementation specification that another developer or team can implement the system without needing to reconstruct the original design intent.

The intended handoff should ultimately contain documentation covering areas such as:

```text
docs/
├── project-overview.md
├── architecture.md
├── data-architecture.md
├── data-persistence-and-lifecycle.md
├── database-design.md
├── analysis-architecture.md
├── validation-architecture.md
├── economic-component-registry.md
├── scenario-engine.md
├── ai-architecture.md
├── api-contracts.md
├── system-design.md
├── performance-and-reliability.md
├── security-privacy-compliance.md
├── output-policy.md
├── implementation-plan.md
├── architecture-verification.md
└── final-architecture-review.md
```

along with supporting research and source documentation.

The exact documentation structure may evolve if a clearer organization is identified.

The current work ends at:

> **Research + Architecture + System Design + Implementation Specification**

The completed project folder will then be handed to another developer/team for implementation.

Application implementation itself is outside the scope of the current work.

---

# 42. Final Project Principle

The system should not attempt to appear more certain than its evidence allows.

Its objective is not to always produce an answer.

Its objective is to produce the most defensible conclusion supported by the available evidence.

The project's central philosophy can therefore be summarized as:

> **AI can propose; data must justify.**  
> **AI proposes; engines validate; AI interprets.**  
> **Recommendation strength must never exceed evidence strength.**  
> **When certainty is not justified, the system must say so explicitly.**
