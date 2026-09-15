# Data Requirements — Source Investigation Summary

> **HISTORICAL SOURCE INVESTIGATION.** HTTP availability and an earlier “Adopt” recommendation do not activate a source. Chon Buri/EEC is the regional research fixture, not the product boundary. Use the nationwide scope and source-product gates in [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md). User-adjustable model/legal assumptions below are superseded by zero-configuration and UNKNOWN semantics.

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Test area:** Chon Buri (regional research fixture in the EEC). Test points: P-A Mueang Chon Buri 13.3611, 100.9847 · P-B Si Racha 13.1737, 100.9311 · P-C Bang Saen 13.2830, 100.9270
- **Scope:** Remaining gaps for Best Potential Use: legal/regulatory, demographics/demand, physical site, financial reference. Plus a reconciliation of Treasury research.
- **Detail files:**
  - [00-treasury-verification.md](00-treasury-verification.md)
  - [01-legal-regulatory.md](01-legal-regulatory.md)
  - [02-demographics-demand.md](02-demographics-demand.md)
  - [03-physical-site-constraints.md](03-physical-site-constraints.md)
  - [04-financial-reference.md](04-financial-reference.md)
- **Method:** Every "Actual test result" below comes from a live request made in this investigation, unless marked *not tested*. No login, token, CAPTCHA or access control was bypassed. Token/key-gated endpoints were probed only to record the access requirement.

> **Filter applied to every candidate:** *Does this evidence materially improve our ability to determine the Best Potential Use of a property?* Sources that passed technically but failed this filter are marked **Not adopted**.

---

## 0. Headline findings

1. **Treasury was originally researched in a prior workspace and is now included in this repository.** Its core claims were re-verified live. The land-valuation dataset is **national** (77 provincial CSVs, Open Data Common). The parcel key is **map sheet + land number**, not deed number. "Public DS_TRANSIT" is actually an internal web-app route carrying a session **CSRF token**, so it wasn't used.
2. **Legal permissibility is partly available for Chon Buri.** The EEC land-use plan zone can be queried per point from a public GISTDA service, and the Royal Gazette text gives **permitted/prohibited uses** per zone type. The plan contains **no FAR, OSR, height or setback rules** (verified by full-text search), and it is an interim instrument until a new comprehensive plan is enforced.
3. **Local demographics are available at tambon level:**
   - DOPA registered population by single-year age, Dec 2568
   - GISTDA EEC tambon **polygons** with DOPA codes (92 in Chon Buri), which also partly closes the tambon-boundary gap
   - DIW factory workers by tambon
4. **Physical site data is mostly USER INPUT:**
   - Parcel shape and frontage: no approved public geometry for Chon Buri.
   - Flood history: GISTDA 2005–2016.
   - Elevation: Copernicus GLO-30.
5. **Financial inputs are mostly ASSUMPTIONS.** Official anchors exist only for:
   - hotel occupancy (MOTS, province, monthly)
   - building value per m² by type (Treasury, reference only)
   - regional residential price index (BOT RPPI)
   - interest rates (BOT API, key required)

---

## 1. Summary table

