# Phase 3 — Data Requirements Investigation

> **HISTORICAL RESEARCH RECORD.** The active design is docs/data-architecture.md and the owner-approved decisions are in docs/project-overview.md. Investor-profile, LED-only scope and user-configured assumption proposals below are superseded; observations and source gaps remain dated research evidence.

- **Date:** 2026-09-14 (B.E. 2569)
- **Phase:** 3 — Data Architecture (analysis only; no schema, no code)
- **Resulting source-of-truth document:** [`docs/data-architecture.md`](../../docs/data-architecture.md)
- **Inputs read:** `docs/data-sources/{led,osm,reic,treasury}.md`, `research/{led,osm,reic,treasury}/api-investigation.md`. `README.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/system-design.md` were empty.

> **Labels used in this document**
> - **[Src-Verified]** — verified in our source research (cited by file/section).
> - **[Src-Documented]** — documented by the source owner, as recorded in our research.
> - **[Unknown]** — not researched. Used for *every* Treasury capability (see §0).
> - **[Assumption]** — general knowledge or inference, not verified in this repo.
> - **[Proposal]** — an architectural proposal made in this document.

---

## Status update — 2026-09-15 (supersedes the statuses below where they conflict)

The source investigation in [`research/data-requirements-source-investigation/`](../data-requirements-source-investigation/summary.md) changed these requirement statuses. The original analysis below is kept unchanged for traceability.

| Item | Original status (2026-09-14) | Updated status (2026-09-15) | Evidence |
|---|---|---|---|
| §0 Treasury "not researched" | All Treasury capabilities Unknown | **Researched (outside this repo) and re-verified.** National parcel-level assessed land values (Open Data Common, 4-yearly); key = map sheet `UTMMAP1–4`+`UTMSCALE` + `LAND_NO`; no deed no., admin names, area or geometry. Building value per m² by type × province also available. Parcel geometry has **no approved public path** (DS_TRANSIT carries a session CSRF token) | [00-treasury-verification.md](../data-requirements-source-investigation/00-treasury-verification.md) |
| G3 Treasury | Critical — unresearched | **Resolved as research gap.** Remaining: value unit, cycle, key uniqueness | same |
| G2 Legal permissibility | Critical — no source | **Partially available (Chon Buri/EEC):** EEC land-use zone per point (GISTDA ArcGIS) + permitted/prohibited uses per zone type (Royal Gazette 2562, amended 2563). **FAR/OSR/height/setback verified absent** → assumption | [01-legal-regulatory.md](../data-requirements-source-investigation/01-legal-regulatory.md) |
| G7 Local demographics | High — not available | **Largely available:** DOPA registered population by single-year age per tambon (Dec 2568); DIW factory workers by tambon (EEC, monthly); NSO income (province, 2566); MOTS tourism & hotel occupancy (province, monthly). Students: not available | [02-demographics-demand.md](../data-requirements-source-investigation/02-demographics-demand.md) |
| G10 Reference gazetteer / tambon polygons | Critical — tambon polygons missing | **Partially resolved for EEC:** GISTDA EEC tambon polygons with DOPA codes (92 in Chon Buri). National tambon points (DOPA, DGA licence) exist; national polygons still missing | same |
| G9 Flood / hazard | Medium — no substitute | **Available:** GISTDA recurring flood areas 2005–2016 (historical extent, not hazard model) | [03-physical-site-constraints.md](../data-requirements-source-investigation/03-physical-site-constraints.md) |
| G8 Parcel physical facts | High — user input | **Unchanged:** frontage, road width/access, building on parcel, utilities = user input. Elevation (Copernicus GLO-30) available, optional | same |
| G1 Location anchor | Critical | **Unchanged:** no approved public parcel geometry for Chon Buri (GISTDA EEC parcels = raster; DOL API needs credentials; DS_TRANSIT token) | same |
| G4 Property-level market prices | High | **Unchanged**, with one addition: BOT Residential Property Price Index (region-level, mortgage-based) as regional trend evidence | [04-financial-reference.md](../data-requirements-source-investigation/04-financial-reference.md) |
| G5 Income evidence | High — not available | **Mostly unchanged:** rent/opex/cap rate = assumption; **hotel occupancy available** (MOTS, province) | same |
| G6 Cost evidence | High — escalators only | **Partially improved:** Treasury building value per m² by type (reference anchor, not construction cost); TPSO CMI untested | same |
| §6.4 Treasury matching ladder T-L1…T-L4 | Keys Unknown | **T-L1 key known** (map sheet + land no.); **T-L3/T-L4 not supported** by the dataset (no zones, no admin names) | 00 file |
| LED ↔ Treasury | Assumed via deed no. | **Not possible directly** with verified fields | 00 file |

---

## 0. Pre-analysis finding: Treasury has not been researched

> **2026-09-15:** This section's conclusion is **superseded** — see the status update above. The files in this repository were empty, but Treasury had been researched in a separate folder.

At that investigation point, `docs/data-sources/treasury.md` and `research/treasury/api-investigation.md` were **both 0 bytes**. The Treasury files have since been restored and re-verified; this paragraph records the earlier repository state only. The LED, OSM and REIC research likewise recorded that earlier state and marked their Treasury notes as assumptions.

This contradicts the Phase 3 brief ("Treasury — official property/land valuation and parcel-related data … research documents are already in docs/data-sources/"). It is **reported, not fixed** (see §15).

What our repo does record about Treasury, indirectly:

| Fact | Where | Status |
|---|---|---|
| REIC republishes a "Treasury land appraisal, cycle 2566–2569" table (paid) | `research/reic/api-investigation.md` §6.1, §6.2 | [Src-Documented]; content [Unknown] |
| A new Treasury appraisal cycle **2570–2573 takes effect 1 Jan 2570** | REIC H1/2569 press release, `research/reic` §8.1 | [Src-Documented], second-hand via REIC |
| LED asset type `013` = leasehold of Treasury state property (ราชพัสดุ) | `research/led` §3.5 | [Src-Verified] |

Consequences for this phase:

1. Every requirement that Treasury is *expected* to fill is classified **Unknown**, never "Available".
2. No Treasury identifier or join key is assumed. Candidate keys are listed only as **things to verify**.
3. The architecture is designed so it does not *depend* on a particular Treasury granularity: the valuation layer works with parcel-level, zone-level or area-level assessed values, and records which one it got.
4. The appraisal cycle change on 1 Jan 2570 (~3.5 months from today) means any assessed value must carry its **validity period**. Values gathered now expire soon.

---

## 1. Method

We worked backwards:

```
Investment decision
  → analytical questions the decision depends on
    → evidence each question needs
      → raw variables → derived features → analysis/metric
        → which source (if any) can supply it, at what granularity and match quality
          → gaps
```

We did **not** start from the four sources' field lists. Source fields were only consulted in step 5 (coverage), so that "what we need" was not biased by "what we have".

### 1.1 Decision framework chosen: Highest-and-Best-Use tests

The core question — *"จากข้อมูลทั้งหมด การใช้ประโยชน์แบบใดมีศักยภาพสูงสุดสำหรับทรัพย์สินนี้?"* — is, in valuation practice, the **highest and best use (HBU)** question. HBU analysis uses four sequential tests:

1. **Legally permissible** — what the law, zoning and title allow.
2. **Physically possible** — what the site's size, shape, access and condition allow.
3. **Financially feasible** — which of the remaining uses produce a positive return.
4. **Maximally productive** — which feasible use produces the highest value/return.

We adopted this as the backbone for deriving questions because:

- It is **use-agnostic**. It evaluates *any* proposed use; it does not need a fixed list of cafe/rental/hotel. This matches the requirement that the AI Analyst proposes use concepts freely.
- It separates **constraints** (tests 1–2) from **economics** (tests 3–4). This tells us exactly which data is a *gate* (missing it blocks a recommendation) versus which data is an *input to ranking* (missing it widens uncertainty).
- It exposes gaps that source-first thinking hides. None of our four sources addresses test 1 (legal permissibility), and none addresses test 2 at parcel level.

**Rejected alternatives:**

| Alternative | Why rejected |
|---|---|
| Source-first design (one layer per source) | Couples the architecture to the sources we happen to have; hides gaps; the brief forbids it. |
| Fixed use catalogue with a scoring model per use | Contradicts the product principle; cannot handle novel/hybrid uses; bakes assumptions into data. |
| "Location score" first, uses later | A single score conflates legally different questions (access vs demand vs competition) and hides which evidence drove it. |
| Pure ML valuation model | No property-level arm's-length price data exists in our sources to train or validate it (§7). |

