# Data Source: Real Estate Information Center (REIC / ศูนย์ข้อมูลอสังหาริมทรัพย์)

> **Authority note:** dated source research only. Any systematic adapter activation and current architecture are governed by docs/data-architecture.md and docs/implementation-plan.md. This university project remains Thailand-wide; regional examples are fixtures only.

- **Owner:** ศูนย์ข้อมูลอสังหาริมทรัพย์, an independent unit under the supervision of the Government Housing Bank (ธนาคารอาคารสงเคราะห์, GHB); board appointed by the Minister of Finance
- **Website:** https://www.reic.or.th/
- **Last researched:** 2026-09-14
- **Status:** Research only — this file does not activate an integration; current source roles and activation gates are defined by the active architecture documents.
- **Evidence & raw findings:** [`research/reic/api-investigation.md`](../../research/reic/api-investigation.md)

> Labels: **[Verified]** = observed on 2026-09-14. **[Documented]** = stated on an official REIC page or PDF. **[Public-Undocumented]** = publicly reachable but not documented as an interface. **[Assumption]** / **[Uncertain]** = not confirmed.
>
> Historical context: `treasury.md` and the architecture documents were empty during the original investigation. They are populated now. Treasury matching notes below remain dated assumptions; LED and OSM notes are not final instructions.

---

## 1. Overview

- Set up by a **Cabinet resolution on 17 Aug 2004 (B.E. 2547)** after the 1997 crisis. Its job is to collect scattered real-estate data from agencies, process it into a national picture, and publish it. [Documented]
- Covers **7 property types**: residential, office, retail/commercial, hotel/resort, industrial, golf course and vacant land. **Residential coverage is by far the deepest.** [Documented]
- REIC works mostly as an **aggregator and analyst**:
  - **Secondary data:** transfers, foreign ownership, leases, ขายฝาก and refinance from the Department of Lands (DOL); building permits from NSO/BMA; loans from BOT and financial institutions; NHA projects.
  - **Primary data:** its own field surveys (new launches, sales, starts, unsold stock), price indices and sentiment indices. [Documented]
- **Coverage:** national for DOL-derived statistics. Survey data covers Bangkok Metropolitan Region (BMR) plus selected provinces only. Price indices cover only BMR and the 3 EEC provinces. [Documented]
- **Time:** both current and historical. REIC advertises "more than 10 years" of history for members. Some series start in 2007 (B.E. 2550), such as HDSI (from Q4/2550) and building permits (from Q1/2550). [Documented]

## 2. Access tiers: what is actually reachable

| Tier | What you get | Access | Machine-readable |
|---|---|---|---|
| **Public pages** | Publication schedule (indicator, frequency, next release), definitions PDF, index methodology PDFs, **headline index value + YoY/QoQ** on report pages, news | No login [Verified] | HTML/PDF; no API |
| **Public press releases** | National/regional/top-10-province tables (transfers, second-hand listings, EEC indices by province, forecasts) | No login [Verified] | PDF with extractable text tables; layouts vary |
| **Member statistics tables** (`/Product/Transfer/...`) | Full time series for ~50 indicators | **Login required**: HTTP 302 → login, which has a verification code and OTP [Verified]. Paid: 20,000 THB/yr full web access, or 2,000–18,000 THB/yr packages [Documented] | Export format **[Uncertain]** |
| **Member report PDFs** (full index reports) | Index tables and analysis | Linked through login [Verified] | PDF |
| **R-MAT** (`r-mat.reic.or.th`) | Dashboards and maps: supply, new supply, sales, remaining supply, **absorption rate**; transfers **by province and khet/amphoe**, type, price band | Paid, 80,000–300,000 THB [Documented]; login app [Verified] | **[Uncertain]** |
| **Project-level products** | Project survey data with **map location & project details** (1,000 THB); monthly BMR new-launch report with **project coordinates** (25,000 THB); REIC Exclusive Member covering 27 provinces | Purchase/contract [Documented] | **[Uncertain]** |