| # | Data requirement | Candidate source | Exact data available | API / access method | Actual test result | Geographic granularity | Coverage | Update frequency | Licensing / access constraints | Suitability for MVP | Limitations | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T1 | Official assessed land value (existing source) | **Treasury** land valuation (กรมธนารักษ์) | `UTMMAP1–4`, `UTMSCALE`, `LAND_NO`, `EVAPRICE` per parcel | CKAN CSV download + data.go.th datastore API; no key | 200; Chon Buri CSV 38.7 MB, **984,881 rows**; datastore returns same rows but **strips leading zeros** | Parcel (map sheet + land no.) | **National**, 77 provincial files | Every 4 years | Open Data Common | **High** | No admin names, deed no., area or geometry; unit & cycle not stated; blank values; LED can't join directly | **Adopt.** Look up via user-supplied map sheet + land number; use CSV text, not datastore numbers |
| T2 | Parcel geometry (existing-source path) | Treasury `DS_TRANSIT` / `GIS5_Q_PARCEL` | Parcel `SHAPE` (SRID 24047/24048), `RAWANG` [prior research] | Internal web-app route; session **CSRF token** + guestId | **Not called**; code inspection only | Parcel | Unknown | Unknown | Undocumented; token-bearing | **Not approved** | Not a published API | **Do not use** unless Treasury permits |
| L1 | Zoning / land-use zone | **EEC land-use plan** (EECO; hosted by GISTDA ArcGIS) | Zone block (`พ.-2`), zone type (`PLLU_DESC`), area | ArcGIS REST point query; no key | 200: P-A **พ.-2 ศูนย์กลางพาณิชยกรรม**; P-B **พ.-3**; P-C **ม.-21 ชุมชนเมือง** | Zone polygon | EEC (Chachoengsao, Chon Buri, Rayong) | Not stated; plan amended 2563 | Service licence not stated; plan text public | **High** (screen) | Boundary precision; amendment reflection untested; interim plan | **Adopt** as legal screen with boundary/currency caveats |
| L2 | Permitted / prohibited uses | **Royal Gazette** EEC announcement 2562 (+ No. 2, 2563) | Per zone type: allowed categories and prohibited-use list | PDF (republished by ASA); manual curation | 200; 200 pages; ข้อ 8 (พ.) prohibited list extracted | Zone type | EEC | On amendment | Public legal text | **High** | Manual curation; must track amendments | **Adopt** as curated reference with clause citations |
| L3 | FAR / OSR / height / setback | EEC announcement (searched); DPT | — | — | Full-text search: **0 hits** for FAR/OSR/height/setback terms | — | — | — | — | **None** | Rules live elsewhere (building control / future comprehensive plan) [Assumption] | **ASSUMPTION** (user-adjustable, labelled unverified) |
| L4 | Plan in force / plan list | **DPT** open data (`tp_name.csv`, `tp_reg.csv`) | Plan name, province, type, status, date | CKAN CSV; no key | 200; Chon Buri in-force: **only EEC plan (9 Dec 2562)** | Plan | National | "real-time" / unknown | Open Data Common | Medium (metadata) | List currency unknown | **Adopt** as metadata check |
| L5 | Plan boundaries (DPT service) | **DPT data service** `dptdata.dpt.go.th` | Plan boundaries (per catalog) | Token-keyed file API | **"Token Fail or Token Expire"** with the catalog token | Plan | National | Not stated | Registration/request required | Low | Token required; boundary ≠ zoning | **Not adopted** (further research) |
| L6 | Special-area restrictions | EEC service layers 2–3; zone classes; GISTDA env-control services | Coastal, conservation/military areas; forest/land-reform/military zone classes | ArcGIS REST | Layer lists 200; **point queries not tested** | Polygon | EEC | Not stated | Not stated | Medium | Untested | **Adopt layers 2–3 after testing**; env-control services → research |
| D1 | Population, age | **DOPA** registration statistics | Registered population by **single-year age**, by tambon (names) | Public `.txt` file download; no API | 200; Chon Buri file `6812cc20.txt`: 178 rows; province total **1,645,985** (798,596 M / 847,389 F) | Tambon | National | Annual/monthly files | Not stated on site; data.go.th copy CC BY | **High** | Registered ≠ present; names only; third-party scripts on site pages | **Adopt** (data files only) |
| D2 | Households | DOPA via data.go.th `statbyyear`; GISTDA `HOUSE62` | `HOUSE` (registered houses) with admin codes | CSV / ArcGIS | 200; periods **3612–6312** (stale); GISTDA 2562 | Tambon | National / EEC | None (stale) | CC BY / not stated | Medium | Houses ≠ households; dated | **Adopt as dated context**; research current household files |
| D3 | Tambon geometry + density | **GISTDA** `EEC_Public/Population_2562` | Tambon polygons, `TB_IDN` codes, area, 2562 pop/houses | ArcGIS REST; no key | 200; P-A → บางปลาสร้อย `200101`; **92 Chon Buri tambons** | Tambon polygon | EEC | Static (2562) | Not stated | **High** (geometry) | Population figures dated | **Adopt** polygons as tambon reference; density = DOPA ÷ area (derived) |
| D4 | Income | **NSO** SES (catalog API) | Avg monthly household income by source; income-band distribution | `catalogapi.nso.go.th/api/index?table=…&format=json`; no key | 200; `SFD_SPB0802_66` 7,700 rows; Chon Buri 2566 records present | **Province** | National | Survey rounds (2566 in province tables) | CC BY | Medium | Province only; sample survey | **Adopt as province context** |
| D5 | Workers | **DIW** EEC factory registry | Factory type, capital, **total workers**, tambon/amphoe | CSV download; no key | 200; 4.9 MB; 4,144 Chon Buri rows | Tambon (address) | EEC | Monthly | Open Data Common | **High** for worker-driven concepts | Factories only; no coordinates | **Adopt** (aggregate to tambon) |
| D6 | Workers (context) | SSO insured; Chon Buri labour force | Insured by section (monthly); LFS counts (quarterly) | CSV; no key | 200 both | Province | Chon Buri | Monthly / quarterly | Open Data Common | Low–Medium | Province only | **Context only** |
| D7 | Tourism | **MOTS** domestic tourism by province | Occupancy %, guests, visitors, Thai/foreign, revenue | Public xlsx (no API) | 200; Chon Buri Jan 2569R occupancy **78.45 %**, guests 1,537,605 | Province | National | Monthly (R/p) | Not stated on file; data.go.th listing CC BY | **High** for visitor concepts | Province only; unpredictable file URLs | **Adopt** (curated ingestion) |
| D8 | Non-registered population | Pattaya City open data | Latent population by sex/age, 2563–2567 | CSV | 200 | City | Pattaya | Annual | Open Data Common | Medium (Pattaya) | One city | **Adopt as supporting evidence** where relevant |
| D9 | Students | data.go.th search; GISTDA school layers | Fragmented per-province uploads | CSV / ArcGIS | Search 200: no Chon Buri student dataset; GISTDA layers **not tested** | Mixed | Inconsistent | Mixed | Mixed | **Low** | No consistent source | **Not adopted**; use OSM institution proximity as proxy |
| P1 | Parcel shape / frontage | GISTDA `EEC_PacelsRec` (DOL-sourced) | Chon Buri parcels as **raster image** | ArcGIS REST | Layer `type: Raster Layer`, `fields: null`; queries → 400 | — | EEC | — | Not stated | **None** | Image only | **Not adopted** |
| P2 | Parcel geometry (official API) | **DOL LandsMaps API** | Parcel boundary, coordinates, area, appraised value | Consumer-Key/Secret after organisational request letter | **Not tested** (credentials required) | Parcel | National | Hourly (catalog) | Request letter; 100k req/day/org; licence not specified | Unknown | Access for a university unconfirmed | **Further research** |
| P3 | Slope / elevation | **Copernicus DEM GLO-30** (AWS Open Data) | 30 m surface elevation (DSM) | Public COG tiles; no key | 200; P-A **4.6 m**, P-B 13.1 m, P-C 8.6 m | ~30 m | Global | Static (2022 tile) | Free public licence (terms linked) | Low–Medium | DSM includes buildings; urban slope unreliable | **Optional** |
| P4 | Flood risk | **GISTDA** recurring flood 2005–2016 | Flood polygons with per-year flags, frequency, tambon codes | ArcGIS REST; no key (newer API needs key: 407) | 200; **17,416** polygons in Chon Buri bbox; P-A: 0 | Polygon (1:50k) | National | Static (to 2016) | GISTDA copyright; open-data catalog lists Open Data Common | **High** (risk flag) | Historical extent, not hazard model | **Adopt** with disclosure |
| P5 | Existing structures (nearby) | **Microsoft** Global ML Building Footprints | Footprint polygons; height/confidence −1 | Public index + gz files; no key | 200; quadkey tile **1,318,422** footprints; **903 within 500 m of P-A** | Building | Thailand (142 quadkeys) | Release-based (2026-02) | ODbL [Assumption — not re-read] | Low–Medium | No use/floors/height | **Optional** (only if OSM completeness is poor) |
| P6 | Road access / width, utilities, building on parcel | — (GISTDA road/utility layers untested) | — | — | Not tested | — | — | — | — | — | No per-parcel source | **USER INPUT** |
| F1 | Construction cost reference | **Treasury** building valuation | Value per m² by 69 building types × province | CSV; no key | 200; e.g., Chon Buri `402 ตึกแถวสองชั้น 8,300` | Province × type | National | 4-yearly | Open Data Common | **Medium** (anchor) | Assessment value, not construction cost; unit not stated | **Adopt as reference anchor** only |
| F2 | Construction cost escalator | **TPSO** construction materials index / prices | Index and material prices by province | Web; "API Document" link | Page fetched; API endpoint **not located**; data.go.th id → 404 | Province | National | Monthly [Assumption] | Not determined | Unknown | Not tested | **Further research** |
| F3 | Construction cost table | Thai Appraisal Foundation | Cost-approach tables per m², quarterly | Web pages | Page fetched; Q2/2569 component changes | National | — | Quarterly | Non-government; licence not stated | Low | Non-official | **Not adopted** |
| F4 | Occupancy | **MOTS** (see D7) | Hotel occupancy by province | xlsx | 200 (see D7) | Province | National | Monthly | as D7 | **High** for hotel concepts | Hotels only | **Adopt** as anchor |
| F5 | Regional price trend | **BOT** Residential Property Price Index | Index (2011=100) by region & type; mortgage-loan based | Public web statistics page; API with key | 200; Jul 2026p Nationwide **179.2**, Central excl. BKK 189.0 | Region | National | Monthly | BOT terms not read | Medium | Region only; Chon Buri's region unconfirmed | **Adopt** after region mapping confirmed |
| F6 | Interest / risk-free rates | **BOT API** | Rates, policy rate, bond yields [Documented] | API key (developer portal registration) | **401** "Authorization field missing" without key | National | National | Daily/monthly | Registration required | Medium | Needs key | **Decide on registration**; web stats as fallback |
| F7 | Rent, opex, cap rate, labour, utilities | — (no official local source) | — | — | Minimum wage only via secondary sources (unverified) | — | — | — | — | — | — | **ASSUMPTION** (user-adjustable) |