### 1.2 The decision stages

| Stage | Purpose | HBU test |
|---|---|---|
| **S0 Establish** | Know exactly what the target is and where it is | Prerequisite |
| **S1 Constrain** | What is allowed and physically possible | Tests 1–2 |
| **S2 Value** | What it is worth and what it costs to acquire | Baseline for test 3 |
| **S3 Understand context** | Access, surroundings, demand, supply, trajectory | Inputs to 3–4 |
| **S4 Generate** | Propose use concepts from evidence | Candidate generation |
| **S5 Test** | Fit and financial consequence of each concept | Tests 3–4 |
| **S6 Decide** | Risk, ranking, sufficiency, investor fit | Test 4 + disclosure |

---

## 2. Analytical questions (derived)

The brief's seven example questions were a starting point. Working through the HBU stages produced **19 questions**. Five did not appear in the examples and turned out to be critical (marked ★).

| ID | Stage | Question | Why the decision needs it |
|---|---|---|---|
| **Q1** ★ | S0 | What exactly is the target — which parcel(s)/unit(s), what kind of right (freehold, leasehold, condo title), and where is it? | Every downstream join depends on it. A wrong parcel invalidates everything. LED items can bundle several deeds. |
| **Q2** | S0 | What are the property's physical characteristics (land area, shape, frontage, existing buildings, condition)? | Physically possible uses; development capacity; valuation. |
| **Q3** ★ | S1 | What rights would an investor acquire, and what encumbrances, occupants or title defects exist? | A use cannot be implemented on a site with no vacant possession or with a leasehold expiring soon. |
| **Q4** ★ | S1 | Which uses and what intensity (floor area, height, coverage) are legally permitted? | HBU test 1. A use that is not permitted cannot be "best". |
| **Q5** | S1 | What physical/environmental constraints exist (access to a public road, flood exposure, topography)? | HBU test 2; also a risk. |
| **Q6** | S2 | What is the official assessed value? | Official reference point; also the base for transfer fees and property tax [Assumption]. |
| **Q7** | S2 | What is the property plausibly worth in the market, and how uncertain is that? | The core valuation question. Needed to judge whether the entry price is a bargain and to value the "as-is" use. |
| **Q8** | S2 | What would it cost to acquire, and on what terms? How does entry price compare with value evidence? | Investment return depends on entry price, not value. LED supplies this directly for auction properties. |
| **Q9** | S3 | How accessible is the location (road hierarchy, transit, distance to centres)? | Drives almost every use concept's demand and value. |
| **Q10** | S3 | What is the character of the surroundings (land-use mix, activity generators, amenities)? | Signals which occupant/customer groups exist and which uses fit the neighbourhood. |
| **Q11** | S3 | How strong is demand, and from whom (buyers, renters, visitors, businesses, workers)? | HBU test 3 depends on demand for the *specific* use. |
| **Q12** | S3 | How much competing supply exists or is in the pipeline? | Demand without supply context produces false positives (oversupplied markets). |
| **Q13** | S3 | In which direction is the relevant market moving? | Return and exit value depend on trajectory; needed to time-adjust old evidence. |
| **Q14** ★ | S4 | Which property + location characteristics create a distinctive opportunity (a demand–supply mismatch, an under-used site, a price dislocation)? | This is where use concepts come from. It must be answerable from features, not from a use list. |
| **Q15** | S5 | For a proposed use concept, does the evidence satisfy its requirements (permitted, physically possible, demand present, competition acceptable)? | Filters AI-proposed concepts before financial modelling. |
| **Q16** | S5 | If the concept is implemented, what are the revenues, costs, capital needs and returns — under which scenarios? | HBU tests 3–4. The Scenario Engine's job. |
| **Q17** | S6 | What risks affect the concept (legal, market, liquidity, physical, execution) and how much do they move the outcome? | Decisions are risk-adjusted; also includes exit liquidity. |
| **Q18** ★ | S6 | Is the evidence sufficient to support the recommendation, and what is missing? | The system must always be able to say "we cannot conclude this". Required by the evidence-disclosure principle. |
| **Q19** | S6 | Which concept is strongest, how robust is the ranking, and does it fit this investor's capital, horizon and risk tolerance? | "Best" is investor-relative; ranking must survive sensitivity analysis. |

**Questions considered and merged:**

- "Exit liquidity" → part of Q17 (risk) and Q8 (auction liquidity signals).
- "Is this a good deal?" → Q8 (entry vs value) + Q16 (returns). Not separate; it is a conclusion, not an evidence question.
- "Time-adjust old evidence" → a method used inside Q7 and Q13, not a question.

---

## 3. Question → evidence → variables → features → analysis

For each question: the evidence needed, raw variables, derived features, analysis/metric, and the evidence-quality issue that dominates it. Sources are covered in §5.

### Q1 — Target identity and location
- **Evidence:** title documents identifying the parcel(s)/unit(s); an authoritative location.
- **Raw variables:** title document type; title/deed number(s); land office jurisdiction (tambon/amphoe/province as on the deed); parcel reference (ระวาง / เลขที่ดิน / หน้าสำรวจ) [Assumption — standard DOL fields]; condo unit number, building, registered condominium name; house number; coordinates or parcel geometry; LED case/lot identifiers where applicable.
- **Derived features:** normalized deed set (multi-deed strings split); canonical admin codes; location anchor (point or polygon) with an **anchor precision class**; identity confidence.
- **Analysis:** identity resolution; cross-source linking; precision classification.
- **Dominant quality issue:** no source verified so far provides coordinates or parcel geometry for a deed [Src-Verified: `led.md` §5–6, `osm.md` §7]. Deed numbers are unique only within a land-office jurisdiction [Src: `led.md` §5, Assumption].

### Q2 — Physical characteristics
- **Raw:** land area (rai/ngan/sq wa; condo m²); asset type; building type, floor area, floors, age, condition; frontage length; plot shape/depth; photos.
- **Derived:** land area in m²; asset class (land / land+building / condo / building-only / leasehold); frontage-to-depth ratio; development capacity (area × permitted intensity — needs Q4).
- **Analysis:** physical-possibility screen per concept.
- **Quality issue:** LED gives area and type only; condo m² sits in the "wa" field [Src: `led.md` §11]; no source gives frontage, shape, building detail or condition.

### Q3 — Rights, title, encumbrance, occupancy
- **Raw:** ownership type (freehold/leasehold/condo); lease term remaining; mortgage/encumbrance status; occupant status; legal remarks; sale "subject to" conditions.
- **Derived:** vacant-possession flag; encumbrance-risk flag; leasehold remaining-term.
- **Analysis:** legal-availability gate; risk adjustment.
- **Quality issue:** LED gives encumbrance and occupant *labels* for LED items only [Src-Verified `led` §3.3]; no general title source; buyer bears title risk [Src `led.md` §13].

### Q4 — Legal permissibility ★
- **Raw:** town-plan (ผังเมือง) zone for the parcel; permitted/prohibited uses per zone; FAR; OSR/coverage; height limits; setbacks; special controls (building control areas, heritage, airport, coastal); road-width rules for building types [Assumption — general Thai regulatory practice].
- **Derived:** permitted-use set (as rules, not as a list of businesses); maximum buildable floor area; binding constraint.
- **Analysis:** legal gate for every concept; capacity for financial model.
- **Quality issue:** **no source**. OSM explicitly is not zoning [Src `osm.md` §16]. REIC's land index *uses* land-use plan as a regression factor but does not publish it [Src `reic` §7.3].

### Q5 — Physical/environmental constraints
- **Raw:** legal road access to the parcel; adjacent road width; flood exposure/history; elevation; utilities; nuisances (industrial, highway noise).
- **Derived:** has-public-road-access flag; flood-risk class; nuisance proximity.
- **Analysis:** feasibility gate; risk.
- **Quality issue:** OSM shows roads nearby but **not** frontage or legal access [Src `osm.md` §5, §16]; no hazard source.

