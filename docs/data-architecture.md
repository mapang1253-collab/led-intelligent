# Data Architecture

**Status: FROZEN — included in Architecture Freeze v1.0 and supersedes the 2026-09-14/15 draft where it conflicts with project-overview.md.**

## 1. Purpose

The data layer establishes what the target is, where it is, which facts apply to it, how each fact was obtained and whether it is fit for an analytical question. Source records are never the domain model.

## 2. Canonical concepts

| Concept | Identity and purpose |
|---|---|
| AdministrativeArea | Versioned province/district/subdistrict identity, names, codes, hierarchy and boundary where licensed |
| LocationAssertion | Area, address, point or geometry asserted by a source/user, with precision and method |
| PropertyCandidate | A possible physical/legal target; multiple candidates may exist until resolved |
| Property | Canonical target established to the supported identity level |
| TitleInterest | Title/right, jurisdiction and identifiers; separate from the physical site |
| Offering | A transaction or auction event involving an interest; separate from Property and price evidence |
| SourceProduct | A dataset/service under one owner, access method, coverage, licence and version |
| SourceRecord | Source-native record and identifiers; immutable per captured version |
| Observation | Target-independent fact with measure, subject, geography, time, provenance and intrinsic quality |
| EvidenceLink | Application of an Observation to a target, question and role, with match/purpose fitness |
| EvidenceConflict | Explicit relation among observations that disagree |
| DerivedFeature | Versioned deterministic transformation of evidence for one analytical purpose |
| RulePack / ComponentPack | Versioned executable legal rules or economic components, separately activated |
| AnalysisRun | Isolated request state and immutable dependency manifest |

Property, title, location and offering are independent. An LED listing can mention several titles; an area input may identify no parcel; one parcel may have several rights or offerings.

## 3. Location and identity

| Level | Meaning | Allowed operations |
|---|---|---|
| ADMIN_AREA | canonical subdistrict/district/province only | area aggregates and area applicability |
| APPROXIMATE_ADDRESS | normalized/geocoded place with uncertainty geometry | coarse spatial context consistent with uncertainty |
| POINT | verified or user-asserted coordinate | point distance and point-in-polygon with assertion disclosed |
| PARCEL | verified parcel geometry linked to parcel/title identity | parcel geometry and parcel rule applicability |

No administrative centroid is used as a property point. A user point is location evidence, not authoritative parcel identity.

Resolution returns MATCHED, POSSIBLE_MATCH, AMBIGUOUS, NO_MATCH or CONFLICT. It records source and normalized identifiers, comparison rules/reference version, candidate set and reasons, agreement dimensions, precision/confidence dimensions and unresolved identifiers.

No concatenated deed string, address or project name is a universal property key. Treasury CSV map-sheet/land-number lookup remains a candidate match until uniqueness and field semantics are verified. The documented authorized Treasury API requires additional administrative/title survey inputs; LED does not provide all of them.

## 4. Observation

| Group | Required fields |
|---|---|
| Identity | observation_id, observation_version, supersedes_id |
| Subject | subject_type, source_subject_ids, canonical_subject_id when resolved |
| Measure | measure_id, value/range, unit, currency, statistic, measure_type, definition_version |
| Geography | admin_area_id and/or geometry reference, granularity, precision, assertion method |
| Time | observed/effective interval, published_at, retrieved_at, source vintage |
| Provenance | source_product_version_id, source_record_id, locator, extraction method |
| Epistemic status | OBSERVED, USER_ASSERTED, DERIVED, ESTIMATED, BENCHMARK or MODEL_ASSUMPTION |
| Intrinsic quality | reliability, completeness, parsing flags, known population/bias |
| Rights | licence grant, attribution, display/derivation/storage flags, expiry |
| Lineage | transformation identifiers and parent observation IDs |

Measure types remain distinct: official_assessment, appraisal, forced_sale_realized, asking, declared_registered, index, count, rate and model_estimate. A generic price field is forbidden.

## 5. EvidenceLink and substitution

Evidence fitness depends on target and question. EvidenceLink stores:

- target and analytical requirement;
- role: PRIMARY, SUPPORTING, CONTEXTUAL, CONTRADICTING or SUBSTITUTE;
- subject match, geography match, temporal match, property similarity and purpose fitness separately;
- requested and actual evidence level;
- adjustment method/version, substitution reason and decision impact;
- disclosure text.