---

## 2. Final classification of every requirement

| Category | Requirement | Classification | Basis |
|---|---|---|---|
| Legal | Zoning / land use (Chon Buri) | **AVAILABLE — new source** | EEC land-use plan (GISTDA service) |
| Legal | Permitted uses | **AVAILABLE — new source** | Royal Gazette zone rules (curated) |
| Legal | Building restrictions (general) | **NOT AVAILABLE** | No machine-readable source |
| Legal | Height restrictions | **NOT AVAILABLE** | Not in EEC plan; env-control layers untested |
| Legal | Setback | **NOT AVAILABLE** | Not in EEC plan |
| Legal | FAR / BCR | **ASSUMPTION** | Verified absent; user-adjustable with "unverified" label |
| Legal | Special-area restrictions | **AVAILABLE — new source** (partial) | EEC coastal/conservation/military layers & zone classes |
| Demand | Population | **AVAILABLE — new source** | DOPA tambon files |
| Demand | Population density | **DERIVED** | DOPA population ÷ GISTDA tambon polygon area |
| Demand | Households | **AVAILABLE — new source** (dated) | DOPA/GISTDA registered houses (2562–2563) |
| Demand | Age distribution | **AVAILABLE — new source** | DOPA single-year age by tambon |
| Demand | Income | **AVAILABLE — new source** (province only) | NSO SES API |
| Demand | Students | **NOT AVAILABLE** | No consistent source (OSM institution proxy = derived) |
| Demand | Workers | **AVAILABLE — new source** | DIW factory workers by tambon |
| Demand | Tourism | **AVAILABLE — new source** | MOTS provincial monthly |
| Demand | Local economic activity | **DERIVED** | DIW factories + OSM POIs (existing) |
| Physical | Land area | **AVAILABLE — existing source** (LED items) / **USER INPUT** (others) | LED; title deed |
| Physical | Parcel shape | **NOT AVAILABLE** | No approved public geometry (Chon Buri) |
| Physical | Frontage | **USER INPUT** | — |
| Physical | Road access | **USER INPUT** (legal access); **DERIVED** (proximity, OSM) | — |
| Physical | Road width | **USER INPUT** | — |
| Physical | Slope / elevation | **AVAILABLE — new source** | Copernicus GLO-30 (optional) |
| Physical | Flood risk | **AVAILABLE — new source** | GISTDA recurring flood 2005–2016 |
| Physical | Existing structures | **USER INPUT** (on parcel); **AVAILABLE — existing/new** (nearby: OSM / Microsoft) | — |
| Physical | Utilities | **USER INPUT** | — |
| Financial | Rent | **ASSUMPTION** | No official local source |
| Financial | Occupancy | **AVAILABLE — new source** (hotel, province); **ASSUMPTION** (other uses) | MOTS |
| Financial | Construction cost | **ASSUMPTION** (anchored by Treasury building values — AVAILABLE, existing source's new dataset) | Treasury `building-valuation` |
| Financial | Operating cost | **ASSUMPTION** | — |
| Financial | Labour | **ASSUMPTION** | Minimum wage to be verified as anchor |
| Financial | Utilities | **ASSUMPTION** | Tariffs untested |
| Financial | Market yield / return | **ASSUMPTION** | BOT rates as anchor (key) |
| Financial | Return metrics (NOI, IRR, NPV) | **DERIVED** | Scenario Engine |
| Valuation (existing) | Official assessed land value | **AVAILABLE — existing source** (verified) | Treasury `EVAPRICE` + **USER INPUT** map sheet & land number |
| Market (new) | Regional residential price trend | **AVAILABLE — new source** | BOT RPPI |

---

## 3. Minimum reliable evidence set (before Data Persistence finalisation and Phase 4)

For a Chon Buri property, this is the smallest set that lets the system test all four HBU gates with disclosed quality.

| HBU gate | Minimum evidence | Type |
|---|---|---|
| **Identity & location** | User pin (P3) **or** LED item; deed map sheet + land number (user input) | User input / existing |
| **1. Legal** | EEC zone at the pin + curated prohibited-use rules for that zone type; boundary-proximity flag | New source (authoritative + derived) |
| **2. Physical** | Land area (LED or user), frontage, road width/access, existing building (user); historical flood flag | User input + new source |
| **3. Financial feasibility** | Treasury `EVAPRICE` (exact via map sheet + land no.); LED entry price (existing); user-adjustable rent, occupancy, opex, capex (anchored by Treasury building value per m²), cap rate | Existing + assumption |
| **4. Demand & ranking** | DOPA tambon population & age; tambon density (derived); DIW workers in tambon; MOTS tourism & occupancy (province); NSO income (province); OSM accessibility (existing); REIC area trend (existing) | New + existing |

**Explicitly outside the minimum set:** FAR/height/setback (assumption only), parcel geometry, students, local rents, Microsoft footprints, elevation, TPSO, non-government cost tables.

---

## 4. Discrepancies with existing documentation

| ID | Existing conclusion | Where | New evidence | Action taken |
|---|---|---|---|---|
| X1 | Treasury "not researched"; all capabilities Unknown | `docs/data-architecture.md`; `research/data-architecture/data-requirements.md` §0; `docs/data-persistence-and-lifecycle.md` §5.2 | Research exists in Codex folder; re-verified live; national coverage | Updated those docs with a dated revision; imported Treasury docs into repo |
| X2 | Codex: "public DS_TRANSIT endpoint" | Codex Treasury docs | Session CSRF token route | Recorded in repo `treasury.md` as not approved |
| X3 | LED → Treasury join by deed no. + admin area [Assumption] | `docs/data-sources/led.md` §12 | Treasury has no deed no./admin names; key is map sheet + land no. | Dated correction note added to `led.md` §12 (original kept) |
| X4 | G2 legal permissibility: "no source" | `docs/data-architecture.md` §10; requirements §8 | EEC zone + prohibited uses available (Chon Buri/EEC); intensity rules absent | Gap re-rated |
| X5 | G7 local demographics: "not available" | same | DOPA tambon age/pop, DIW workers, NSO/MOTS province | Gap re-rated |
| X6 | G9 flood: "no substitute" | same | GISTDA recurring flood 2005–2016 | Gap re-rated |
| X7 | G10 tambon polygons missing | same | GISTDA EEC tambon polygons (92 in Chon Buri) | Gap re-rated (EEC only) |
| X8 | Parcel geometry via Treasury "verified" | Codex docs | Only via token route; no approved public path found | Remains a gap (G1) |

---

## 5. Items requiring further research

1. Treasury: `EVAPRICE` unit, appraisal cycle of current files, uniqueness of map-sheet + land-number key, permission for DS_TRANSIT.
2. Whether a Thai title deed shows the map sheet (ระวาง) and land number (เลขที่ดิน) in a form users can enter (sample deed).
3. EEC land-use layer currency vs Amendment No. 2 (2563) and any later amendments; licence/attribution from GISTDA/EECO.
4. Point-query tests for EEC layers 2–3 and GISTDA environmental-control services (Pattaya, Bang Lamung).
5. Where FAR/OSR/height/setback rules for Chon Buri live now (building control regulations, pending comprehensive plan).
6. DOL LandsMaps API eligibility for a university project.
7. DOPA household counts in current files; column-structure documentation for age files.
8. BOT region definitions (which region Chon Buri belongs to); BOT API key registration decision.
9. TPSO API endpoint; official minimum-wage and utility tariff sources; NSO provincial wages.
10. DBD juristic registrations and GISTDA school layers (only if a use concept needs them).