### Q6 — Official assessed value
- **Raw:** assessed land value (per sq wa) and/or condo value (per m²); building assessment; appraisal cycle; validity dates; assessment unit (parcel / zone / road block) [Unknown].
- **Derived:** assessed total value; assessed value per unit area; days until cycle expiry.
- **Analysis:** reference value; ratio entry-price ÷ assessed; transaction cost estimate.
- **Quality issue:** entirely **Unknown** (Treasury not researched). Assessed value ≠ market value [Assumption, widely understood].

### Q7 — Market value
- **Raw:** comparable arm's-length transaction prices (price, date, area, type, location); asking prices; appraisal values of comparables; area price indices; LED realized auction prices (as a *bounded* signal).
- **Derived:** price per sq wa / per m² of comparables; time-adjusted comparable prices; auction-realized ÷ appraisal ratio distributions; value range (low–high) with evidence level.
- **Analysis:** comparable-based range; triangulation of assessed, auction-realized, area trend; uncertainty width.
- **Quality issue:** **no property-level arm's-length price evidence in any source.** LED is forced-sale [Src `led.md` §15.8]; REIC transfer value is aggregated declared value [Src `reic.md` §8]; REIC indices are promotion-adjusted offering prices of *new* stock in BMR/EEC only [Src `reic` §7].

### Q8 — Acquisition cost and terms
- **Raw:** asking/starting price; appraisal lines (enforcement officer, LED appraiser, pricing committee); deposit; auction round dates and per-round status; realized price of prior rounds; encumbrance; transaction fees and taxes (rules).
- **Derived:** effective starting price for the current round; discount to assessed value; discount to market-value range; rounds-without-bidder count (liquidity signal); all-in acquisition cost.
- **Analysis:** entry-price attractiveness; auction-outcome base rates for similar items.
- **Quality issue:** LED only, ~6-month results window and announcement deletion [Src `led.md` §7]; sold items lose price detail; for non-LED targets there is no acquisition-price source (user-supplied).

### Q9 — Accessibility
- **Raw:** road network with classes; rail stations; bus stops; key destinations (CBDs, district centres).
- **Derived:** distance to nearest trunk/primary/secondary road; major-road length in buffer; intersection density; distance to rail station by type; (optionally) travel time.
- **Analysis:** accessibility profile; comparison against the area distribution (percentile within amphoe/province).
- **Quality issue:** best OSM layer [Src `osm.md` §2]; straight-line ≠ travel; **requires a point anchor**.

### Q10 — Surroundings
- **Raw:** POIs by category; building footprints; land-use polygons; tourism/education/health/government facilities.
- **Derived:** POI counts/density by category and radius; category mix/entropy; landuse shares; building density; **mapping-completeness indicator**.
- **Analysis:** neighbourhood profile; activity generators; comparison to area baseline.
- **Quality issue:** POI completeness is highly uneven (Siam vs Nong Chok: health 119 vs 1) [Src-Verified `osm` §2.1]. **Zero ≠ absent.**

### Q11 — Demand
- **Raw:** transfer units/values by type and area; new sales; absorption; foreign buyer activity; rental demand/occupancy; tourism arrivals/occupancy; population, households, growth; daytime/working population; income; footfall/activity proxies; auction bidder activity.
- **Derived:** transfer growth YoY; sales ÷ launches; absorption rate; population density/growth; demand-generator counts (OSM, as proxy); auction sale-through rate.
- **Analysis:** demand strength per occupant group at the finest evidence level available; demand direction.
- **Quality issue:** REIC demand is residential-heavy, area-level, mostly paid [Src `reic.md` §3, §11]; local demographic/income/footfall **not available**; OSM POIs are supply-side proxies at best.

### Q12 — Supply and competition
- **Raw:** unsold inventory; completed unsold; new launches; permits; land allocation permits; competing businesses by category nearby; LED distressed inventory in area.
- **Derived:** months of supply; permit pipeline; competitor count/density for a concept's category; LED listing density in area.
- **Analysis:** supply–demand balance; competitive saturation for a concept.
- **Quality issue:** REIC supply is residential, BMR/EEC/selected provinces, paid; commercial competition only via incomplete OSM POIs.

### Q13 — Market trajectory
- **Raw:** price indices time series; transfers time series; LED auction counts over time; permits over time; macro rates.
- **Derived:** growth rates; momentum; index time-adjustment factor; cycle position.
- **Analysis:** trend direction with coverage caveats; scenario ranges from historical volatility.
- **Quality issue:** indices only BMR/EEC; base-year and method breaks [Src `reic.md` §8]; LED history must be retained by us.

### Q14 — Opportunity signals ★
- **Evidence:** combinations of features, not a new data source. Examples of *signal types* (not uses):
  - high activity generators nearby + low competing supply of a category → unmet demand;
  - strong accessibility relative to area + low price relative to area → price dislocation;
  - land value high relative to existing improvement → under-used site;
  - entry price well below value-evidence range → acquisition dislocation;
  - permitted intensity much higher than current use → redevelopment headroom (needs Q4).
- **Derived features:** relative/percentile features (property vs its area distribution); contrast features (demand-proxy minus supply-proxy); headroom features.
- **Analysis:** signal extraction; AI generates use concepts citing signals.
- **Quality issue:** every signal inherits the weakest component's quality. Relative features need a **baseline area distribution**, which requires consistent area geometry (tambon polygons missing in OSM).

### Q15 — Use-concept fit
- **Evidence:** the concept's requirements (described by dimensions, §6.I) compared with Q2–Q5 and Q9–Q12 evidence.
- **Derived:** requirement-by-requirement satisfied / not satisfied / unknown.
- **Analysis:** fit matrix; the count of "unknown" requirements is itself an output.
- **Quality issue:** requirements such as permitted use (Q4) will usually be "unknown" with current sources.

### Q16 — Financial consequences
- **Raw:** achievable rent/price/revenue per unit for the concept; occupancy/utilisation; operating costs; capex/construction cost per m²; development period; financing rate and LTV; taxes and fees; exit yield/cap rate; holding period.
- **Derived:** NOI; development cost; total investment; IRR; NPV; yield on cost; payback; break-even occupancy; sensitivity.
- **Analysis:** scenario engine (base/downside/upside) with explicit assumptions.
- **Quality issue:** **almost no income or cost evidence in the four sources.** REIC has national HCCI (standard house only), mortgage rates, rental data of uncertain measure (paid), national hotel occupancy [Src `reic` §6.1–6.2].

### Q17 — Risk
- **Raw:** title/encumbrance flags; occupant; zoning (unknown); flood; market oversupply; liquidity (auction no-bid rounds, transfer volume); macro/credit conditions; data quality itself.
- **Derived:** risk flags with severity; downside scenario parameters; liquidity score.
- **Analysis:** risk register per concept; scenario stress.

### Q18 — Evidence sufficiency ★
- **Evidence:** metadata *about* all other evidence.
- **Derived:** per-question coverage (which requirements have evidence, at what match level and quality); blocking gaps; conflicting evidence.
- **Analysis:** sufficiency verdict per question and per recommendation.
- **Quality issue:** only possible if every evidence item carries provenance and match quality (§9).

### Q19 — Ranking and investor fit
- **Raw:** investor capital, financing access, horizon, risk tolerance, operating capability, objective (income/growth/flip) — **supplied by the user**.
- **Derived:** return-per-risk; capital fit; robustness of rank across scenarios.
- **Analysis:** evidence-weighted ranking; sensitivity of ranking.

---

## 4. Conceptual layers — evaluation

Each proposed layer was tested against: *Does at least one question need it? Would merging it into another layer lose a distinction the analysis needs?*