- **No official REIC API** exists, and REIC publishes **no datasets on data.go.th**. [Verified]
- **Automating logins is not appropriate** because the login has CAPTCHA/OTP, and the terms restrict automated use (§12).
- When I tried to confirm the login gate, a single direct request for a member-linked PDF returned the file even without a login. **The file was deleted unread, and this route must not be used.** See the investigation file §5.4.

## 3. Useful datasets (research candidates, not a selection)

| Dataset | Type of measure | Geography (smallest seen) | Frequency [Documented] | Source | Access |
|---|---|---|---|---|---|
| Residential ownership transfers (units, value) by type, new/second-hand, price band | **Aggregated registered transactions.** Value is the *declared registered value*, not appraisal. "Sale" registrations only | Public: national, region, top-10 provinces. R-MAT: **province, khet/amphoe** | Monthly (BMR, national) | DOL | Public (headlines) / paid |
| Vacant land, office, commercial, hotel, factory transfers | Aggregated registered transactions | National (province split [Uncertain]) | Monthly | DOL | Paid |
| Foreign condo ownership (units, value, m², nationality) | Aggregated transactions | BMR / regional; named provinces in releases | Monthly | DOL | Public (headlines) / paid |
| Long-term leases, ขายฝาก, refinance | Aggregated registrations | National | Monthly / quarterly | DOL | Paid |
| New launches, new sales (signed contracts), starts, cumulative unsold, completed unsold (units, value) | **Survey-based supply & demand** | BMR, EEC; regional provinces (project-level in paid products) | BMR/EEC quarterly; 18 regional provinces half-yearly | REIC survey | Paid |
| Completed & registered housing (≥70 % complete + house number) | Administrative count | BMR by area; national by type | Monthly (BMR) / quarterly (national) | District offices, municipalities, DOL, DOPA | Paid |
| Land allocation permits; residential/office/commercial/hotel/industrial building permits | Pipeline / development activity | National (NHA projects by province) | Monthly | DOL, NSO, BMA | Paid |
| Housing loans (new, outstanding; individual vs developer) | Credit aggregates | National | Quarterly | BOT, SFIs, others | Public (headlines) / paid |
| Second-hand housing **listings** (units, value, avg asking price) and second-hand transfers | **Asking-price aggregates** + transaction aggregates | Region; top-10 provinces | Quarterly | Listing sites, banks, AMCs, **LED**; DOL | Public press release |
| Rental housing data (ข้อมูลบ้านเช่า) by type, price level | Unknown measure | Unknown | Unknown | Unknown | Paid |
| Treasury land appraisal, cycle 2566–2569 | Republished Treasury values | Unknown | Per cycle | Treasury | Paid |
| Construction materials price index, HCCI, mortgage rate, policy rate, population & households, speculation ratio | Macro / cost context | National | Monthly / quarterly / annual | Various | Paid (some public headlines) |

## 4. Market indices

| Index | Measures | Method [Documented] | Geography | Base | Freq. | Latest public value [Verified] | Download |
|---|---|---|---|---|---|---|---|
| New housing (detached + townhouse) price index | Price of **new estate houses still on sale**. Offering price minus promotions. **Not transaction prices.** Second-hand excluded | Purposive sample of 245; projects with ≥6 unsold units, replaced by nearby new projects; collected in the mid-quarter month | BKK, Nonthaburi, Pathum Thani, Samut Prakan (aggregate) | 2555=100 | Quarterly | Q2/2569 = **131.2** (−0.9 % YoY) | Headline public; full series member-only |
| New condominium price index | Starting price per m² of studio/1BR/2BR in condos on sale, net of promotions | 150 samples; salable-area and area weights; **Chain Laspeyres**. Started half-yearly H1/2554 (base 2553), **rebased to 2555** in H2/2556 with wider coverage, **quarterly since Q1/2558** | BKK, Nonthaburi, Samut Prakan | 2555=100 | Quarterly | Q2/2569 = **161.7** (+1.6 % YoY) | Same |
| Undeveloped vacant land price index | Price per sq wa of **DOL vacant-land transfers** of ≥200 sq wa where one party is a juristic person | Chain Laspeyres; value weights from 2555–2559; regression on location, land-use plan and transit line | 6 BMR provinces (aggregate) | 2555 | Quarterly | Q2/2568 = **415.2** (+4.3 % YoY); later quarters member-only | Same |
| EEC housing price index (overall, detached, semi-detached, townhouse) | New houses on sale, net of promotions | Purposive sample of 250 | **Per province:** Chonburi, Rayong, Chachoengsao + aggregate | 2565 | Quarterly | Q2/2569 EEC 126.4; Chonburi 130.5; Rayong 122.1; Chachoengsao 122.3 | Public press release (6 quarters in tables) |
| EEC condo price index; EEC vacant land index | Methodology PDFs exist, not reviewed | [Uncertain] | EEC | [Uncertain] | Quarterly | — | — |
| Composite real-estate market index (residential) | Composite market condition | Components **[Uncertain]** | Thailand | [Uncertain] | Quarterly | Q3/2566 = 82.5 | Headline public |
| HDSI (developer sentiment); HPCI (buyer confidence) | Sentiment, current vs 6-month expectation | Survey; listed : non-listed weights 60:40 (HDSI) | BMR | Scale [Uncertain] | Quarterly | — | Member |
| HCCI; construction-material wholesale price index | Construction cost | — | National | — | Quarterly / monthly | — | Member |

