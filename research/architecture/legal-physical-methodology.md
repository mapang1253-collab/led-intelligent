# Legal and physical validation: methodology and source verification

Research date: **2026-09-15 (Asia/Bangkok)**. Status: **design recommendation for review; no architecture freeze; no application implementation**.

Authority: the full current [project overview](../../docs/project-overview.md) and the owner's master prompt. This investigation covers legal/physical validation and selected source-access corrections. It does **not** establish a complete, current Thai legal rule corpus or certify any parcel.

Labels used here:

- **Verified document**: the linked publisher's text or service metadata was opened during this investigation; verifies what that document says, not actual operation of an API or current legal completeness.
- **Prior verified research**: an observation in the existing repository, not repeated here.
- **Design recommendation**: a proposed system contract or inference, not a statutory requirement or a validated professional conclusion.
- **Unresolved**: unavailable, untested, ambiguous, or requiring professional/source-owner confirmation.

## 1. Existing-document audit and corrections

Read in full: `docs/project-overview.md`, all four `docs/data-sources/*.md`, and `research/data-requirements-source-investigation/00-treasury-verification.md`, `01-legal-regulatory.md`, `03-physical-site-constraints.md`. Historical observations should remain dated. The following current-design interpretations supersede conflicting recommendations; source observations remain usable within their limitations.

| Existing passage | Correction for current design |
|---|---|
| Legal investigation §5, §7, §8.3: unavailable FAR/height/setback become user-adjustable assumptions | Missing regulation remains **UNKNOWN**. A capacity assumption may support a visibly conditional scenario, but cannot make legal validation pass. The normal user journey does not require professional modeling inputs. |
| Physical investigation §9.2: collect frontage, road width, utilities and other facts as user inputs | Make them optional, progressive requests for facts/documents the user has. First attempt permissible evidence acquisition; retain unknowns if unresolved. A user assertion is not an official survey, legal right, or utility capacity confirmation. |
| Legal investigation §2.1/§8: EEC plan is the applicable Chon Buri plan, based on a dataset listing | The listing is discovery evidence. Establish in-force instrument, amendments, spatial coverage and any superseding local plan for the analysis date. Never extrapolate EEC applicability to Thailand. |
| Legal investigation §2.2: zero PDF text hits means no height/setback/FAR controls in the instrument | Preserve as a bounded extraction observation. OCR/text-search absence cannot prove legal absence, and says nothing about other applicable laws. |
| Treasury source §5 and Treasury investigation §6.3: building assessment is a capex reference anchor | Keep assessment values as assessment context. Do not substitute them into actual construction-cost parameters without separately validated mapping, scope and uncertainty. |
| Treasury investigation §6.1: map-sheet/land-number input gives an exact lookup | A matching source row is not automatically an exact property match. Validate source-key uniqueness, title type, jurisdiction and identity; retain competing matches. Equal assessed price cannot resolve parcel identity. |
| Treasury investigation §4/LED source §12 correction: no direct LED-to-Treasury join | Correct for the tested open CSV. A documented authorized Treasury API has different identifiers/fields (§2 below); LED alone still lacks a required survey number in that documented deed-lookup contract. |
| Physical investigation §8: row labelled “Flood risk” | Rename the specific feature **historical observed flooding, 2005–2016**; no-record is not no-risk. |
| Source notes' headers: other source/architecture files are empty | Historical repository-state observations, not current capability conclusions. |
| OSM source §15 valuation caveat says no building data | Its own §2/§3 report building footprints; correct distinction is no authoritative building use/condition/parcel identity. |

## 2. Treasury and DOL: separate four access channels

### 2.1 Open assessment dataset