| Layer | Required? | Reasoning | Questions |
|---|---|---|---|
| **A. Property Identity** | **Yes** | Without a resolved identity and location anchor no join is trustworthy. Must distinguish **property** (physical/legal asset) from **title document** (one property can have many deeds; one LED item can bundle several) from **offering** (an LED listing is an event that recurs across rounds and re-listings). | Q1 |
| **B. Property Characteristics** | **Yes** | Physical possibility and valuation. | Q2, Q5, Q15 |
| **C. Valuation** | **Yes** — keep separate *measure types* | The biggest risk in this domain is mixing assessed, forced-sale, asking, declared and offering-index prices as if they were one "price". The layer must keep each price type distinct. | Q6, Q7 |
| **D. Location / Accessibility** | **Yes** | Answers "how reachable". | Q9 |
| **E. Surrounding Environment** | **Yes, separate from D** | Answers "what is around". Different features, different completeness problems (roads are good, POIs are poor). Merging would let good road data mask poor POI data in one score. Shares D's spatial pipeline. | Q10, Q12 |
| **F. Demand / Market** | **Yes** | Test 3. | Q11 |
| **G. Supply / Competition** | **Yes, separate from F** | Demand without supply creates false positives. Different sources: REIC survey stock vs OSM competitors. | Q12 |
| **H. Economic / Demographic** | **Yes, but currently empty at local level** | Demand for most non-residential and rental concepts depends on local population, income, workers, visitors. REIC only has national population & households (paid) [Src `reic` §6.1]. Kept as a layer *because* it is a real requirement; its emptiness is a gap (§8), not a reason to drop it. | Q11, Q14 |
| **I. Potential Use Characteristics** | **Yes — as a descriptor vocabulary, NOT a catalogue** | The AI must describe proposed concepts in comparable terms so they can be tested. A fixed list is rejected. Instead, a concept is described by **dimensions**: target occupants/customers; demand driver type; catchment scale; space and site requirements; legal requirements; revenue model; capex intensity; operating intensity; time to stabilise. Parameter values (rent, occupancy, cost) live in J as evidence or explicit assumptions. | Q14–Q16 |
| **J. Investment / Financial Inputs** | **Yes** | Acquisition terms, revenues, costs, financing, fees/taxes, exit. Split into *observed* inputs (LED price, REIC rates) and *assumptions*. | Q8, Q16 |
| **K. Risk / Constraints** | **Yes — split into K1 and K2** | **K1 Legal & regulatory constraints** (zoning, building controls, title) are HBU *gates*: binary-ish, block concepts. **K2 Risks** (market, liquidity, hazard, execution) are *probabilistic*, adjust outcomes. Different analytical treatment, so different sub-layers. | Q3–Q5, Q17 |
| **L. Historical / Time-Series** | **No as a layer — yes as a cross-cutting dimension + retention policy** | Every layer has a time dimension (assessed value cycles, index series, auction rounds, OSM snapshots). A separate "history" layer would duplicate every other layer. What *is* required: every observation carries observation period and retrieval time, and raw snapshots are retained because LED deletes announcements and REIC silently revises files [Src `led.md` §7; `reic.md` §8]. | Q8, Q13 |
| **M. Evidence / Provenance / Confidence** | **Yes — cross-cutting** | Q18 is impossible without it; the evidence-disclosure principle depends on it. | All, esp. Q18 |

**Layers added that were not in the brief's list:**

| Layer | Why needed |
|---|---|
| **N. Investor Context** | "Best" is investor-relative (capital, horizon, risk, capability). This is user-supplied data, not a source dataset, but the ranking cannot be done without it. (Q19) |
| **R. Reference Framework** (admin-area gazetteer, taxonomies, units, calendars) | **Nothing joins without it.** LED uses inconsistent Thai names and obsolete names (กิ่งอำเภอ…); REIC uses names only; OSM has amphoe polygons but only ~12 % of tambon polygons; LED office codes ≠ admin codes [Src `led` §3.2, §3.6; `osm` §2.1; `reic.md` §6]. Also needed: asset-type crosswalk (LED codes ↔ REIC types), unit conversions (rai/ngan/wa ↔ m²), BE↔CE and fiscal-year calendars, REIC's varying BMR definitions. |

**Layer considered and rejected:** *Offering/Listing* as its own top-level layer. It is kept as an entity type within A (identity) with its price terms in J, because only LED currently supplies offerings and the analytical questions consume it through Q8.

---

## 5. Variable-level coverage by current sources

Classification codes:

- **D** — Available directly
- **I** — Available indirectly / derivable
- **A** — Available only at area level
- **N** — Available through nearby/similar evidence
- **X** — Not available
- **U** — Unknown / requires further research

"Condition" column notes the precondition or scope (e.g., only for LED properties, only with a point anchor, only if licensed).

### 5.1 A — Identity

| Variable | Treasury | LED | OSM | REIC | Best class | Condition / notes |
|---|---|---|---|---|---|---|
| Title document type | U | D | X | X | D (LED items) | Free text [Src `led` §3.3] |
| Deed number(s) | U | D | X | X | D (LED items) | Free text, multi-deed, "(เดิม …)" |
| Deed tambon/amphoe/province | U | D | X | X | D (LED items) | Name normalization required |
| Parcel reference (ระวาง/เลขที่ดิน) | U | X | X | X | U | Not observed in LED [Src `led.md` §6] |
| Condo unit / building / condo name | U | X (uncertain) | X | X (paid project data, U) | U | LED project name not seen in structured fields |
| House number | U | D (partial) | X (68k addresses nationwide) | X | D partial | Many `-`, village-style |
| Coordinates / parcel geometry | U | **X** | **X** (no parcels) | X (paid project coords only) | **X** | Critical gap G1 |
| LED case/lot linkage | — | D | — | — | D | court + red case + lot + deed |
| Admin codes (province/amphoe/tambon) | U | I (province codes likely standard; amphoe unverified) | I (amphoe/province polygons) | X (names only) | I | Needs reference gazetteer (R) |

### 5.2 B — Characteristics

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Land area | U | D | X | X | D (LED items) | Condo m² in "wa" field |
| Asset type | U | D | X | X | D (LED items) | LED codes |
| Building floor area / floors / age | U | X | X (use/floors rarely tagged) | X | X | |
| Building condition | X | I (photos only) | X | X | X | Photos not structured |
| Frontage / shape / depth | U | I (sketch map JPEG, not structured) | X | X | X | |
| Building footprint on parcel | U | X | I (footprints exist; cannot be tied to parcel without geometry) | X | X | |

### 5.3 C — Valuation

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Official assessed value (parcel) | **U** | X | X | U (republished table, paid, content unknown) | **U** | Gap G3 |
| Assessed value zone/area | U | X | X | U | U | |
| Assessment validity cycle | U | X | X | D (cycle 2566–2569 → 2570–2573 via press release) | D (cycle dates) | |
| LED officer / LED appraiser / committee appraisal | — | D | — | — | D (LED items) | 3 verified price lines [Src `led` §3.3] |
| Realized auction price | — | D (~6 months) | — | — | D (LED items); N for similar | Forced-sale bias |
| Arm's-length transaction price (property) | U | X | X | X (aggregated only) | **X** | Gap G4 |
| Asking price (property) | X | X | X | X (aggregated second-hand avg by top-10 provinces) | A | |
| Declared transfer value | X | X | X | A (national/region/top-10 province public; amphoe paid) | A | Declared, not appraisal |
| Price index | X | X | X | A (BMR aggregate; EEC by 3 provinces) | A | Offering price, new stock |
| Land price index | X | X | X | A (BMR 6 prov; EEC) | A | Juristic transfers ≥200 sq wa |

### 5.4 D/E — Location, accessibility, surroundings

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Road network & class | X | X | D | X | D | Requires point anchor for property features |
| Legal road access / frontage | U | X | X | X | X | OSM ≠ legal access |
| Rail stations | X | X | D | X | D | |
| Bus stops | X | X | D (very incomplete) | X | D weak | |
| Travel time | X | X | I (routing engine on OSM) | X | I | Routing not researched |
| POIs by category | X | X | D (uneven completeness) | X | D weak | |
| Land use (actual) | X | X | D (patchy) | X | D weak | Not zoning |
| Building density | X | X | D | X | D | Use rarely tagged |
| Admin polygons province/amphoe | X | X | D | X | D | |
| Tambon polygons | U | X | X (~12 %) | X | **X** | Gap G10 |
| Area-level POI density (no anchor) | X | X | I (amphoe polygon) | X | A | Fallback when no point |

### 5.5 F/G/H — Demand, supply, economy

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Residential transfers (units/value) | X | X | X | A | A | Province public for top-10; amphoe paid |
| Non-residential transfers | X | X | X | A (national) | A (national) | |
| New sales / launches / unsold / completed unsold | X | X | X | A (BMR/EEC/selected provinces, paid); project-level paid | A | |
| Absorption rate | X | X | X | A/project (R-MAT paid) | A | |
| Building / land allocation permits | X | X | X | A (national; province uncertain) | A | Estimated values |
| Foreign condo demand | X | X | X | A | A | |
| Rental levels / rental demand | X | X | X | U (rental housing data, paid, measure unknown) | **U** | Gap G5 |
| Hotel occupancy / tourists | X | X | X | A (national, monthly) | A (national) | |
| Auction supply & sell-through | X | D (per item) / A (open data national) | X | A (LED share of second-hand listings) | D/A | Double counting risk |
| Competitor count by category | X | X | D (weak) | X | D weak | Completeness indicator required |
| Population / households | X | X | X | A (national, annual, paid) | A national | Gap G7 |
| Income / purchasing power | X | X | X | X | **X** | Gap G7 |
| Daytime/worker population, footfall | X | X | X (weak proxy via POIs) | X | **X** | Gap G7 |
| Business activity | X | X | I (POIs, weak) | X | I weak | |