**Suitability as features:** these indices are best used as **area-level trend and deflator inputs** (for example, the change in an index between an evidence date and a valuation date). **None of them is a property price.** They cover only BMR and EEC, so most provinces have **no REIC price index**. Base years differ (2555 vs 2565), so series can't be compared directly without rebasing. The survey indices follow *new stock on sale*, which may not track second-hand or distressed (LED) property.

## 5. Geographic granularity

| Level | What REIC evidence exists at this level |
|---|---|
| **Property** | **None found.** REIC does not publish individual transactions or listings. [Assumption: none observed] |
| **Project** | **Paid only:** project survey data with map location; new-launch report with coordinates; Exclusive Member. Schema and identifiers [Uncertain] |
| **Tambon** | None observed [Uncertain] |
| **Khet / Amphoe** | **Paid R-MAT transfer data** (province + khet/amphoe) [Documented]. "Completed & registered by area" in BMR (area definition [Uncertain]) |
| **Province** | EEC price indices (3 provinces); top-10 provinces in press releases; NHA by province; member tables (extent [Uncertain]) |
| **Region / REIC zone** | Press releases use 7 regions including "กรุงเทพฯ-ปริมณฑล". The BMR definition varies by indicator (3, 4, 5 or 6 provinces) |
| **National** | Transfers, permits, loans, composite index, macro series |

## 6. Identifiers & location

- Public data has **no project IDs, no admin codes and no coordinates**. Areas are given as Thai names. [Verified]
- Paid project-level products advertise **project location / coordinates and project details**. Whether they include a stable project ID, developer, address or unit-type prices is [Uncertain].
- **Project names are not reliable join keys** (renaming, phases, Thai/English variants) [Assumption]. They must also never be used to match LED/Treasury parcels.
- Without paid project data, the **best matching level is province**. **Khet/amphoe** matching needs R-MAT or a licensed equivalent.

## 7. Historical coverage & update frequency

- **History:** "more than 10 years" for members [Documented]. HDSI and permits from 2550; condo index from 2554; indices based on 2555; regional surveys from 2552 [Documented]. Report listings contain PDFs back to 2012 (file names) [Verified].
- **Frequencies** are taken from REIC's official publication schedule, not guessed from release dates. Monthly: transfers, permits, launches. Quarterly: indices, loans, BMR/EEC survey. Half-yearly: regional survey. Annual: population, hotel data. [Documented]
- **Revisions:** no policy found [Uncertain]. Re-uploaded report files named "…edit" exist [Verified]. No vintage archive was found [Uncertain].
- **Retention:** keeping snapshots is technically easy for public headlines. Whether it is **permitted** is unclear (§12). Report PDFs appear to stay available long-term.

## 8. Data quality & comparability risks

