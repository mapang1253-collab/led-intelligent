# 4. Financial Reference Data — Source Investigation

> **HISTORICAL REGIONAL SOURCE INVESTIGATION.** Chon Buri/EEC is the research and validation fixture in this file, not the product boundary. Current nationwide scope, economic-method governance and activation requirements are defined by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/economic-component-registry.md`](../../docs/economic-component-registry.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Test area:** Chon Buri
- **Method:** Public statistics pages, open-data files, API gateway probes without credentials (to record the access requirement), catalog pages. No credentials were created, and no access control was bypassed.

> Labels: **[Verified-live]** · **[Documented]** · **[Assumption]** · **[Not tested]**

---

## 1. Why this category matters, and the key principle

HBU tests 3–4 (financially feasible, maximally productive) need revenue, cost and return inputs. Gaps G5 (income) and G6 (cost) were ranked High.

**Principle for this category:** most financial inputs for a *specific future use* aren't facts that exist anywhere. They are **scenario assumptions**. External data can only **anchor** or **bound** them. So this investigation classifies every variable into:

| Role | Meaning | Who controls it |
|---|---|---|
| **External evidence** | A published observation that can anchor an assumption | Source |
| **Derived / calculated** | Computed by the system from evidence + assumptions | System (deterministic) |
| **User-adjustable assumption** | A scenario parameter with a stated default and basis, visibly editable | User (request-scoped, per [`data-persistence-and-lifecycle.md`](../../docs/data-persistence-and-lifecycle.md) §4 N2–N3) |

---

## 2. Rent

| Candidate | Result | Label |
|---|---|---|
| REIC rental housing data (ข้อมูลบ้านเช่า) | Paid; measure and coverage **Unknown** (existing research) | Existing |
| BOT, NSO, MOTS, DOPA open data | No local rent levels found | Not found in this investigation |
| Consumer price index rent component (TPSO) | **Not tested**; it would be an index, not a rent level [Assumption] | Not tested |
| Commercial listing portals | Unofficial; not investigated (brief: no unofficial scraping) | Excluded |

**Classification:** rent → **ASSUMPTION** (user-adjustable), optionally anchored by **USER INPUT** (e.g., rent quotes the user collected). **NOT AVAILABLE** as external evidence for MVP.

---

## 3. Occupancy

| Candidate | Result |
|---|---|
| **MOTS domestic tourism by province (monthly xlsx)** | Chon Buri hotel **occupancy 78.45 % (Jan 2569R)**, 82.12 % (Jan 2568R); guests 1,537,605 [Verified-live — see [02-demographics-demand.md](02-demographics-demand.md) §5.1] |
| Occupancy for residential rental, office, retail | **Not found** |

**Classification:**
- Hotel/accommodation occupancy → **AVAILABLE — new source** (province, monthly) as external evidence anchoring a hotel-type concept's occupancy assumption.
- All other occupancy/vacancy → **ASSUMPTION**.

---

## 4. Construction cost

### 4.1 Treasury building valuation — official per-m² values by building type × province

```
GET https://catalog.treasury.go.th/dataset/83038253-61e8-431e-947b-6931cc689c3a/resource/cf687667-5386-4813-8062-429fb0cd4acf/download/construct_all_20240805.csv
→ HTTP 200, 519,788 B, 5,313 rows
ID_CONSTR,NAME_CONSTR,CHANGWAT_CODE,CHANGWAT_NAME,PRICE_CONSTR
Chon Buri (code 20): 69 types, e.g.
  201 บ้านแถว (ทาวน์เฮาส์) ชั้นเดียว        7600
  402 ตึกแถวสองชั้น                         8300
  509/2 สำนักงาน ความสูงเกินกว่า 5 ชั้นขึ้นไป 8800
  510 ภัตตาคาร                              6950
  522 อาคารพาณิชย์ ประเภทโชว์รูมรถยนต์       5500
```

| Item | Finding |
|---|---|
| Owner | กรมธนารักษ์ — licence Open Data Common; 4-yearly [Verified-live] |
| Meaning | Assessment standard building value used for land-and-building tax (dataset description) [Verified-live]. **Not** a construction tender price, and it doesn't state whether depreciation or finishes are included [Assumption] |
| Unit | Not stated; THB/m² presumed [Assumption] |
| Granularity | Province × building type |
| Improves Best Potential Use? | **Yes, as an official reference anchor** for a capex assumption, with a clear label |
| MVP | **Suitable as a reference** ("Treasury assessment value per m² for this building type in Chon Buri"), never as the capex itself |

### 4.2 Thai Appraisal Foundation — building construction cost table (non-government)

| Item | Finding |
|---|---|
| Owner | มูลนิธิประเมินค่า-นายหน้าแห่งประเทศไทย (Thai Appraisal Foundation) — **not a government body** [Documented on page] |
| Page | `https://www.thaiappraisal.org/thai/value/value.php` [Verified-live via fetch] |
| Content | Cost approach tables, quarterly; latest "Q2/2569"; component changes (labour +3.62 %, materials +1.42 %, rebar +8.83 %, overall +4.57 %) [Verified-live via fetch summary] |
| Licence / reuse | **Not stated** [Verified-live] |
| MVP | **Not adopted** as a system source (non-official, unclear licence). May be cited by users as a basis for their own assumption |