### 5.6 I/J — Use concepts and financial inputs

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Use-concept descriptor vocabulary | — | — | — | — | X (we define it) | Reference data we author |
| Acquisition price (LED property) | — | D | — | — | D | |
| Acquisition price (non-LED property) | X | X | X | X | X | User-supplied |
| Deposit, auction schedule | — | D | — | — | D | |
| Transfer fees / tax rules | U | X | X | A (registration fee aggregates only) | X (rules) | Regulatory reference, not data feed |
| Revenue per unit by use | X | X | X | X (except residential asking aggregates) | **X** | Gap G5 |
| Opex by use | X | X | X | X | **X** | Gap G6 |
| Construction cost by building type | X | X | X | A (HCCI standard house; material price index) | A weak | Gap G6 |
| Mortgage / policy rates | X | X | X | A (national) | A | Some public headlines |
| Exit yields / cap rates | X | X | X | X | **X** | Gap G5 |

### 5.7 K — Constraints and risks

| Variable | Treasury | LED | OSM | REIC | Best class | Notes |
|---|---|---|---|---|---|---|
| Zoning (ผังเมือง) | U | X | X | X | **X** | Gap G2 |
| Building control rules | X | X | X | X | **X** | Gap G2 |
| Encumbrance / mortgage | U | D (LED items) | X | X | D (LED items) | |
| Occupant | X | D (label) | X | X | D weak | |
| Leasehold terms | U | D (type only) | X | X | I | Remaining term not structured |
| Flood / hazard | X | X | X | X | **X** | Gap G9 |
| Market oversupply | X | X | X | A | A | |
| Liquidity | X | D (no-bid rounds) | X | A (transfer volume) | D/A | |
| Planned infrastructure | X | X | I (under-construction tags, inconsistent) | X | X | Gap G11 |

---

## 6. The matching problem

### 6.1 Why matching is hard

- **Only LED supplies property-level records we have verified**, and LED has no coordinates [Src `led.md` §6].
- **OSM joins only by geometry** [Src `osm.md` §8].
- **REIC joins only by area + property type + period** [Src `reic.md` §9].
- **Treasury's join key is Unknown.**
- There is **no identifier shared** by any two of the four sources except admin *names*, which are inconsistent.

So "matching" is really three different problems:

| Problem | Nature | Output |
|---|---|---|
| **Identity resolution** | Is this record the *same property*? | same / possibly same / different |
| **Spatial anchoring** | *Where* is the property, and how precisely? | point/polygon + precision class |
| **Evidence relevance** | How *close* is this evidence to the target (space, type, time, measure)? | match level + distance measures |

Treating these as one problem is the main way systems silently promote area evidence to property evidence.

### 6.2 Target intake modes

The system cannot assume the user arrives with an LED listing.

| Mode | User provides | Identity strength | Location strength |
|---|---|---|---|
| T1 | An LED listing (selected in system) | Deed set + deed admin + case/lot | Admin names only |
| T2 | Title info (deed type/no. + jurisdiction) | Parcel-level *if* a parcel source exists | Admin names only |
| T3 | Map pin / coordinates | Weak identity (no deed) | Point, user-asserted |
| T4 | Address text | Weak | Poor (Nominatim fails on rural addresses [Src-Verified `osm` §2.2 N3]) |
| T5 | Area only (tambon/amphoe/province) + type + size | None | Area |
| T6 | Condo name + unit | Project-level | Depends on project location source |

**Proposal:** combine modes (e.g., T1 + T3 — an LED listing plus a user-confirmed pin) and record each assertion as evidence with its origin (source record vs user-asserted).

### 6.3 Location anchor precision classes [Proposal]

| Class | Meaning | Allowed feature computations |
|---|---|---|
| P1 Parcel geometry | Authoritative polygon | All spatial features, frontage estimates |
| P2 Verified point | Point confirmed against a parcel/map source | Radius features at all radii |
| P3 User-asserted point | Pin dropped by user, unverified | Radius features, flagged "user-asserted location" |
| P4 Geocoded proxy point | Nominatim result = nearest named object/village | Only large radii (≥ 2–3 km), flagged |
| P5 Tambon | Admin area, no point | Area-level features only |
| P6 Amphoe | | Area-level features only |
| P7 Province | | Area-level features only |