| Issue | Evidence | Impact |
|---|---|---|
| Price indices are **offering prices net of promotions**, not transactions | Methodology PDFs [Documented] | Measures developer pricing of new stock, not realised market value |
| **Transfer value = declared registered value** | Definitions [Documented] | May differ from the true price; not an appraisal |
| Methodology changes | Condo index: half-yearly→quarterly, base 2553→2555, Bangkok→3 provinces [Documented]; regional survey 1→2 rounds/yr from 2561 [Documented] | Breaks in series |
| Different base years | BMR 2555 vs EEC 2565 [Documented] | Must rebase before comparing |
| Inconsistent BMR / survey coverage | BMR = 3/4/5/6 provinces by indicator; survey provinces 18/20/26/27 [Verified across pages] | Two indicators labelled "BMR" may not cover the same area |
| Estimation | Building permits: >60 % of each province collected, then scaled to 100 % (from Q1/2550) [Documented] | Model-based values |
| Sample design | Purposive sampling (245/250); projects with fewer than 6 unsold units replaced by nearby ones [Documented] | Composition drift; urban/new-project bias |
| Survey population | Only projects on sale; excludes self-built and second-hand housing [Documented] | Not representative of all housing |
| Double counting with LED | LED listings are ~31 % of REIC's second-hand listing supply [Verified Q2/2569] | Using both may count the same evidence twice |
| Schedule table anomaly | "Latest period" shows future periods [Verified] | Don't infer availability from that column |
| Revised files | "edit" PDFs [Verified] | Unannounced revisions possible |
| No accuracy warranty | Terms & disclaimer [Documented] | Evidence must carry source/confidence metadata |

## 9. Matching with other sources

REIC shares **no identifier** with Treasury, LED or OSM. Every join is **administrative-area + property-type + period**. The only point-level joins possible are with paid project coordinates.

```
Treasury / LED property record
   │  province / amphoe / tambon names (+ asset type, + price, + date)
   ▼
normalized admin area (codes)  ← REIC gives Thai names only; a code mapping is needed
   ▼
REIC area-level evidence at the finest level available for that indicator:
   province (EEC index, press-release provinces, member tables)
   khet/amphoe (R-MAT transfers — paid)
   BMR / region / national (most indices, macro)
   + property-type mapping (detached / townhouse / condo / land)
   + period alignment (month / quarter / half-year, BE→CE)
```

| Source | Realistic join | Strongest level | Notes |
|---|---|---|---|
| **Treasury** | Parcel/unit location → province/amphoe → REIC trend/activity for that area and type | Province (public); amphoe (paid) | Parcel-level matching **not possible**. REIC republishes a Treasury appraisal table, which could help cross-checks [Uncertain content] [Assumption] |
| **LED** | LED property province/amphoe (deed location) + asset type + price band → REIC transfers, listings and indices | Province (public); amphoe (paid) | Use deed location, not selling office (see `led.md`). Map LED asset types to REIC types. Watch for LED double-counting in REIC second-hand data |
| **OSM** | REIC area values attached to OSM **province/amphoe polygons**. Paid project coordinates could be joined spatially | Amphoe polygon (OSM ≈ complete) / project point (paid) | OSM tambon polygons ≈ 12 %, so tambon joins aren't workable. OSM features describe *physical* context, REIC describes *market* context. Keep them separate |

**Needed for any join:** a standard admin-area code list (province/amphoe) with name normalisation, a REIC type → project type mapping, BE/CE period conversion, and the BMR definition each indicator uses.

## 10. Candidate analytical uses (proposals, not a feature set)