**Verified document.** The [data.go.th Treasury land-assessment dataset](https://data.go.th/dataset/land-valuation) describes an assessed-value dataset for state/tax purposes, CSV, four-year update metadata, Open Data Common and no access restriction. Metadata contains different creation, update and publication fields; none alone establishes the valuation-effective period of each row.

**Prior verified research.** The provincial CSV has `UTMMAP1–4`, `UTMSCALE`, `LAND_NO`, `EVAPRICE`; no deed number, area, coordinates or subdistrict fields. Existing verification documents leading-zero loss in the datastore representation and blank prices. This investigation did not redownload the 38 MB Chon Buri CSV or repeat its row count. See [Treasury verification §3.1](../data-requirements-source-investigation/00-treasury-verification.md).

**Design recommendation.** Preserve identifiers as source text; distinguish source-row ID, candidate parcel key and verified parcel identity. An administrative lookup may select the provincial resource but cannot spatially allocate its rows to a subdistrict. A file timestamp is acquisition metadata, not an appraisal-effective date.

### 2.2 Published authorized Treasury API: stronger evidence found

**Verified document.** The [Treasury API specification, v1.9, updated 20 June 2023, hosted by NSO](https://www.nso.go.th/nsoweb/storage/cunsuss_news_form/2024/20240111122129_35594.pdf) documents:

- Pages 3–6: map-sheet/land-number lookup and deed lookup. The latter requires `CHANGWAT_CODE`, `AMPHUR_CODE`, `TUMBON_CODE`, `CHANOD_NO`, `SURVEY_NO`, and a Treasury-issued `KEY`; the description also specifies referrer checking.
- Pages 4–6: returned identifiers, administrative fields, `LAT`, `LONG`, `LAND_AREA` and `EVAPRICE`; the documented land-value unit is THB/square wa.
- Page 9: `PRICE_CONSTR` is assessed building value in THB/m².
- Pages 13–16: a GIS service with `SHAPE` geometry fields and separate zone/title-type entries.

These are **documented capabilities, not tested or authorized access for this project**. Example credentials were not used; no protected data endpoint was called. The document's version is historical. Confirm current contract, credentials, permitted use, geometry type/accuracy and service coverage with Treasury before enabling acquisition. Unit definitions in this API do not by themselves prove semantic equivalence of every open CSV vintage.

**Design consequence.** Define an optional authorized adapter independent of open CSV ingestion. Do not promise a deed-only lookup: the documented route also needs survey number and administrative codes. Do not equate a GIS `SHAPE` field with a surveyed parcel polygon or infer frontage from a point. LED's observed fields lack `SURVEY_NO`; a new authorized API does not create a complete automatic LED join.

### 2.3 Internal Treasury web-application route

**Prior verified research.** `DS_TRANSIT` / `GIS5_Q_PARCEL` were found in application JavaScript; the existing note records session CSRF data and no published usage contract for that route. That observation does not prove either permitted integration or the absence of all other official APIs. Keep this route disabled until the owner provides a permitted interface contract. It is distinct from the published API in §2.2. See [Treasury verification §3.3](../data-requirements-source-investigation/00-treasury-verification.md).

### 2.4 DOL LandsMaps

**Verified document.** The [government catalog record for DOL parcel shapes by deed number](https://gdcatalog.go.th/dataset/gdpublish-mapland-parcel) specifies an organizational request letter, application development and DOL-issued Consumer-Key/Consumer Secret; it advertises a 100,000-request daily organizational allowance. Geographic metadata is national, while the license is unspecified. This is documentation, not evidence of project approval, present API operation, or a guaranteed service level.

**Design recommendation.** Source activation requires permission and an observed authorized sample, including identifier scope, geometry type, CRS, accuracy, vintage, retrieval limits and permitted retention/display. Public LandsMaps browsing and licensed API access are separate capabilities.

## 3. Professional basis and what transfers to Thailand

**Verified document.** [RICS, Valuation of development property](https://www.rics.org/content/dam/ricsglobal/documents/to-be-sorted/valuation-of-development-property---first-edition.pdf), effective 1 February 2020, Appendix A, treats site inspection and enquiries as relevant to environmental/geotechnical conditions, contractual encumbrances, access rights, utilities and off-site works. Planning matters include actual permissions, conditions and validity. Its international methodology must be applied within the local institutional setting. This supports evidence collection and conditional conclusions; it does not supply Thai development-control thresholds.

**Verified document.** [RICS land measurement professional standard](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/land-standards/land-measurement-for-planning-and-development-purposes-global-guidance-note-1st-edition) distinguishes legal ownership area, planning site area and net development area, and recognizes that local jurisdiction requirements may prevail. The source was reissued as a professional standard in April 2023 without material change.

**Verified document.** The [APA Land Based Classification Standards](https://www.planning.org/lbcs/) use multiple dimensions including activities, functions, building types, site-development character and ownership constraints. This is evidence for a multidimensional representation. It is **not** an approved Thai statutory classification or a reason to import a fixed US business catalog.

**Verified document.** [OASIS LegalRuleML 1.0](https://docs.oasis-open.org/legalruleml/legalruleml-core-spec/v1.0/os/legalruleml-core-spec-v1.0-os.html), §§4.2–4.3, represents exceptions, conflicts, alternative interpretations, source correspondence, authority, jurisdiction and legal time. It supplies a useful checklist for rule metadata. Adoption of the full XML interchange standard or its reasoning machinery is not necessary for this MVP.

**Design recommendation.** Use a small typed internal rule representation with those metadata obligations. A qualified reviewer must validate a Thai rule's interpretation and applicability before it becomes executable. Professional research justifies the method; it does not make unreviewed rules “validated.”

## 4. Thailand-wide applicability and legal hierarchy

**Verified document.** The [Town Planning Act B.E. 2562 text on Bangkok's government portal](https://gov.bangkok.go.th/LegalDetail?id=da385b9a-0a61-4c8e-9efc-9fa303717b20) distinguishes national/regional/provincial policy plans from comprehensive/specific land-use plans in §8. Section 37 addresses compliance with comprehensive plans; §50 contains a scoped conflict provision for specific plans and certain local provisions. Section 4 identifies different local authorities, including Bangkok and Pattaya. These examples demonstrate why one generic “national overrides local” sorting rule is inadequate. This reproduction is a research source, not a completeness check for every amendment as of the analysis date.

**Verified document.** [EECO's official FAQ](https://www.eeco.or.th/frequently-asked-questions-faq-th/) describes the EEC land-use plan as prepared under the EEC Act with DPT. The [GISTDA EEC land-use MapServer](https://gistdaportal.gistda.or.th/data/rest/services/EEC_Public/%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%82%E0%B8%A2%E0%B8%8A%E0%B8%99%E0%B9%8C%E0%B9%83%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B4%E0%B8%99/MapServer) is reachable as service metadata. Neither observation establishes the digital layer's legal currency or full applicable rule coverage.

**Prior verified research.** The earlier legal investigation read the 2562 EEC instrument and 2563 amendment from the Association of Siamese Architects' copies, and records an interim/supersession provision. Its tested EEC point queries and DPT listings remain dated evidence. This investigation did not independently re-extract those large plan PDFs. DPT's dataset page could not be fetched through the current browsing tool; do not mark that as proof the service has ceased to exist.

**Design recommendation: applicability graph.** Identify jurisdiction and time before evaluating substantive rules. The graph records instruments, delegated powers, amendments, repeal/supersession, exceptions, transitional provisions and specific precedence citations. Candidate dimensions are:

1. Parent enabling legislation and applicable delegated regulations.
2. Spatial planning instruments and their legal effect; policy documents versus binding controls.
3. Building control and relevant local ordinances.
4. Special-area or sector controls, including environmental, protected-area, transport, water, industrial or occupancy/activity licensing where relevant.
5. Parcel/title/contract constraints and permissions applicable to the proposed act.

This is a **coverage checklist to curate**, not an assertion that this research has verified every listed statute or its applicability. Multiple controls may apply simultaneously. A narrower or newer instrument wins only when its authority and conflict rule establish that outcome. Unresolved conflicts stay unresolved. Never apply “choose whichever is stricter” as an uncited universal legal rule.

Store publication date, effective interval, applicability interval, amendment relationships, source retrieval date, verification date, jurisdiction geometry/version and relevant existing-use/permit dates separately. Preserve original Buddhist-era text and normalized dates. Draft plans may inform a labelled future scenario; they do not silently change current-law validation.

For an AREA-only intake, retrieve possible jurisdictions and area evidence. Do not choose one parcel zone using the subdistrict centroid. A point can support point-zone screening but cannot establish that an entire parcel lies inside one zone. For parcels crossing zones, retain intersections and review how the instrument applies; do not choose the largest overlap automatically. Boundary uncertainty must follow documented source positional accuracy and location uncertainty, not a universal invented buffer.

## 5. Activity and characteristics contract

The following is a **design recommendation**, not an approved finite ontology. Registry IDs denote analytical semantics, not business names. Curators may extend it; unsupported dimensions remain explicit.

| Contract field | Required meaning |
|---|---|
| `concept_id`, `concept_version`, `display_name` | Identity/version; display name never drives legal rules |
| `activities[]` | Stable semantic ID/version; action, object, operating process, people served, material/equipment characteristics; each activity independently evaluated |
| `spatial_program[]` | Buildings/spaces, requested areas and capacity, floor/height characteristics, shared facilities and spatial relationships |
| `operating_characteristics` | Relevant duration of stay, public access, hours, people/vehicle capacity, storage/process materials, emissions/noise and service demands; explicit unknowns |
| `existing_or_proposed` | Existing activity, conversion, new works, extension or conditional future concept; retain timing |
| `classification_assertions[]` | Candidate Thai legal class; cited definition/rule version; supporting facts; mapping status `PROPOSED`, `VERIFIED`, `UNRESOLVED` |
| `physical_requirements[]` | Requirement references with quantities/units, basis and scope (§7) |
| `economic_behaviors[]`, `demand_hypotheses[]` | Link downstream requirements without converting financial behavior into a legal classification |
| `unmapped_characteristics[]` | Dimensions the ontology or rule corpus cannot evaluate |

For example, a dynamically proposed combined charging/workspace/refreshment concept is decomposed into energy provision, public gathering/workspace and food preparation/service, plus proposed equipment, loads, capacities and shared circulation. Those descriptors are examples, not a mandatory candidate list. Its branding does not establish any legal class. A storage activity may require material-specific interpretation; an unknown substance is not implicitly harmless.

AI may propose these mappings with evidence references. The engine checks schemas, ID existence, required characteristics and reviewed definition predicates. Ambiguous mappings may yield several bounded alternatives or `UNRESOLVED`; no model self-certification. Validate the combined proposal as well as its parts, including shared parking, utility capacity and material incompatibility.

## 6. Legal rule representation and evaluation contract

**Design recommendation.** Each activated rule needs the following specification; no production rule code is created here.

| Group | Required fields/semantics |
|---|---|
| Identity | Stable rule ID; immutable revision; pack ID/version; source-instrument ID and clause/annex locator |
| Authority | Issuer; legal authority; subject-matter scope; parent provision; reviewer and review record |
| Time | Publication/effect/applicability intervals; as-of policy; amendment/supersession/transitional links |
| Geography | Coverage IDs/geometry version; location accuracy requirements; spatial membership method |
| Classification | Referenced activity/occupancy definitions and versions; applicability conditions; missing-input behavior |
| Predicate | Typed field references, quantities and units; permitted comparison, boolean, set and reviewed spatial operators; explicit exception predicates |
| Consequence | Prohibition, permission subject to conditions, obligation, parameter limit or referral; scope and necessity |
| Exceptions/conflicts | Explicit precedence link and authority; incompatible interpretations; no missing-data default permission |
| Evidence | Required evidence kind, subject, precision, temporal relevance, acceptable assertion status and provenance |
| Lifecycle | `DRAFT`, `REVIEWED`, `ACTIVE`, `SUSPENDED`, `RETIRED`; review reason, change diff and activation case set |

The expression evaluator uses only reviewed operators and registered fact paths. Never evaluate AI-provided executable text. A numeric limit requires a cited provision and dimensional consistency; a null limit means unresolved rule content, not infinity. An “exemption applies” predicate must positively establish its conditions; unknown exemption facts cannot remove a prohibition or automatically make it certain.

Evaluation sequence: freeze concept/evidence/rule versions → establish scope and applicable rule families → resolve reviewed classifications → evaluate predicates and exceptions → preserve conflict/missing reasons → aggregate by material requirement → emit evidence-backed conclusions. Cache identity includes those frozen versions and analysis date.

Keep **applicability** (`APPLICABLE`, `NOT_APPLICABLE`, `UNRESOLVED`) separate from the four validation states. A definitely inapplicable rule contributes neither pass nor fail. Keep permit/approval facts separate: required, not required, granted, pending, refused, expired or unknown, with conditions and dates. A permitted class is not a granted permit. Pending approval is not an inevitable failure; it is an unresolved condition of execution.

| State | Required meaning within the stated scope |
|---|---|
| `PASS` | Reviewed applicable requirements evaluated and satisfied with admissible evidence; no material unresolved applicability, exception or approval condition in that claimed scope |
| `FAIL` | Positive evidence demonstrates an applicable, material unmet requirement or prohibition, with classification and exception/conflict handling resolved sufficiently to support the conclusion |
| `PARTIAL` | Some relevant requirements are evaluated, while material others remain unresolved or conditional |
| `UNKNOWN` | Relevant evaluation cannot be substantiated, for example unlocated parcel, unreviewed classification, missing rule pack or missing facts |

A verified hard failure remains visible even if other requirements are unknown; report both exclusion basis and incomplete coverage. Empty result sets cannot produce a vacuous pass. A known prohibition with unresolved exemption must be reported as a potential conflict/conditional result, not a conclusive fail. Rule-level pass is never worded as blanket legal approval. The final scope may be “reviewed zoning screen” while full legal validation is partial.

## 7. Physical requirements, measurement and uncertainty

**Design recommendation.** A requirement record specifies `requirement_id/version`, subject (site/building/space/activity), characteristic, operator, quantity/range and units, temporal period, whether essential or optional with a documented reason, dependency IDs, evidence requirements and `basis`. The basis is one of cited regulatory requirement, professional standard, engineered design, observed site condition or explicit scenario assumption. Maintain a source/edition/page or design-basis reference for every claimed requirement.

| Dimension | What the engine can evaluate | What it must not infer |
|---|---|---|
| Land/usable area | Ownership area, planning site area, net development area as distinct measures; evidence-matched deductions | Parcel area × assumed FAR is not verified legal/buildable floor area |
| Shape and envelope | Reviewed geometry, setbacks/easements, obstacle deductions, access/circulation and layout constraints | Area alone proves a feasible layout |
| Frontage | Length of the eligible boundary segment under a specified frontage definition | Nearest-road distance or total parcel perimeter is frontage |
| Access | Physical entrance/route geometry; separately verified public-road status, easement or other legal entitlement | Adjacency to an OSM road grants legal access |
| Road width | Defined carriageway, right-of-way or legally required width as distinct measures | A width tag measures whichever legal width a rule requires |
| Topography/ground | Site survey/ground report where available; coarse terrain context with resolution and datum | DSM pixel gradients prove foundation, cut/fill or geotechnical feasibility |
| Flood/environment | Historical observation, current hazard study, exposure and proposed mitigation as separate evidence | No historical polygon means flood-safe; historic frequency is a return period |
| Utilities | Verified connection/capacity/service conditions and upgrade dependencies | Nearby line means adequate available power/water/drainage |
| Structures | Dated survey/permit/inspection evidence; reuse, adaptation, demolition branches | Footprint implies floors, sound structure, legal occupation or suitable capacity |
| Shared facilities | Space and time allocations for circulation, servicing, parking, safety and utilities across activities | Each activity can consume the same capacity independently |

**Verified document.** [Copernicus DEM documentation](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) describes a surface model including infrastructure, buildings and vegetation; it explicitly distinguishes a terrain model. GLO-30 is a global 30 m instance. Its provider page includes separate source notices for original and adapted data. Use the product/version-specific license and attribution; this is contextual elevation evidence, not a cadastral/topographic survey.

**Verified document.** The [GISTDA recurring-flood layer](https://gistdaportal.gistda.or.th/data/rest/services/FL_Flood/FL_RepeatedFlooding_GISTDA_50k_Y2005_Y2016/MapServer/0) describes 2005–2016 coverage and year/frequency fields. The current metadata visit does not add recent observations or a probabilistic hazard model. The old point-query results remain prior research only.

**Design recommendation.** Geometry calculations retain CRS, transformation method, source accuracy, units, topology validation and geometry version. Do not use degree distances or a general web-map projection for legal area/length conclusions without appropriate measurement treatment. A derived envelope is conditional on all its constraints; overlapping exclusion areas must be unioned before deduction to avoid double subtraction. Source/survey discrepancy remains an evidence conflict rather than silent geometry repair.

Requirements may return a bound instead of an exact capacity. Compare commensurate intervals: a requirement above an established physical maximum can fail that proposal; overlap with an uncertain feasible range remains unresolved/partial. Do not invent tolerances or default dimensions. A design change creates a new version and revalidates legal, physical and financial dependencies. If parking layout, structural capacity or an engineered design is not available, state that its requirement remains unvalidated.

A financial sensitivity scenario using assumed buildable capacity does not back-propagate a physical or legal `PASS`. If only area evidence exists, give area potential analysis and show the missing site-specific requirements. Do not require the user to design a building to obtain any useful output.

## 8. Activation workflow and acceptance examples

**Design recommendation.** This workflow is required to turn researched sources and rule definitions into production analytical claims; it is not a request to pause unrelated architecture work or contact anyone now.

1. Identify the instrument/data owner and current source document. Confirm retrieval, retention, transformation and display rights for the chosen channel.
2. Verify original text, annex/map and effective status, including amendments and local scope. Record what is not covered.
3. Have qualified Thai legal/planning or engineering reviewers interpret relevant provisions/measurements and approve structured mappings. Keep source text, authored interpretation and executable rule separate.
4. Create a bounded activation case set with independent expected outcomes: applicable/inapplicable jurisdictions, exact thresholds, unknown inputs, exemptions, temporal changes, conflicting instruments, boundary cases and hybrid uses.
5. Verify units, identifiers, spatial calculations, rule/evidence lineage and aggregation; source access alone cannot satisfy this stage.
6. Activate the reviewed pack for its documented geography, activities, dates and evidence precision. All other coverage remains partial/unknown.
7. Monitor source/schema/amendment changes; suspend affected claims pending revalidation, invalidate dependent analyses and retain prior versions for reproducibility where permitted.

Minimum acceptance examples for later implementation (specifications, not tests executed here):

- Subdistrict-only request cannot yield parcel zoning or frontage pass.
- Outside EEC, no EEC rule is applied; nationwide architecture still returns available evidence and coverage gaps.
- Validated access geometry but no legal entitlement yields physical route evidence and unresolved legal access.
- Missing frontage yields `UNKNOWN` for that requirement, not infeasible development.
- Explicit prohibition with fully resolved applicability/exceptions excludes that concept version, with supporting clause.
- Unknown exemption, obsolete rule pack or pending material approval cannot yield conclusive current-law pass/fail without qualifying scope.
- Hybrid activities sharing capacity cannot double-count the same spaces/resources.
- Blank Treasury value remains missing, and identical assessed prices do not merge parcels.
- Unknown flood exposure cannot become a zero expected-loss parameter.
- New plan effective date changes applicability for new analyses while previous analysis snapshots retain their actual versions.

## 9. Research and owner decisions remaining

| Item | Alternatives and trade-off | Recommended direction / activation evidence |
|---|---|---|
| **OPEN DECISION: authorized parcel data investment** | DOL/Treasury agreement gives potential exact matching; optional user documents/progressive facts require less integration but more incomplete cases | Seek a suitable authorized channel when project ownership/budget is ready; keep basic analysis usable without it. Written rights, current contract and authorized sample are activation gates. No request has been sent. |
| **OPEN DECISION: professional review arrangement** | Internal qualified reviewer, contracted specialist, or limited unreviewed screening; the last option cannot support legal/engineering certification | Budget for bounded region/activity rule-pack review, expand without changing core ontology. Reviewer qualification and signed scope remain unresolved. |
| **RESEARCH GAP: in-force local and special-area corpus** | Blanket EEC-only screen is simpler but does not cover nationwide or all EEC requirements | Complete jurisdiction-by-jurisdiction instrument inventory, amendment checks and special-area coverage before activating claims. No current-rule completeness asserted. |
| **RESEARCH GAP: physical engineering thresholds** | Universal defaults appear complete but cannot be defended | Obtain use-characteristic and jurisdiction-specific standards/design methods, then encode reviewed requirements. No arbitrary frontage, road-width or slope cutoff is proposed. |
| **RESEARCH GAP: source licenses and digital authority** | Public reachability permits inspection but does not prove commercial redistribution/derivative rights | Verify GISTDA layer rights/currency, DOL/Treasury use grants and future display formats separately. |
| **RESEARCH GAP: API geometry and CSV semantics** | Schema-only implementation is fast but risks wrong identity/units/geometry assumptions | Current authorized sample, geometry type/CRS/accuracy, uniqueness validation, assessment vintage and CSV/API semantic equivalence before exact property claims. |

Access failures during this bounded review: Treasury catalog page timed out; DPT dataset page and EEC OSS pages could not be retrieved through the browser; large EECO annual-report and BMA building-control manual PDFs exceeded its fetch size. Those are access/review gaps, not negative legal facts. Their search snippets were not used to establish numerical legal rules. No account registration, credential acquisition, third-party message, application code, or production integration was performed.