The resolver considers Exact Evidence, Relevant Proxy, Benchmark/Reference and Model Assumption in order, but skips a higher rung that is not fit for purpose. Geographic proximity alone does not establish similarity. A proxy is a new EvidenceLink; it never changes the Observation's subject or epistemic status.

## 6. Quality, completeness and conflict

Quality dimensions remain separate and ordinal with reason codes: source reliability, identity match, geographic relevance, temporal relevance, purpose fitness and record completeness. There is no universal weighted confidence number.

Completeness is evaluated against a versioned RequirementSet for each concept and output scope. It identifies RESOLVED, UNRESOLVED, CONFLICTED and UNSUPPORTED requirements; it is not the percentage of fields populated.

Conflicts are retained. A deterministic rule may choose one value only when documented, such as a newer superseding publication from the same source. Otherwise the engine carries alternative evidence states into sensitivity or marks the requirement CONFLICTED. Authority does not make incomparable measures equivalent.

## 7. Processing and lineage

    Raw capture
      -> parsed source record
      -> normalized observation
      -> resolved identity/location
      -> evidence link
      -> derived feature
      -> validation/scenario/comparison

Analysis reads Observations and EvidenceLinks, never raw payloads. Every derived item has parent IDs, method version, parameters, reference/rule/component versions and an admissibility deadline. Missing remains null with a reason; it is never converted to zero.

## 8. Source-product activation

Every SourceProduct is activated for a named purpose and geography only after:

1. owner and authoritative locator are verified;
2. access is authorized and reproducible;
3. field semantics, units and temporal meaning are verified;
4. coverage and resolution are documented;
5. licence permits acquisition, storage, transformation and display;
6. privacy/minimization is reviewed;
7. update/revision behavior is handled;
8. representative parser/adapter fixtures pass;
9. operational limits/failure behavior are configured;
10. analytical fitness is approved for named questions.

An HTTP success passes none of the semantic or legal gates by itself.

## 9. Current source roles and limits

| Source | Supported role after activation | Must not become |
|---|---|---|
| Treasury | official assessed observations under verified key/unit/cycle; authorized parcel information if contracted | market value, automatic construction cost, deed-only join |
| LED | auction offering/appraisal/result and distressed-liquidity evidence | arm's-length market value, coordinates, unrestricted feed |
| OSM | attributed road/surroundings geometry from controlled extracts | zoning, legal access, proof a missing feature is absent |
| REIC | licensed area/type/period market context | property price, parcel evidence, scraped production feed |
| DOPA/NSO/DIW/MOTS | scoped demographic/economic observations with actual geography/population/period | neighborhood fact when province-level; present population when registered |
| EEC/GISTDA/DPT legal layers | rule applicability for verified version/area | nationwide or complete development-control evidence |
| Historical flood layers | past recorded exposure | prospective probability or engineering flood assessment |

Regional sources populate coverage records. Outside their polygon, period or rule version, they are unavailable rather than national proxies.

## 10. Thailand-wide behavior

Nationwide support means every normalized province/district/subdistrict enters the same contracts and receives an honest result. It does not mean equal evidence coverage. The coverage resolver reports active/inactive products, finest geography, freshness/gaps, the output-scope ceiling and critical legal/physical/financial requirements.

Chon Buri/EEC is a validation region and does not appear in core branching logic or universal rules.

## 11. Gap behavior

| Gap | Behavior |
|---|---|
| No parcel location | continue at area scope; prohibit property-distance/parcel-law claims |
| Ambiguous identity | preserve candidates; optionally seek clarification when it changes scope |
| No complete legal pack | aggregate legal UNKNOWN/PARTIAL; no permission claim |
| Missing frontage/access/geometry | physical requirement UNKNOWN; conditional capacity if useful |
| No arm's-length comparables | no point market-value claim; labelled ranges/context only |
| Missing economic model | UNSUPPORTED_MODEL; no formula invented |
| Missing model parameter | use resolution hierarchy; unsupported if no defensible basis |
| Stale evidence | use only when purpose policy permits, with as-of disclosure |
| Source failure | use admissible cache or mark unavailable; adjust completeness |
| Rights expire/revoke | observation inadmissible for new runs; purge/quarantine as required |

## 12. Open questions

- authoritative nationwide administrative boundaries/history and rights;
- Treasury CSV units/cycle/key uniqueness and institutional API access;
- LED/REIC systematic academic-use rights and permitted retention/display;
- EEC legal layer currency, amendments and licence;
- nationwide legal-rule acquisition and professional review;
- local arm's-length price, rent, construction and operating-cost sources.