### 4.3 TPSO construction materials price index / prices by province

| Item | Finding |
|---|---|
| Owner | สำนักงานนโยบายและยุทธศาสตร์การค้า (TPSO), Ministry of Commerce |
| Pages | `index.tpso.go.th/materials-price-index`, `/construction-material-prices/prices-building-materials` (province-level) [Verified via search] |
| API | Page navigation shows an "API Document" link [Verified-live via fetch]; the endpoint was **not located** in the Next.js page bundles inspected [Verified-live] |
| data.go.th id from search (`gdpublish-tpso_data_66`) | `package_show` → **HTTP 404** on data.go.th [Verified-live] |
| MVP | **Further research.** Would serve as an **escalator** (cost change over time), not a cost level |

**Classification:** construction cost → **ASSUMPTION** (user-adjustable), with **AVAILABLE — new source** official reference (Treasury building values) and an escalator candidate (TPSO, untested).

---

## 5. Operating cost

No official source of operating-cost ratios by use type was found or expected [Not found].

**Classification:** **ASSUMPTION** (user-adjustable, default ratio with stated basis).

---

## 6. Labour cost

| Candidate | Result |
|---|---|
| Minimum wage by province | Secondary sources state Chon Buri **400 THB/day** under Wage Committee announcement No. 14, effective 1 Jul 2568 [**Not verified against an official Ministry of Labour / Royal Gazette source** in this session] |
| NSO labour force survey wages by province | **Not tested** |
| Chon Buri labour force (counts, not wages) | Available [Verified-live — file 02 §4.3] |

**Classification:** labour cost → **ASSUMPTION** (user-adjustable). An official minimum-wage reference is a candidate **external evidence** anchor once verified.

---

## 7. Utilities cost

PEA/MEA electricity tariffs and PWA water tariffs are published as official rate schedules [Assumption — general knowledge; **not tested** in this session].

**Classification:** **ASSUMPTION** (user-adjustable), with tariffs as a possible reference later.

---

## 8. Market price evidence and yield / return

### 8.1 Bank of Thailand — Residential Property Price Index (web statistics, public)

```
GET https://app.bot.or.th/BTWS_STAT/statistics/BOTWEBSTAT.aspx?reportID=993&language=ENG
→ HTTP 200, 110,326 B
"EC_EI_008_S4 Residential Property Price Index … ( JAN 2011 - JUL 2026 ) Last Updated : 31 Aug 2026 14:31 (2011 = 100)
 Residential property price index — Nationwide JUL 2026p 179.2 · Bangkok and vicinities 172.8 · Central (excluding Bangkok and vicinities) 189.0 · North 194.0 · Northeast 186.1 · South 166.7
 Single-detached house price index (including land) — Nationwide 163.1 · Bangkok and vicinities 142.2 · Central (excl.) 174.9 …"
```

| Item | Finding |
|---|---|
| Owner | ธนาคารแห่งประเทศไทย (BOT) |
| Method | Hedonic regression, 3-month moving average, from **mortgage loan data of commercial banks and GHB** [Documented via search result of BOT page] |
| Granularity | **Region** (Nationwide, BKK & vicinities, Central excl. BKK, North, Northeast, South) [Verified-live] |
| Where Chon Buri falls | **Unknown** — no "East" region listed; the region definition must be read from BOT metadata [Not tested] |
| History / frequency | Monthly, Jan 2011 → Jul 2026; last updated 31 Aug 2026 [Verified-live] |
| Access | Public web page with Download/Print controls; no key [Verified-live] |
| **Measure type** | **Index based on mortgage-financed transactions** — distinct from REIC's new-stock offering-price indices. Must get its own measure type (AD-3) |
| Improves Best Potential Use? | **Moderately** — regional price trend for exit-value and time-adjustment assumptions; not local |
| MVP | **Suitable** as regional market-trend evidence, once the Chon Buri region mapping is confirmed |

### 8.2 BOT API — interest/reference rates (risk-free and financing anchors)