| Candidate feature | Source | Geo level | Period | Evidence strength | Limitations |
|---|---|---|---|---|---|
| `bmr_house_price_index`, `bmr_condo_price_index` (+ YoY/QoQ) | REIC indices | BMR aggregate | Quarterly | Medium (documented method) | Offering prices of new stock; BMR only; not property value |
| `eec_housing_price_index_{province}` | EEC index | Province (3) | Quarterly | Medium | 3 provinces only; base 2565 |
| `bmr_vacant_land_price_index_growth` | Land index | BMR aggregate | Quarterly | Medium | Juristic transfers ≥200 sq wa only; public values lag |
| `index_time_adjustment_factor` (index at valuation date / index at evidence date) | Indices | BMR/EEC | Quarterly | Medium | Only valid where index geography and type match |
| `transfer_units`, `transfer_value`, `transfer_growth_yoy` by type/price band | DOL via REIC | National/region/top provinces; amphoe (paid) | Monthly/quarterly | Strong for activity | Declared value; aggregated; public granularity coarse |
| `avg_transfer_value_per_unit` (area × type) | Derived | Province/amphoe (paid) | Monthly | Weak–medium as price proxy | Mix effects; not a price index |
| `secondhand_listing_supply`, `avg_asking_price_per_unit` | Second-hand report | Region / top-10 provinces | Quarterly | Weak–medium | Asking prices; includes LED listings |
| `unsold_inventory`, `completed_unsold`, `new_launch_units`, `new_sales_units` | REIC survey | BMR/EEC/regional; project (paid) | Quarterly/half-yearly | Medium | Paid; survey coverage changes |
| `absorption_rate` | R-MAT / derived from sales ÷ supply | Area/project (paid) | Quarterly | Medium | Paid; definition to confirm |
| `months_of_supply` = unsold / avg monthly sales | Derived | Survey areas | Quarterly | Medium | Mixed-frequency inputs |
| `permit_pipeline` (units/floor area), `land_allocation_permits` | NSO/BMA/DOL via REIC | National (province [Uncertain]) | Monthly | Medium | Estimated values; may be coarse |
| `foreign_condo_demand` | DOL via REIC | BMR/regional, named provinces | Monthly | Medium | Condo only |
| `mortgage_new_loans_growth`, `mortgage_rate` | Loans data | National | Quarterly/monthly | Medium (macro) | National only |
| `developer_sentiment_hdsi`, `buyer_confidence_hpci` | REIC surveys | BMR | Quarterly | Weak–medium | Sentiment, not fundamentals |
| `construction_cost_index_hcci` | REIC | National | Quarterly | Medium for replacement-cost scenarios | Standard house only |
| `reic_forecast_transfers` | Press release | National | Annual | Weak (forecast) | Assumption-dependent; treat as scenario input, not fact |

## 11. Role by analytical dimension (proposal, not a locked decision)

| Dimension | Evidence REIC can provide | Strength | Caveats |
|---|---|---|---|
| **Valuation** | Area-level price trends (BMR/EEC indices) for **time-adjusting** comparable evidence; average transfer value per unit by area/type (paid); second-hand asking-price levels | **Weak–Medium** (supporting) | No property- or parcel-level prices; indices use offering prices of new stock; most provinces lack an index |
| **Location** | Market attractiveness of an area: transfer activity, growth, supply concentration, foreign demand (province; amphoe paid) | **Medium** at province/amphoe | Admin-area level only unless project data is licensed; complements, not replaces, OSM physical features |
| **Business potential** | Development activity (permits, land allocation, launches, starts), residential demand (sales, transfers), unsold stock, hotel/tourism statistics | **Medium** (residential) · **Weak** (commercial: mostly national) | Commercial/office/hotel mostly national; paid; survey coverage limited |
| **Investment analysis** | Supply/demand balance, absorption, inventory overhang, credit conditions, sentiment | **Medium** | Many series paid; frequency quarterly/half-yearly; area mismatch |
| **Scenario analysis** | Historical ranges of index growth, transfer cycles, interest rates, construction costs; REIC's own forecasts | **Medium** for ranges · **Weak** for forecasts | Methodology breaks, rebasing, revisions; limited history for EEC |
| **Market context** | National/regional narrative, policy measures, macro links | **Strong** | Aggregated; attribution and licensing needed for display |

**Recommended role (for discussion):** REIC fits best as the **market-level context and trend layer**. It answers *"how is the market for this property type in this area moving, and how active or oversupplied is it?"* It would sit alongside Treasury (official assessed values), LED (distressed deal flow and realised auction prices) and OSM (physical context). Beyond public headlines and press releases, its value depends on a **paid, licensed data agreement**. [Recommendation, not a decision]

## 12. Licensing, access restrictions & cost

