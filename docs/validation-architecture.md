# Legal, Physical, and Demand Validation Architecture

**Status: FROZEN — included in Architecture Freeze v1.0. Only ACADEMIC_REVIEWED rule packs and validation methods execute in the university demonstration; this is not professional certification.**

## 1. Structured concept

A PotentialUseConcept contains no free-text permission claim. It provides:

- activities with controlled activity/characteristic IDs plus descriptions;
- intensity/capacity characteristics;
- occupancy/use characteristics;
- construction/change-of-use/operational actions;
- physical requirements and tolerances;
- demand hypothesis;
- economic behaviors;
- evidence citations and uncertainties.

Unknown vocabulary items are retained as UNMAPPED, not coerced into the nearest legal class.

## 2. Legal rule model

Each LegalRule contains:

- stable rule_id/version and exact source locator/clause;
- issuing authority, instrument, hierarchy and jurisdiction geometry/admin scope;
- promulgation/effective/repeal dates and amendment/supersession links;
- applicability predicates over activities, characteristics, property interest and location;
- requirement, prohibition, permission, exception or approval-needed effect;
- required inputs, units and calculation method;
- rule-family and criticality;
- curator/reviewer and activation status.

Rule families include land-use/planning, building/use classification, development intensity, setbacks/access, environmental/special overlays, title/interest constraints, licensing/operations and change-of-use. This list organizes rules; it is not a fixed business catalogue.

## 3. Legal evaluation

    concept characteristics
      + resolved property/location/interest
      + active rule packs as of effective date
      -> applicable-rule set
      -> input resolution
      -> rule outcomes
      -> coverage and aggregate status

Each rule outcome is PASS, FAIL, PARTIAL or UNKNOWN with evidence IDs, rule version, missing inputs and explanation. Missing a rule, rule pack, geometry, effective version or required fact yields UNKNOWN. Absence of a discovered prohibition never means permission.

Aggregate PASS requires all critical applicable rules resolved and passed plus coverage of every critical rule family declared applicable for that jurisdiction/concept. FAIL requires at least one verified critical failure. PARTIAL means usable scoped results exist with unresolved nontrivial requirements. UNKNOWN means no defensible determination.

An approval/discretionary permit is represented as APPROVAL_REQUIRED with conditions; it is not PASS.

## 4. Mapping and professional control

AI maps concept text to structured activities/characteristics. A deterministic validator checks schemas and IDs; the rule engine determines applicability. Ambiguous/unmapped activity is sent once for AI repair, then remains UNKNOWN.

Legal packs are curated from authoritative instruments. Academic execution requires a named ACADEMIC_REVIEWED record, jurisdiction coverage statement, amendment search, effective-date test cases, source rights and documented limitations. Qualified Thai professional review is required before any future production/legal-reliance status. Boundary-near cases disclose map precision and may require official confirmation.

EEC rule evidence is an EEC-scoped screen only. It cannot supply nationwide zoning or omitted FAR/OSR/height/setback controls.

## 5. Physical requirement model

Each PhysicalRequirement defines:

- requirement_id/version, semantic type and unit;
- predicate/range or qualitative condition;
- hard/soft/conditional criticality and the condition making it applicable;
- acceptable evidence methods and precision;
- calculation method/version;
- uncertainty handling and verification action.

Families include site/usable area, geometry/shape/frontage, legal and physical access, road characteristics, topography/geotechnical, historical exposure/hazard/environment, utilities, existing structures/condition, circulation/parking/loading, construction/logistics and use-specific capacity.

## 6. Physical evaluation

Evidence is evaluated at its actual precision. Examples:

- a nearby OSM road supports proximity, not legal access or frontage;
- parcel geometry may estimate frontage only when topology/scale quality is accepted;
- historic flood intersection supports past exposure, not annual probability or future hazard;
- surface elevation is not a geotechnical or finished-floor survey;
- missing OSM POI/building data is not proof of absence.

PASS requires evidence meeting the requirement's accepted method/precision. FAIL requires verified incompatible evidence. PARTIAL identifies the satisfied portion. Missing data yields UNKNOWN.

Conditional capacity may be calculated using explicit unresolved assumptions to reveal decision sensitivity, but it is labelled CONDITIONAL and cannot be reused as verified legal/physical evidence.

Physical aggregate PASS requires every applicable critical physical requirement to PASS. Any critical PARTIAL, UNKNOWN or CONFLICTED outcome makes the concept UNVALIDATED at that scope. A verified critical FAIL eliminates only the affected concept variant. Non-critical PARTIAL outcomes remain visible and may affect execution risk without falsely changing the critical result.

## 7. Demand validation

A DemandHypothesis states the customer/occupant population, decision geography, period, demand mechanism, capacity/absorption claim, required observations and counter-evidence that would weaken it. It is not a prose assertion that an area is “growing” or “busy.”

Demand requirements use the same PASS, FAIL, PARTIAL and UNKNOWN states:

- PASS requires an activated, use-family-specific method and evidence whose population, geography, period and measure support the stated hypothesis;
- FAIL requires admissible contrary evidence that contradicts a necessary demand condition under that method;
- PARTIAL preserves mixed evidence, limited coverage or support for only part of the hypothesis;
- UNKNOWN applies when the method, required evidence or comparability basis is absent.

Population, registrations, visitor counts, POIs and regional indices are not converted directly into project capture, occupancy or sales. Any conversion to an economic parameter requires a separately reviewed demand/absorption method, lineage and uncertainty. Missing OSM features do not establish missing demand. Aggregate demand PASS requires all critical demand hypotheses to PASS; a critical PARTIAL, UNKNOWN or CONFLICTED result leaves the concept UNVALIDATED. A demand FAIL eliminates a concept only when the contradicted condition is explicitly critical and the active method defines that implication.

## 8. Applicability, conflict and change

Rule/requirement applicability is recorded separately as APPLICABLE, NOT_APPLICABLE or UNRESOLVED. NOT_APPLICABLE contributes neither PASS nor FAIL. UNKNOWN applicability cannot be used to remove a requirement.

Higher authority, later amendment and more specific applicable rule may resolve a conflict only through a documented hierarchy rule. Other conflicts remain explicit. A rule or property fact change invalidates affected validation results through dependency fingerprints.

## 9. Validator output

ValidationResult includes validator domain/type/version, concept_id, target scope, overall status, applicability outcomes, rule/requirement outcomes, coverage by family, evidence/rule/method references, conflicts, unvalidated items, verification actions and decision impact. Legal, physical and demand results remain separate even when a comparison view summarizes them. The AI explanation may summarize but cannot alter them.

Lifecycle states for rule packs and physical/demand methods are DRAFT, ACADEMIC_REVIEWED and RETIRED. Only ACADEMIC_REVIEWED executes. Its review record contains the reviewer, role, content hash/version, evidence basis, tests, limitations and date. PASS means only that the encoded academic screen passed at the stated scope/version; final output follows output-policy.md.