```
GET https://gateway.api.bot.or.th/Stat-ReferenceRate/v2/DAILY_REF_RATE/?start_period=2026-09-01&end_period=2026-09-10
→ HTTP 401 {"error": "Authorization field missing"}
GET https://apigw1.bot.or.th/...  → DNS resolution failed (old gateway)
```

| Item | Finding |
|---|---|
| Access | API key from BOT developer portal `https://portal.api.bot.or.th/` (registration) [Verified-live 401 / Documented]. Old channel discontinued from 31 Dec 2025 [Documented via search] |
| Relevant content | Interest rates, policy rate, government bond yields [Documented category list; specific series **not tested**] |
| MVP | **Suitable if the project registers for a key** (a decision, not a bypass); otherwise use the public BOT statistics web pages |

### 8.3 Market yield / cap rate

No official source publishes property yields or cap rates by use type and area [Not found]. REIC doesn't publish them either (existing research §14).

**Classification:** **ASSUMPTION** (user-adjustable), with risk-free and financing-rate references from BOT as external evidence anchors.

---

## 9. Financial variable role matrix

| Variable | External evidence (anchor) | Derived / calculated | User-adjustable assumption |
|---|---|---|---|
| Acquisition price | LED starting price / appraisal lines (existing); Treasury `EVAPRICE` (reference, not price) | All-in acquisition cost (price + fees + taxes) | Negotiated price (non-LED); fee/tax rates if not curated |
| Land value reference | Treasury `EVAPRICE` via map sheet + land number (existing, verified) | Assessed land value = `EVAPRICE` × area | — |
| Market price trend | BOT RPPI (region); REIC indices (BMR/EEC, existing) | Time-adjustment factor | Future price growth |
| Rent / revenue per unit | — (none official) | Gross potential income | **Rent level**, revenue per unit |
| Occupancy / vacancy | MOTS hotel occupancy (province, monthly) | Effective gross income | **Occupancy/vacancy** for all uses (hotel anchored) |
| Operating cost | — | NOI = EGI − opex | **Opex ratio** / per-unit opex |
| Construction / renovation cost | Treasury building value per m² by type (reference); TPSO CMI (escalator, untested) | Capex = area × unit cost × escalation | **Unit construction cost**, contingency |
| Buildable area | EEC zone (permitted categories only) | Buildable floor area = land area × intensity | **Intensity (FAR/coverage)**, floors |
| Labour cost | Minimum wage (to verify) | Payroll estimate | **Staffing, wage level** |
| Utilities cost | Tariffs (untested) | Utility cost estimate | **Consumption, tariff** |
| Financing | BOT policy/reference/bond rates (key required) | Debt service | **Loan rate spread, LTV, term** |
| Exit value | BOT RPPI / REIC trend (context) | Exit value = NOI ÷ cap rate | **Cap rate / exit yield**, holding period |
| Returns | — | NPV, IRR, yield on cost, payback, break-even occupancy | **Discount rate** |
| Demand volume (hotel concept) | MOTS guests/visitors (province) | Market share scenarios | **Capture rate** |

## 10. Requirement classification

| Requirement | Classification |
|---|---|
| Rent | **ASSUMPTION** (anchor: USER INPUT) |
| Occupancy — hotel/accommodation | **AVAILABLE — new source** (MOTS, province, monthly) |
| Occupancy — other uses | **ASSUMPTION** |
| Construction cost | **ASSUMPTION**, anchored by **AVAILABLE — new source** (Treasury building values per m², reference only) |
| Operating cost | **ASSUMPTION** |
| Labour | **ASSUMPTION** (official minimum wage to be verified as anchor) |
| Utilities | **ASSUMPTION** |
| Market yield / return | **ASSUMPTION** (anchors: BOT rates — key required) |
| Regional residential price trend | **AVAILABLE — new source** (BOT RPPI, region, monthly) |
| All return metrics (NOI, IRR, NPV, payback) | **DERIVED** |

## 11. Recommendation

1. **Accept that the Scenario Engine runs on assumptions** for rent, opex, cap rate, construction cost and labour. Make every assumption visible, editable, request-scoped, and shown with its anchor (if any) and basis.
2. **Adopt as anchors for MVP:** MOTS hotel occupancy (Chon Buri), Treasury building values per m² (reference, labelled), BOT RPPI (regional trend, once region mapping is confirmed).
3. **Decide** whether to register for a BOT API key (policy/bond rates). The public statistics pages are the no-key fallback.
4. **Don't adopt** non-government cost tables or listing-portal rents as system sources for MVP.
5. **Further research:** TPSO API endpoint, BOT region definitions, official minimum-wage source, PEA/PWA tariffs, NSO provincial wages.