- **Website Terms (effective 1 Jun 2022):** content is REIC copyright; **no reproduction, modification or publication without written consent**; access scope is personal use; restrictions on automated software and on copying content to other websites. [Verified]
- **Press releases:** "use or redistribution in part or whole: please cite REIC as source". [Verified] This is looser than the Terms and **conflicts with them for reuse beyond citation** → [Uncertain].
- **robots.txt:** `Disallow: /upload`. PDFs are served at `/Upload/`, so it's [Uncertain] whether automated PDF retrieval is excluded.
- **Disclaimer:** no warranty of accuracy/timeliness. [Documented]
- **Cost:** public headlines are free. Member web access costs 20,000 THB/yr; packages 2,000–18,000 THB/yr; monthly new-launch report 25,000 THB; project data from 1,000 THB; R-MAT 80,000–300,000 THB; Exclusive Member priced by volume. [Documented; prices as of 2026-09-14]
- **Licence terms for paid data** (storage, derived data, display to our users, commercial use): **not published** → [Uncertain].
- Not legal advice. Production use would realistically require a **written agreement with REIC**.

## 13. Storage considerations (research level, no architecture chosen)

If licensed, REIC data suits **observation-style storage**: one row per *indicator × area × property type × period*. Each row would need:
- the raw value and unit (units, THB m, index points, %)
- measure type (index / aggregate transaction value / asking price / survey count / sentiment)
- base year (for indices)
- area level and name, plus normalised admin code
- REIC's BMR/region definition
- period (BE label and CE start/end) and frequency
- publication date and retrieval date
- source document / URL and REIC product tier
- methodology version or notes
- a revision/vintage marker
- licence tag

Raw source files (PDF/export) and normalised observations would be kept separately. Whether storage is **permitted** depends on §12.

## 14. Limitations: REIC is NOT authoritative evidence for

1. The **market value of a specific property**. Indices and averages describe areas and property types, not a property.
2. **Actual transaction prices** of individual properties. Transfer figures are aggregated *declared registered values*.
3. The **realised market prices** implied by its price indices. BMR/EEC indices use promotion-adjusted *offering prices of new projects*.
4. **Second-hand or distressed property prices** (listing data = asking prices; indices exclude second-hand).
5. **Parcel location, parcel boundaries, ownership or legal title.**
6. Price evidence **outside BMR and EEC** (no REIC price index there).
7. **Tambon-level** market conditions (none found).
8. Commercial, office or hotel market conditions at **local** level (mostly national aggregates).
9. **Rental yields**: rental data exists but its measure and coverage are [Uncertain].
10. **Future prices**: REIC forecasts are scenario-conditional opinions.
11. Accuracy guarantees (REIC explicitly disclaims them).

## 15. Open questions requiring human/project decisions

1. **Budget & licensing:** Should the project approach REIC for a data-licensing agreement (web membership, R-MAT, project data, or a custom/API feed)? Which tier, if any?
2. **Use case:** Is the system **commercial** and **user-facing**? This determines what REIC's terms allow and what must be negotiated.
3. Without a licence, is using **only manually cited public headlines/press releases** acceptable, or should REIC be excluded for now?
4. Is **automated extraction** of public PDFs/pages acceptable at all, given the Terms and the `/upload` robots rule? (The current recommendation is no, unless REIC confirms in writing.)
5. **Geographic floor:** Is province-level market context acceptable for valuation support, or is amphoe/project-level evidence required (paid)?
6. Should REIC **price indices be used at all** for valuation time-adjustment, given they cover only BMR/EEC and measure new-stock offering prices?
7. How should the system handle **areas with no REIC index** (most provinces)? Leave empty, use a proxy such as national transfer values, or use another source?
8. **Admin-code standard** for joining REIC ↔ Treasury ↔ LED ↔ OSM (province/amphoe code list and name normalisation).
9. **Double counting:** How should REIC second-hand listing data (which includes LED listings) be treated alongside LED evidence?
10. **History & vintages:** Should the system keep snapshots and vintages of REIC values (if permitted), and how far back is needed for trend/scenario analysis?
11. Should the project **notify REIC** that member-linked PDFs were retrievable without login (observed once, not used)?
12. Which REIC indicators, if any, go into the first feature shortlist? (§10 is candidates only.)