**Rule [Proposal]:** radius/nearest features must **never** be computed from an admin-area centroid. That fabricates precision. Below P4, the system switches to area-level aggregates and labels them as such. (Rejected alternative: centroid-based radius features — rejected because OSM's own test showed a tambon query returned the TAO office building, not the tambon [Src-Verified `osm` §2.2 N6].)

### 6.4 Per-source matching ladders

**Treasury** — [Unknown — to verify in Treasury research]

| Level | What would match | Candidate key (unverified) |
|---|---|---|
| T-L1 | Same parcel's assessed value | Title type + number + land-office jurisdiction, or parcel reference — **to verify** |
| T-L2 | Same condo building/unit | Condo registration identifiers — **to verify** |
| T-L3 | Assessment zone / road block containing the property | Requires location — **to verify whether Treasury uses zones** |
| T-L4 | Area-level assessed-value summary | Admin area — **to verify** |

**LED**

| Level | Match | Key | Use |
|---|---|---|---|
| E-L0 | Same offering (announcement ↔ result ↔ round) | court + red case no./year + lot–sub-item + deed | Auction history of *this* item [Src-Verified on one example `led` §4] |
| E-L1 | Same property, different offering (re-listing) | deed set + deed tambon/amphoe/province (+ title type) | Prior prices of the same asset |
| E-L2 | Partial overlap (shared deed in multi-deed item) | deed intersection + admin | Weak identity; flag |
| E-L3 | Similar property, same tambon | tambon + asset type + size band | Comparable auction outcomes |
| E-L4 | Similar property, same amphoe | amphoe + type + size band | |
| E-L5 | Same province | province + type | |
| E-L6 | National aggregates (open data) | asset type + month | Trend only |

Note: for LED, "nearby" means **administratively co-located**, never metric distance, because LED has no coordinates. The ladder must say so.

**OSM**

| Level | Match | Requires |
|---|---|---|
| O-L1 | Features around the property (radius / nearest) | Anchor P1–P3 (P4 restricted) |
| O-L2 | Amphoe aggregate | Amphoe code ↔ OSM polygon |
| O-L3 | Province aggregate | Province polygon |
| (tambon) | **Not available** from OSM | ~12 % tambon polygons |

**REIC**

| Level | Match | Access |
|---|---|---|
| R-L1 | Same/nearby project (condo or housing estate) | Paid project data with coordinates; spatial match only; **never** to LED/Treasury parcels by name |
| R-L2 | Amphoe/khet | Paid R-MAT transfers |
| R-L3 | Province | EEC indices (3 provinces); top-10 provinces in press releases; member tables |
| R-L4 | REIC zone (BMR variant, region) | Must record which BMR definition |
| R-L5 | National | Public headlines, macro |

Plus two non-spatial match dimensions that apply to REIC (and to LED similar-evidence): **property-type alignment** (exact / related / generic) and **period alignment** (same period / lagged / time-adjusted).

### 6.5 Combined hierarchy

```
User Investment Target (T1–T6)
   │
   ├─ Identity resolution ── LED E-L0/E-L1 ── Treasury T-L1/T-L2 [Unknown]
   │
   ├─ Spatial anchoring ──── P1 … P7   (source record / Treasury? / user pin / geocoder)
   │
   └─ Evidence relevance, per question:
        Property level  : Treasury T-L1 [U] · LED E-L0/L1 · OSM O-L1 (needs P1–P3)
        Near/similar    : Treasury T-L3 [U] · LED E-L3 · REIC R-L1 (projects only)
        Subdistrict     : Treasury T-L4 [U] · LED E-L3
        District        : LED E-L4 · OSM O-L2 · REIC R-L2 (paid)
        Province        : LED E-L5 · OSM O-L3 · REIC R-L3
        Market zone     : REIC R-L4
        National        : LED E-L6 · REIC R-L5
```

**Selection rule [Proposal]:** for each question, use the most specific evidence that meets a minimum quality, **retain** coarser evidence as context, and **disclose** the level used. Never relabel coarser evidence as property-level. When the most specific level is missing, the output says "no property-level evidence; using {level}".

### 6.6 Double counting

REIC's second-hand listing supply includes LED listings (LED 61,646 units, Q2/2569 [Src `reic` §8.2]). Any demand/supply feature combining LED inventory with REIC second-hand listings must mark the overlap. **Proposal:** evidence objects carry an `overlaps_with` relationship so analysis can avoid summing overlapping populations.

---

## 7. Can the four sources support an MVP?

### 7.1 Decisions the system could make reliably

Conditions: LED extraction is legally permitted; a location anchor exists for OSM features; REIC data is used within licence.

| Decision | Why reliable |
|---|---|
| **What distressed properties are purchasable, when, at what starting price and terms** (LED items) | Direct, per-item, official [Src-Verified] |
| **Auction-outcome base rates** for similar items in the same amphoe/province (sell-through, realized ÷ appraisal) | Direct, per-item results — *if we retain snapshots* (~6-month window) |
| **Entry price vs LED's own appraisals** | Direct |
| **Title/encumbrance/occupancy flags as declared in the LED announcement** | Direct, but not a substitute for due diligence |
| **Road and rail accessibility profile** | OSM's best layer — *only with anchor P1–P3* |
| **Area-level market direction for residential property in BMR/EEC** | Documented REIC indices/transfers — area level, new-stock offering prices |
| **Administrative classification** of the property (province/amphoe; tambon by name) | With a reference gazetteer |

### 7.2 Decisions that would remain weak

| Decision | Why weak |
|---|---|
| Market value of the property | No arm's-length property-level prices; triangulation from forced-sale + area indices + (unknown) assessed value only gives a wide range |
| Official assessed value | Treasury unresearched — could become reliable or remain unavailable |
| Surroundings / amenity profile outside city cores | OSM POI completeness |
| Residential demand below province level / outside BMR-EEC | REIC granularity and paid access |
| Competition for non-residential concepts | OSM POIs only |
| Market trajectory outside BMR/EEC | No REIC index |
| Use-concept generation | Signals exist (access, entry price, area market) but lack demographic, income and legal inputs; concepts would be hypotheses |

### 7.3 Questions that could not be answered

| Question | Missing |
|---|---|
| Q4 Legal permissibility | Zoning / building controls |
| Q5 (part) Road access, flood exposure | Parcel access, hazard |
| Q2 (part) Frontage, building condition | Physical site facts |
| Q16 Financial feasibility of a use | Revenue, rent, occupancy, opex, capex by use |
| Q11 (part) Who the local customers are | Population, income, workers, visitors at local level |
| Q1 for non-LED targets | Parcel geometry/location source |
| Q19 Investor fit | Investor profile (user input — easy to collect, but not a source) |

### 7.4 Verdict

With only Treasury, LED, OSM and REIC, the first serious version can reliably be an **evidence-backed opportunity screening tool for auction (LED) properties**:

- *"Here is what this property is, what it costs to acquire, how that compares with the appraisals, how similar auction items performed, how accessible the location is, and how the surrounding market is moving — at these evidence levels."*

It **cannot** reliably deliver a *validated* "Best Potential Use" recommendation, because HBU tests 1 (legal), 2 (physical, at parcel level) and 3 (financial) each lack required inputs. The AI Analyst can still propose use concepts, but they must be labelled **hypotheses** with the missing requirements listed (Q15, Q18). The Scenario Engine can run, but only on **explicit assumptions**, which must be visibly labelled as assumptions rather than evidence.

---

## 8. Data gaps

Importance scale: **Critical** (blocks a core decision) · **High** (makes a core decision unreliable) · **Medium** (weakens specific concepts or areas) · **Low** (refinement).

### G1 — Property location anchor (coordinates / parcel geometry) — **Critical**
- **Missing:** a trustworthy point or polygon for the target.
- **Needed by:** Q1, Q5, Q9, Q10, Q12, Q14; indirectly everything OSM-based.
- **Why:** without it, OSM is limited to amphoe/province aggregates; "near the station" or "on a main road" cannot be stated.
- **Derivable?** No. LED has none; OSM cannot resolve deeds; Nominatim fails on rural addresses [Src-Verified].
- **Substitute?** Partly: **user-asserted pin (P3)**, if labelled; area-level features (P5–P7).
- **External source type if not:** cadastral/parcel geometry source (DOL LandsMaps named in research, not investigated), or Treasury *if* it exposes parcel/zone geometry [Unknown].

### G2 — Legal permissibility (zoning, building controls) — **Critical**
- **Missing:** permitted uses and intensity for the parcel.
- **Needed by:** Q4, Q15, Q16 (buildable area), Q17.
- **Why:** HBU test 1. A recommendation for a non-permitted use is not just weak — it is wrong.
- **Derivable?** No.
- **Substitute?** Only very partially: OSM *actual* land use shows what exists, not what is allowed. User/analyst-entered zoning (from a town-plan map) with low-to-medium confidence is a possible interim path.
- **External source type:** town-planning (ผังเมือง) zone maps and rules; building control regulations as a rules reference.

### G3 — Official assessed value (Treasury) — **Critical until researched**
- **Missing:** everything about Treasury: coverage, granularity, identifiers, access, licence.
- **Needed by:** Q6, Q7, Q8 (discount), J (transaction cost basis [Assumption]).
- **Why:** it is the only *official non-distressed* value reference in our planned set.
- **Derivable?** No. **Substitute?** LED appraisal lines exist for LED items only — different methodology.
- **Action:** complete Treasury source research (not a new source; it is a planned source that was never documented).

### G4 — Property-level arm's-length market price evidence — **High**
- **Missing:** comparable transaction or asking prices for individual properties.
- **Needed by:** Q7, Q8, Q14 (price dislocation), Q16 (exit value).
- **Derivable?** Only a range by triangulation: assessed value [U] + LED realized prices (forced-sale) + REIC area aggregates/indices.
- **Substitute?** Area-level averages (REIC declared transfer value per unit, paid); LED similar-item outcomes. Both must be labelled non-market or area-level.
- **External source type:** property-level transaction or listing data (registered transactions or listing platforms).

### G5 — Income evidence: rents, revenue, occupancy, yields by use — **High**
- **Missing:** what a use actually earns in this area.
- **Needed by:** Q16, Q19; partly Q11.
- **Why:** HBU test 3–4 is a comparison of returns. Without income evidence every scenario is assumption-driven.
- **Derivable?** No. REIC rental housing data exists but measure/coverage **Unknown**; hotel occupancy national.
- **Substitute?** National/regional parameters as scenario ranges, clearly labelled; user-provided rent quotes.
- **External source type:** rental listing/rent-level data; sector operating benchmarks.

### G6 — Cost evidence: construction, fit-out, operating cost by use — **High**
- **Missing:** capex per m² by building type; opex ratios.
- **Needed by:** Q16.
- **Derivable?** Weakly: HCCI (standard house) and material price index as *escalators* only.
- **Substitute?** Parameter tables maintained as explicit assumptions with a stated basis.
- **External source type:** construction cost benchmarks; operating benchmarks.

### G7 — Local demographic & economic demand drivers — **High** for non-residential and rental concepts; **Medium** for residential sale
- **Missing:** population, households, growth, income, workers/daytime population, visitors at tambon/amphoe level.
- **Needed by:** Q11, Q14, Q15.
- **Derivable?** No. OSM POIs/buildings are weak proxies biased by mapping effort.
- **Substitute?** Province-level or national figures (coarse); OSM building density as a physical-density proxy with a completeness flag.
- **External source type:** official population/household statistics at tambon/amphoe; income statistics; tourism statistics by province.

### G8 — Parcel physical facts (frontage, shape, road access, building details, condition) — **High**
- **Missing:** see Q2, Q5.
- **Derivable?** Partly from parcel geometry (if G1 solved) + OSM roads: frontage *estimate*, not legal access.
- **Substitute?** User/analyst input from site inspection; LED photos/sketches (unstructured).
- **External source type:** parcel geometry (same as G1); site inspection data.

### G9 — Hazard exposure (flood etc.) — **Medium**
- **Needed by:** Q5, Q17.
- **Substitute?** None from current sources.
- **External source type:** flood/hazard maps.

### G10 — Reference gazetteer: admin codes, historical names, tambon polygons — **Critical (enabler)**
- **Missing:** a canonical admin-area code list with name variants and history, and tambon boundaries.
- **Needed by:** every cross-source join; relative features (Q14).
- **Derivable?** Province/amphoe polygons from OSM; LED province codes appear standard; amphoe code equivalence unverified [Src `led` §3.6].
- **Substitute?** Amphoe-level joining without tambon polygons — works but coarsens everything.
- **External source type:** official administrative code list and boundaries. This is **reference data**, not an analytical source, and without it the four sources cannot be combined.

### G11 — Planned infrastructure — **Medium**
- **Needed by:** Q13, Q14 (future accessibility uplift).
- **Substitute?** OSM under-construction tags (inconsistent).
- **External source type:** official infrastructure project plans.

### G12 — Title and legal status for non-LED targets — **Medium** (MVP-scoped to LED) / **High** later
- **Needed by:** Q3.
- **Substitute?** User-declared, flagged.
- **External source type:** land registry information.

### G13 — Investor profile — **Medium** (easy)
- **Needed by:** Q19.
- **Substitute:** none needed; collect from the user. Not an external source.

### G14 — Retained history of LED offerings — **Medium**
- **Missing:** history beyond ~6 months and after announcement deletion.
- **Derivable?** Only if **we** snapshot over time from day one [Src `led.md` §7]. Cannot be recovered retroactively.

### G15 — Local commercial activity / footfall — **Medium**
- **Needed by:** Q11, Q12 for retail/F&B/service concepts.
- **Substitute?** OSM POI mix with completeness indicator.

### Gap ranking

| Rank | Gap | Importance | Resolvable within current four sources? |
|---|---|---|---|
| 1 | G10 Reference gazetteer | Critical (enabler) | Partially (OSM amphoe/province); tambon no |
| 2 | G1 Location anchor | Critical | No (user pin as interim) |
| 3 | G3 Treasury unresearched | Critical | **Yes — research it** |
| 4 | G2 Legal permissibility | Critical for HBU | No |
| 5 | G4 Property-level market prices | High | No (triangulated range only) |
| 6 | G5 Income evidence | High | No (REIC rental data Unknown) |
| 7 | G8 Parcel physical facts | High | No (user input) |
| 8 | G6 Cost evidence | High | Weakly (escalators) |
| 9 | G7 Local demographics/economy | High (use-dependent) | No |
| 10 | G14 LED history retention | Medium | Yes — by our retention policy |
| 11 | G12 Title for non-LED | Medium | No |
| 12 | G9 Hazard | Medium | No |
| 13 | G15 Local commercial activity | Medium | Weakly (OSM) |
| 14 | G11 Planned infrastructure | Medium | No |
| 15 | G13 Investor profile | Medium | Yes — user input |

---

## 9. Evidence object — design reasoning

### 9.1 Key design insight: split Observation from Evidence Link

The same REIC index value is evidence for thousands of targets, each at a different match level. The same LED auction price is **strong** evidence for "acquisition price" (Q8) and **weak** evidence for "market value" (Q7). Therefore:

- An **Observation** is a target-independent fact: *what* was measured, *about what subject*, *from where*, *when*, with its intrinsic quality.
- An **Evidence Link** attaches an observation to a specific target and question: *how closely* it matches, *for what purpose*, *how fit* it is for that purpose.

**Rejected alternative:** a single evidence record with one confidence score. Rejected because confidence is not a property of a fact alone — it depends on target and purpose. A single score would either overstate LED prices for valuation or understate them for acquisition.

**Rejected alternative:** one numeric confidence formula now. Rejected as premature; the components are defined now, and the combination rule stays open (§OQ).

### 9.2 Conceptual contents

**Observation (target-independent)**

| Group | Information | Why |
|---|---|---|
| Identity | Observation ID; version | Revisions (REIC "edit" files) |
| Source | Source system; product/tier (public, member, paid); document/record reference; retrieval method (open-data API, public page, manual, user input, derived) | Provenance, licence, reproducibility |
| Subject | Subject type (parcel, title, condo unit, offering, project, admin area, market zone, national); subject identifiers as given by source; normalized subject reference | Distinguishes property facts from area facts |
| Measure | Variable (from a controlled vocabulary); value; unit; currency; **measure type** (assessed, officer appraisal, forced-sale realized, asking, declared registered, offering-price index, count, proxy, model estimate, user-asserted, assumption); statistic (point, mean, median, index, share); sample size where known; property-type segment | Prevents mixing price types; enables correct aggregation |
| Time | Observation period (start/end); as-of date; validity period (e.g., appraisal cycle); publication date; retrieval date | Staleness, time adjustment, cycle expiry |
| Spatial | Geometry or admin reference; **spatial precision class** | Match computation |
| Intrinsic quality | Source reliability class; known biases (forced-sale, new-stock-only, mapping completeness, purposive sample); completeness indicator; parsing/cleaning flags | Disclosure |
| Epistemic status | Observed / derived / estimated / user-asserted / assumption | AI must never present an assumption as a finding |
| Lineage | Raw snapshot reference; transformation steps and version | Auditability |
| Relations | Overlaps-with (double counting); supersedes/superseded-by; conflicts-with | Avoid double counting; manage revisions |
| Use constraints | Licence; attribution text; display/commercial permission; personal-data flag | LED CC BY-NC & website notice; REIC terms; ODbL; PDPA |

**Evidence Link (target- and question-specific)**

| Group | Information | Why |
|---|---|---|
| Target | Target reference | |
| Question / purpose | Which analytical question(s); role (primary / supporting / contextual / contradicting) | Traceability from recommendation back to evidence |
| Match level | Level on the relevant ladder (§6.4) | Disclosure |
| Match method | Deed key / spatial / admin name / user assertion / similarity | Explain how it was linked |
| Match distances | Spatial distance or admin hops; property-type similarity; time gap; size/segment similarity | Weighting |
| Purpose fitness | How valid this measure type is for this purpose (e.g., forced-sale price for market value = low) | Separates validity from reliability |
| Adjustments | Time adjustment, unit conversion, size normalization applied | Transparency |
| Confidence components | Source reliability × match quality × purpose fitness × recency × completeness — **kept as components** | Combination rule open |
| Disclosure text | Human-readable caveat | Shown to user/AI |

---

## 10. Layered flow — reasoning

| Layer | Contains | Does NOT contain | Why a separate layer |
|---|---|---|---|
| **Raw** | Exact source payloads as retrieved (HTML, CSV, PDF, extract files) + retrieval metadata | Interpretation | LED deletes announcements; REIC revises files; OSM changes daily. Only raw snapshots allow re-processing and audit. **Open:** personal data in LED raw pages (PDPA) — whether raw can be stored, or must be redacted at capture. |
| **Cleaned** | Parsed, typed records; BE→CE dates; split multi-deed strings; numbers repaired (e.g., `1.15067E+11` flagged as precision loss); personal fields removed; parse-quality flags | New meaning, cross-source joins | Separates *format* problems from *semantic* problems. |
| **Normalized** | Records mapped to canonical vocabularies: admin codes, asset-type crosswalk, units, measure types, periods; still one record per source fact | Target-specific matching | Makes sources comparable **without** pretending they are the same thing. Each keeps its measure type. |
| **Matched Evidence** | Observations + Evidence Links to a target | Aggregated features | This is where precision is decided and disclosed. |
| **Features** | Question-oriented derived variables (e.g., discount to appraisal, distance to rail, months of supply, completeness indicators), each inheriting quality from its evidence; missing ≠ zero | Judgments/recommendations | Features are reusable across concepts and auditable back to evidence. |
| **Analysis** | Deterministic metrics: value range, comparables, fit matrices, scenario outputs, sensitivity, sufficiency verdicts | Free-text reasoning | Reproducible; the Scenario Engine lives here. |
| **AI Reasoning** | Use-concept hypotheses, argumentation citing evidence/feature/analysis IDs, uncertainty disclosure, requests for missing evidence | New facts | The AI may only assert what exists below it; anything else must be marked assumption or hypothesis. |

**Feedback loop [Proposal]:** AI proposes a concept → concept is described with I-layer dimensions → the system derives the evidence the concept needs → coverage check (Q15/Q18) → Scenario Engine runs with evidence + labelled assumptions → results return to the AI. The use concept is never a lookup in a fixed table.

---

## 11. Additional data — recommendations (after analysis)

Principle: add a category only if it closes a **Critical/High** gap for a decision the MVP intends to make, and no substitute exists.

| Category | Recommend? | Justification | Timing |
|---|---|---|---|
| **Treasury source research** | **Yes — mandatory** | Planned source never documented; Critical gap G3 | Before schema design |
| **Admin reference gazetteer** (codes, name variants, tambon boundaries) | **Yes — required** | Enabler G10; without it the four sources cannot be joined | MVP |
| **Parcel location / geometry** | **Yes — required for property-level spatial analysis** | G1; interim: user-asserted pin (P3) | MVP interim via user pin; source research next |
| **Zoning / town planning** | **Yes — required for any "Best Use" recommendation** | G2, HBU test 1 | Before claiming validated recommendations; interim: user/analyst-entered, labelled |
| **Rental / income evidence** | **Yes, for financial validation** | G5 | Post-MVP-screening; MVP uses labelled assumptions |
| **Construction/operating cost benchmarks** | **Yes, as parameter reference** | G6 | Same |
| **Population / households at amphoe/tambon** | **Yes, conditional** | G7; needed once concepts go beyond residential | Phase after MVP |
| **Income** | **Conditional** | Useful for pricing tier of concepts; lower priority than population | Later |
| **Tourism** | **Conditional** | Only for tourism-dependent concepts/areas; national hotel occupancy exists via REIC | Later |
| **Transport / routing** | **Not a new data source** | OSM + a routing engine can derive travel time; decide if straight-line is enough | Open |
| **Business activity / footfall** | **Not now** | Valuable for retail concepts but no clear source; OSM POI mix as weak interim | Later, research only |
| **Hazard / flood** | **Yes, but not MVP-blocking** | G9 is Medium; important for risk | Post-MVP |
| **Planned infrastructure** | **Not now** | Medium; high effort to curate | Later |
| **Property-level transaction/listing prices** | **Research, don't commit** | G4 is High, but access/licensing likely hard; REIC second-hand data overlaps LED | Research |

---

## 12. Challenge review

**Are we collecting data just because it is available?**
Risk areas found and addressed:
- OSM's many POI categories: only categories tied to a question (Q9–Q12) and passing a completeness check should become features. Restaurants/ATMs/bus stops are known to be very incomplete [Src `osm` §3]; they should not be MVP features by default.
- REIC's ~50 indicators: sentiment indices (HDSI/HPCI), golf-course data, debentures and REIC forecasts do not serve any MVP question. Excluded.
- LED open-data national aggregates: context only (E-L6); not decision evidence.
- LED property photos/sketches: unstructured; retain as references for the user, not as features.

**Is every required variable actually useful for a decision?**
Each variable in §3 is tied to at least one question. Variables tied only to Q13 (trend) at national level were demoted to "context" rather than "evidence".

**Are we confusing market-level with property-level evidence?**
This was the main risk found. Mitigations: measure type is mandatory on every observation; subject type distinguishes property from area; match level is disclosed; the selection rule forbids relabelling. REIC indices are explicitly *new-stock offering prices* and must never be displayed as "the value of this property".

**Are we assuming exact matches where only nearby evidence exists?**
Two concrete traps found:
1. LED "nearby" is administrative only — no metric distance exists.
2. OSM radius features from an admin centroid would fabricate precision — forbidden by the anchor precision rule.
Also: Treasury parcel-level matching is **assumed** by earlier source notes and by the brief; it is not verified.

**Can the AI recommendation be justified by the available evidence?**
Not as a *validated* HBU recommendation today (§7.4). It can be justified as a *hypothesis* with explicit unmet requirements. The architecture enforces this by: epistemic status on every observation, requirement-coverage checks per concept (Q15), and a sufficiency verdict (Q18).

**Are we missing critical information for "Best Potential Use"?**
Yes: legal permissibility (G2), income (G5), cost (G6), parcel location/physical facts (G1, G8), and local demand drivers (G7). None of these come from the four sources.

**Additional challenge — is the HBU framing itself too valuation-centric?**
Considered. An investor may prefer a lower-return, lower-risk use. That is why Q19 includes investor context and ranking robustness, and why "maximally productive" is evaluated per investor profile rather than as one global answer.

**Additional challenge — are 13+2 layers too many?**
Layers are *conceptual groupings of variables and questions*, not tables or services. L and M are cross-cutting, R is reference, N is user input. The analytically distinct content layers are A–K. We kept splits only where the analysis treats data differently (D/E, F/G, K1/K2).

---

## 13. Rejected approaches (summary)

| Approach | Reason |
|---|---|
| One layer per data source | Source-coupled; hides gaps |
| Fixed use catalogue | Contradicts the product principle; cannot represent novel concepts |
| A single "price" variable | Mixes assessed, forced-sale, asking, declared and index prices |
| Single scalar confidence per evidence item | Confidence depends on target and purpose |
| Admin-centroid geocoding for radius features | Fabricates precision |
| Tambon joins via OSM | ~12 % coverage |
| Project-name matching of REIC projects to parcels | Unreliable, explicitly warned against in REIC research |
| Using REIC second-hand listings and LED inventory additively | Overlapping populations |
| Automating LED verification-code search or REIC login | Against source terms / project rules (already rejected in source research) |
| Treating historical data as its own layer | Duplicates every layer; time is a dimension |

---

## 14. Open questions raised by this phase

1. What does Treasury actually provide (granularity, identifiers, geometry, access, licence)? Blocks T-ladder and valuation design.
2. Is MVP scope restricted to **LED properties** (T1), or must it accept arbitrary targets (T2–T6)?
3. Is a **user-asserted map pin** acceptable as the MVP location anchor, and how is it displayed?
4. Is **user/analyst-entered zoning** acceptable as interim evidence for legal permissibility, or must the MVP avoid use recommendations until an official zoning source exists?
5. Minimum evidence level per question for the system to state a conclusion versus "insufficient evidence".
6. How confidence components combine (ordinal classes vs numeric).
7. PDPA: may raw LED pages with personal names be stored, or must redaction happen at capture?
8. Licensing: commercial status of the project (LED CC BY-NC, REIC terms, ODbL share-alike) — determines which sources are usable at all.
9. REIC tier: public headlines only, member web, R-MAT, or project data?
10. Straight-line distance vs travel time.
11. Snapshot retention: start retaining LED data immediately (cannot be recovered later)?
12. Should the Scenario Engine be allowed to run with purely assumed income/cost parameters in the MVP, and how are results labelled?
13. Which REIC BMR definition is canonical when indicators disagree?
14. Refresh cadence per source and how staleness affects confidence.

---

## 15. Inconsistencies found in existing research (reported, not modified)

| # | Inconsistency | Where | Effect on Phase 3 |
|---|---|---|---|
| I-1 | Brief states Treasury research exists; both Treasury files are **empty** | `docs/data-sources/treasury.md`, `research/treasury/api-investigation.md` | All Treasury coverage = Unknown; valuation and matching design conditional |
| I-2 | Earlier notes describe Treasury as "per-parcel/per-unit assessed price … or price zones" | `led.md` §12 | Already labelled [Assumption] there; must not be treated as fact |
| I-3 | `reic.md` §8 states LED listings are "~31 %" of REIC second-hand listing supply "[Verified]", but the investigation file records only the LED count (61,646 units), not the total, so the percentage cannot be re-derived from the repo | `docs/data-sources/reic.md` §8 vs `research/reic/api-investigation.md` §8.2 | Minor. The *existence* of overlap is verified; the proportion is not needed for architecture |
| I-4 | REIC survey province coverage stated as 18 / 20 / 26 / 27 in different places | `research/reic` §6.3, already flagged there as U8 | Area coverage for REIC supply/demand must be stored per indicator and period, not assumed |
| I-5 | Treasury appraisal cycle changes on 1 Jan 2570 (from REIC press release) — not yet reflected anywhere as a Treasury fact | `research/reic` §8.1 | Assessed values need validity periods; any Treasury research must cover both cycles |
