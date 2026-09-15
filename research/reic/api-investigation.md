# REIC (ศูนย์ข้อมูลอสังหาริมทรัพย์) — Access, Data & Licensing Investigation

> **HISTORICAL SOURCE RESEARCH.** This file records dated source observations and does not activate an adapter. Current nationwide scope, source roles and activation rules are governed by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-14 (B.E. 2569), approx. 22:30–22:45 ICT (15:30–15:45 UTC)
- **Method:** Plain HTTPS `GET` requests (`curl`, browser-like User-Agent) to public pages, plus `WebFetch`/PDF reading of publicly linked documents. No login, no account creation, no CAPTCHA/OTP handling, no form submission. Low volume: ~55 requests to `reic.or.th` with 1–2 s pauses, 2 to `r-mat.reic.or.th`, 6 to `data.go.th`.
- **Companion doc:** [`docs/data-sources/reic.md`](../../docs/data-sources/reic.md)

> **Status legend**
> - **[Verified]** — directly observed in a test on 2026-09-14.
> - **[Documented]** — explicitly stated on an official REIC page/PDF.
> - **[Public-Undocumented]** — reachable through normal public pages, but not documented as an interface.
> - **[Assumption]** — reasonable interpretation, not verified.
> - **[Uncertain]** — insufficient evidence.

---

## 0. Repository context at time of research

| File | State on 2026-09-14 |
|---|---|
| `docs/data-sources/treasury.md`, `research/treasury/api-investigation.md` | Empty — Treasury not yet documented; Treasury matching notes below are therefore [Assumption] |
| `docs/data-sources/led.md`, `research/led/api-investigation.md` | Populated (LED: no coordinates; province/amphoe/tambon + deed no.; asset types) |
| `docs/data-sources/osm.md`, `research/osm/api-investigation.md` | Populated (OSM joins by geometry; amphoe/province polygons ≈ complete; tambon ≈ 12 %) |
| `README.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/data-architecture.md`, `docs/system-design.md` | Empty |

None of those files were modified.

---

## 1. Summary of findings

| # | Channel | Status | Auth | Machine-readable? | Granularity | Usefulness |
|---|---|---|---|---|---|---|
| A | Official REIC API | **None found** | — | — | — | — |
| B | Open data (`data.go.th` CKAN) | **No REIC datasets / no REIC organisation** [Verified] | — | — | — | — |
| C | Publication schedule & definitions (`/Product/Table`, `/Product/Report`, definitions PDF, index methodology PDFs) | Public [Verified] | None | HTML / PDF | Metadata only | **High** as metadata |
| D | Press releases (`/Activities/PressRelease`, PDFs under `/Upload/`) | Public [Verified] | None | PDF (text tables, extractable) | National / region / top-10 provinces; EEC per province | Medium |
| E | Index report pages (`/Research/REICReport/{id}`) | Public summary [Verified]; full PDF linked via login | Summary: none. PDF: member login | HTML summary (headline value + YoY/QoQ) | Index-area level (BMR, EEC) | Medium |
| F | Statistics tables (`/Product/Transfer/...`) | **Login required** — HTTP 302 → `/Member/Login` [Verified] | Member login (captcha + OTP); paid tiers | Unknown (not accessed) | Documented as province/area; REIC states >10 years history | High (if licensed) |
| G | R-MAT (`r-mat.reic.or.th`) | Login app [Verified shell] | Paid package | Unknown | Province + khet/amphoe (transfers) [Documented] | High (if licensed) |
| H | Project-level survey data / monthly new-launch report / REIC Exclusive Member | Paid products [Documented] | Purchase / contract | Unknown | **Project-level with map location / coordinates** [Documented] | High (if licensed) |
| I | Site-internal AJAX (`$.post` endpoints) | [Public-Undocumented] — analytics/UI only | Session | JSON/HTML | None of data value | None |

---

## 2. Official sources consulted

| ID | URL | Content |
|---|---|---|
| S1 | https://www.reic.or.th/ | Homepage, navigation, press-release links |
| S2 | https://www.reic.or.th/robots.txt | Crawl rules |
| S3 | https://www.reic.or.th/About/History | Establishment, mission |
| S4 | https://www.reic.or.th/Product/Table | ตารางเผยแพร่ (อสังหาริมทรัพย์) — indicator list, frequency, latest period, next release date, owner |
| S5 | https://www.reic.or.th/Product/Report | ตารางเผยแพร่ (บทวิเคราะห์) — analysis/index release schedule |
| S6 | https://www.reic.or.th/Product/AllChart and `/Product/Chart/{1..8}/…` | สถิติอสังหาริมทรัพย์ — list of statistics tables per property type |
| S7 | https://www.reic.or.th/Upload/200924_1600946101_70957.pdf | นิยามศัพท์ (definitions), residential category, 9 pp. (file name dated 24 Sep 2020) |
| S8 | https://www.reic.or.th/Upload/Index_Calculator-HousingPriceIndex-DetachedandTownHouse.pdf | Methodology — new housing (detached/townhouse) price index, BMR |
| S9 | https://www.reic.or.th/Upload/Index_Calculator-HousingPriceIndex-Condominium.pdf | Methodology — new condominium price index, BMR |
| S10 | https://www.reic.or.th/Upload/Index_Calculator-UndevelopedVacantLandPriceIndex.pdf | Methodology — undeveloped vacant land price index, BMR (PDF metadata date 10 May 2023 per fetch tool) |
| S11 | https://www.reic.or.th/Policy | Terms & Conditions (effective 1 Jun 2565), Privacy, Disclaimer |
| S12 | https://www.reic.or.th/Package, `/Package/Detail/6..9` | Personalize Member Package prices & contents |
| S13 | https://www.reic.or.th/Product/All, `/Product/Product`, `/Product/Service`, `/Product/Detail/{1016,1063,1071,1072,1073}` | Paid products & services |
| S14 | https://www.reic.or.th/Member/Login, `/Member/RegisterGeneral`, `/Member/HowtoRegist` | Membership & login |
| S15 | https://www.reic.or.th/Research/REICReportGroup/{1,2,3,4,9,11,12,13,14} | Index report listings |
| S16 | https://www.reic.or.th/Research/REICReport/{1855,1941,1942,1901} | Index report detail pages |
| S17 | `…/Upload/2026-08-27-reic-press-release-h1-national-housing-market_23094_1787820478_28404.pdf` | Press release: national housing market H1/2569 |
| S18 | `…/Upload/2026-09-08-reic-press-release-national-second-hand-housing-q2_106_1788853354_23485.pdf` | Press release: second-hand housing Q2/2569 (10 pp.) |
| S19 | `…/Upload/2026-08-17-reic-press-release-eec-housing-price-index-q2_292_1786946553_76594.pdf` | Press release: EEC housing price index Q2/2569 |
| S20 | `…/Upload/2026-07-24-reic-press-release-nso-bigdata-cooperation_54204_1784876381_23004.pdf` | Press release: REIC–NSO MOU |
| S21 | https://r-mat.reic.or.th/ | R-MAT app shell |
| S22 | `https://data.go.th/api/3/action/package_search` / `organization_autocomplete` | Government open-data catalog search |

Methodology PDFs **identified but not read**: `Condominium-Price-Index-in-the-EEC-Area.pdf`, `Housing-Price-Index-in-the-EEC-Area.pdf`, `Index_Calculator-HCCI.pdf`, `Index_Calculator-HDSI.pdf`, `Index_Calculator-The-Empty-Land-Price-Index-in-EEC-area-Q2-2024.pdf`, `The-Housing-Purchase-Confidence-Index-The-First-9-months-of-2023.pdf` (all linked from S4).

---

## 3. Organisation [Documented S3]

- Established by **Cabinet resolution of 17 August 2547 (2004)** on a Ministry of Finance proposal, after the 1997 crisis exposed the lack of real-estate information.
- An **independent line-level unit under the supervision of the Government Housing Bank (ธนาคารอาคารสงเคราะห์, GHB)**; governed by a REIC board appointed by the Minister of Finance. Operations began **25 August 2547**.
- Mission: data, analysis/research, business forecasting, advisory, and public dissemination of national real-estate information; collects primary and secondary data on **7 property types** (residential, office, retail/commercial, hotel/resort, industrial, golf course, vacant land).
- Cabinet resolution of 4 Sep 2561 funded a second-hand housing database project.
- 2026-07-23 MOU with the National Statistical Office (NSO): NSO to supply business/industrial census, household surveys and **nationwide building-permit** data; REIC to supply real-estate statistics [Documented S20]. Effect on future datasets: [Uncertain].

---

## 4. Website technology & crawl rules [Verified]

- Server: ASP.NET (cookie `ASP.NET_SessionId`), MVC-style routes, jQuery, Highcharts (+ `exporting.js`). `www.reic.or.th` and `reic.or.th` serve the same site.
- `robots.txt` (S2):
  ```
  User-agent: *
  Disallow: /admin
  Disallow: /upload
  Disallow: /upload_fm
  ```
  PDFs are served at `/Upload/...` (capital U). Robots paths are case-sensitive by specification, but the server may treat paths case-insensitively. **Whether `/Upload/` is intended to be excluded from automated access is [Uncertain]** — any automated PDF retrieval should be treated as disallowed until clarified with REIC.
- Terms & Conditions restrict automated software use (see §9).

---

## 5. Access-method tests

### 5.1 Public HTML pages [Verified]

| URL | Method | Status | Notes |
|---|---|---|---|
| `https://www.reic.or.th/` | GET | 200, `text/html; charset=utf-8`, 449,188 B | — |
| `/Product/Table` | GET | 200 | Publication schedule table (§6.1); footer "อัพเดทข้อมูลล่าสุด วันที่ 14 กันยายน 2569" |
| `/Product/Report` | GET | 200 | Analysis/index schedule; "อัพเดทข้อมูลล่าสุด วันที่ 11 กันยายน 2569" |
| `/Product/Chart` | GET | 200 (redirect → `/Product/AllChart`) | 8 categories |
| `/Product/Chart/1/x`, `/2/x`, `/7/x`, `/8/x` | GET | 200 | Table names per category (§6.2) |
| `/Research/REICReportGroup/{g}` | GET | 200 | Listings; year/quarter selectors; PDF links point to `/Member/Login?r=/Upload/...` |
| `/Research/REICReport/{id}` | GET | 200 | Title, publication date, **headline index value + YoY/QoQ text**; "Download PDF" → login |
| `/Policy` | GET | 200 | Terms (§9) |
| `/Package`, `/Package/Detail/6..9`, `/Product/*` | GET | 200 | Prices (§10) |

### 5.2 Statistics tables — login gate [Verified]

```
curl -sS -A Mozilla/5.0 -D - -o /dev/null \
  "https://www.reic.or.th/Product/Transfer/1/10/1/x?info_cate=1&info_sub_cate=10&info_type=1&relogin=1"
→ HTTP 302, location: /Member/Login, set-cookie: ASP.NET_SessionId=…; HttpOnly
```

URL pattern observed in links (S1, S6) [Public-Undocumented]:

```
/Product/Transfer/{info_cate}/{info_sub_cate}/{info_type}/{slug}
   ?info_cate=&info_sub_cate=&info_type=&relogin=1&type_table=
   &s_month_1=&s_quartar1=&s_year_1=&s_month_2=&s_quartar2=&s_year_2=
```

Parameters suggest a period range selector (month/quarter/year from–to). Response format, export options (Excel/CSV), pagination and row structure: **not observed — [Uncertain]**. Not tested further because it requires authentication.

Residential `info_sub_cate` values seen: 1 (transfers BMR), 2 (transfers national), 3 (housing loans), 6 (new sales), 7 (land allocation permits), 8 (low-rise building permits), 9 (high-rise permits), 10 (new launches), 12 (completed & registered BMR), 14 (HDSI), 15 (starts), 16 (cumulative unsold), 18 (completed unsold), 20 (housing price index), 52 (NHA projects), 62 (completed & registered national), 64/67 (foreign condo ownership regional/BMR), 66 (refinance), 68 (long-term leases), 69 (ขายฝาก), 70 (composite market index), 71 (rental housing data), 75 (HPCI), 76 (EEC housing price index).

### 5.3 Member login [Verified page content]

- `/Member/Login`: email + password, **verification code ("กรุณากรอกรหัสเพื่อยืนยันตัวตน", "Click to change") and OTP step**.
- `/Member/RegisterGeneral`: member types — **สมาชิกทั่วไป (general)**, **สมาชิกพิเศษพร้อมข้อมูลรายพื้นที่ (ค่าสนับสนุน 20,000 บาทต่อปี)**, **สมาชิกแบบ Personalize Member Package**. Registration requires name, surname, date of birth, gender, address, valid email.
- **What a free general member can access is not documented on the pages read — [Uncertain].** No account was created.
- Automating a login that uses a verification code + OTP would not be appropriate.

### 5.4 Observation about member PDFs — not used

During a single test request (intended to confirm the login gate), a report PDF that the site links only via `/Member/Login?r=/Upload/…` was returned with HTTP 200 on a direct GET. **The file was deleted unread and this path must not be used**: the site's intent is clearly that these PDFs require membership, and bypassing that intent conflicts with this project's rules and REIC's terms. Recorded so the project does not mistake this for "public data". Whether to notify REIC is an open question (§12).

### 5.5 Press-release PDFs [Verified]

| File | Status | Size |
|---|---|---|
| S17 H1/2569 national housing market | 200 `application/pdf` | 180,534 B |
| S18 Q2/2569 second-hand housing | 200 | 401,008 B |
| S19 Q2/2569 EEC housing price index | 200 | 395,516 B |
| S20 NSO cooperation | 200 | 113,404 B |

These are linked directly (no login) from the homepage/press-release pages. Text layer is extractable; tables are embedded as text (not images) in the samples read.

### 5.6 R-MAT [Verified shell only]

`GET https://r-mat.reic.or.th/` → 200; Next.js single-page app; assets include `/auth/...` → login-based. No data accessed. Documented contents in §10.

### 5.7 Site-internal endpoints [Public-Undocumented]

Found in page JavaScript: `POST /Home/Social_network`, `/Home/Language_Web`, `/Home/Sponsor_Add_Num_View`, `/Home/Advertising_Add_Num_View`, `/Home/Web_All_Num_View`, `/Policy/SetCookie`, `/Product/select_subcat`, `/Research/LogsDownload`. These are UI/analytics helpers — **no data API**. Not called.

### 5.8 data.go.th [Verified]

```
GET https://data.go.th/api/3/action/package_search?q=REIC&rows=15            → count 0
GET …package_search?q=ศูนย์ข้อมูลอสังหาริมทรัพย์                                → 6 results, none published by REIC (NSO, NHA)
GET …package_search?q=ธนาคารอาคารสงเคราะห์                                    → 9 results, none published by REIC/GHB
GET …organization_autocomplete?q=อาคารสงเคราะห์                                → []
```

Bank of Thailand datasets `ds-765` / `ds-766` ("เครื่องชี้ธุรกิจอสังหาริมทรัพย์", CC-BY, monthly) point to BOT statistics pages. **Whether they republish REIC-derived series was not verified** (outside REIC scope) — [Uncertain].

---

## 6. Data catalogue evidence

### 6.1 Publication schedule — `/Product/Table` (snapshot 2026-09-14) [Documented S4]

Columns: รายการข้อมูล | ความถี่ | ข้อมูลเผยแพร่ (latest period) | กำหนดการเผยแพร่ (next release) | ผู้รับผิดชอบ.

| Group | Indicator | Freq. | Latest | Next release |
|---|---|---|---|---|
| Residential – Demand | Transfers (BMR) | Monthly | ส.ค. 69 | 15 ต.ค. 69 |
| | Transfers (national) | Monthly | ก.ค. 69 | 24 ก.ย. 69 |
| | Foreign condo ownership (BMR) | Monthly | ส.ค. 69 | 15 ต.ค. 69 |
| | Foreign condo ownership (regional) | Monthly | ก.ค. 69 | 24 ก.ย. 69 |
| | Long-term lease registration, low-rise & condo (national) | Monthly | ก.ค. 69 | 29 ก.ย. 69 |
| | ขายฝาก (sale with right of redemption) registration (national) | Quarterly | Q3/69 | 19 พ.ย. 69 |
| | Housing loans | Quarterly | Q3/69 | 19 พ.ย. 69 |
| | Refinance | Quarterly | Q3/69 | 27 พ.ย. 69 |
| | New sales — BMR / EEC | Quarterly | Q2/69 | 28 ก.ย. 69 |
| | New sales — 18 main regional provinces | Half-yearly | H1/69 | 28 ก.ย. 69 |
| Residential – Supply | Land allocation permits (national) | Monthly | ส.ค. 69 | 15 ต.ค. 69 |
| | Low-rise / high-rise building permits (national) | Monthly | มิ.ย. 69 | 28 ก.ย. 69 |
| | New launches (BMR & main regional provinces) | Monthly | ส.ค. 69 | 18 ก.ย. 69 |
| | Completed & newly registered (BMR) | Monthly | ส.ค. 69 | 15 ต.ค. 69 |
| | Completed & registered (national) | Quarterly | Q3/69 | 27 พ.ย. 69 |
| | NHA low/middle-income projects | Quarterly | Q3/69 | 27 พ.ย. 69 |
| | HDSI (developer sentiment) | Quarterly | Q3/69 | 7 ต.ค. 69 |
| | Starts — BMR / EEC; 18 regional provinces | Quarterly; Half-yearly | Q2/69; H1/69 | 28 ก.ย. 69 |
| | Cumulative unsold — BMR / EEC; 18 regional | Quarterly; Half-yearly | Q2/69; H1/69 | 28 ก.ย. 69 |
| | Completed unsold — BMR / EEC; 18 regional | Quarterly; Half-yearly | Q2/69; H1/69 | 28 ก.ย. 69 |
| Residential – Price | Price index: new housing on sale; detached; townhouse; condo (BMR) | Quarterly | Q3/69 | 7 ต.ค. 69 |
| | EEC housing price index; EEC condo price index | Quarterly | Q3/69 | 22 ต.ค. 69 |
| Market | Composite real-estate market index (residential) | Quarterly | Q2/69 | 28 ก.ย. 69 |
| Office | Office building permits; office transfers (national) | Monthly | มิ.ย. 69; ก.ค. 69 | 28 ก.ย. 69; 24 ก.ย. 69 |
| Retail/commercial | Commercial building permits; transfers (national) | Monthly | พ.ค. 69; ก.ค. 69 | 28 ก.ย. 69; 24 ก.ย. 69 |
| Hotel/resort | Hotel building permits; hotel transfers | Monthly | พ.ค. 69; ก.ค. 69 | — |
| | Hotel/resort data | Annual | ปี 67 | — |
| | Tourist data; average occupancy rate | Monthly | ก.ค. 69 | 18 ก.ย. 69 |
| | Hotels applying for business licence (national) | Half-yearly | H2/69 | 11 มี.ค. 70 |
| Industrial | Industrial building permits; factory transfers; industrial estates | Monthly; Monthly; Quarterly | มิ.ย./ก.ค. 69; Q2/69 | 28/24 ก.ย. 69 |
| Golf | Golf-course tax revenue; golf-course data | Monthly; Quarterly | ก.ย. 69; Q3/69 | 20 ต.ค.; 30 ต.ค. 69 |
| Vacant land | Vacant land transfers (national) | Monthly | ก.ค. 69 | 24 ก.ย. 69 |
| | Land lease registrations (BMR) | Monthly | ส.ค. 69 | 15 ต.ค. 69 |
| | Undeveloped vacant land price index (BMR) | Quarterly | Q3/69 | 22 ต.ค. 69 |
| | Undeveloped vacant land price index (EEC) | Quarterly | Q3/69 | 27 พ.ย. 69 |
| | **Treasury land appraisal, cycle 2566–2569** | — | — | — |
| Other | Outstanding real-estate loans (national) | Quarterly | Q3/69 | 19 พ.ย. 69 |
| | Other transfers; registration fees | Monthly | ก.ค. 69 | 24 ก.ย. 69 |
| | Construction-material wholesale price index; housing interest rates | Monthly | ก.ย. 69 | 15 ต.ค. 69 |
| | Policy rate | Monthly | ต.ค. 69 | 28 ต.ค. 69 |
| | HCCI (standard house construction cost index) | Quarterly | Q3/69 | 7 ต.ค. 69 |
| | HPCI (housing purchase confidence, BMR) | Quarterly | Q3/69 | 13 พ.ย. 69 |
| | Real-estate debentures | — | "BOT stopped publishing this from 2568" | — |
| | Population & households | Annual | ปี 69 | 10 เม.ย. 70 |
| | Speculation ratio | — | — | มี.ค. 69 |

**Anomaly [Verified]:** On 2026-09-14 the "latest period" column lists periods that have not yet ended (e.g. Q3/69, ก.ย. 69, ต.ค. 69, H2/69) next to future release dates. The column is most likely the *period to be released next*, not data already available [Assumption]. The "Latest" column above must not be read as data availability.

`/Product/Report` (analysis schedule) adds: national housing market (quarterly, Q2/69, 18 ก.ย. 69); BMR housing market (quarterly); second-hand housing national (quarterly, Q3/69, 4 ธ.ค. 69); EEC housing market (quarterly, 14 ธ.ค. 69); hotel business (half-yearly); foreign condo transfers report (quarterly); EEC e-book (quarterly). [Documented S5]

### 6.2 Statistics table sub-series (`/Product/Chart/{n}`) [Documented S6]

- **Residential:** transfers BMR (units, value THB m, split juristic/individual); transfers national by type (all, detached, semi-detached, townhouse, shophouse, condo — units & value; apartment — buildings & value); housing loans (individual new/outstanding; developer new/outstanding); low-rise permits (units, floor area m²; by detached/semi/townhouse/residential shophouse); high-rise permits (buildings, floor area; condo; flat/apartment/dormitory); land allocation permits (projects, units, units by type); new launches, new sales, starts, cumulative unsold, completed unsold (units, value); completed & registered BMR (by type, **by area**); completed & registered national (by type); NHA hire-purchase/rental projects (starts/under construction **by province**, completions); HDSI; price indices (new housing, detached, townhouse, condo); refinance (units, value); foreign condo ownership BMR & regional (units, value, m², by nationality); long-term leases (low-rise/condo units & value); ขายฝาก (units, value); composite market index; HPCI; EEC price indices (housing, detached, semi-detached, townhouse, condo); **rental housing data (ข้อมูลบ้านเช่า: all/detached/semi/townhouse/shophouse/condo, by price level)**.
- **Office:** permits (buildings, floor area); transfers (buildings, value).
- **Vacant land:** transfers (plots, value); land leases BMR (plots, value, sq wa); BMR & EEC land price indices; Treasury appraisal 2566–2569.
- **Other:** outstanding RE loans (accounts, value); other transfers; construction-material wholesale price index; registration fees (transactions, THB); MLR avg of 6 large banks; housing interest rate; policy rate; HCCI; RE debentures; population & households (cumulative housing stock, population, persons per household); speculation ratio.

### 6.3 Definitions (S7, file dated 2020-09-24) [Documented]

| # | Indicator | Source | Coverage | Key definition |
|---|---|---|---|---|
| 1 | Land allocation permits | DOL | National | Whole-project permits only under Land Allocation Act 2543; partial permits excluded |
| 2 | Completed & newly registered housing (BMR) | District offices, municipalities, provincial offices (low-rise); DOL (condo registration) | BKK + 5 provinces | ≥70 % complete and issued a house number; developer- and self-built; excludes rental flats/apartments |
| 3 | Same (main regional provinces) | + DOPA registration bureau | BMR + Chiang Mai, Chiang Rai, Chonburi, Rayong, Khon Kaen, Nakhon Ratchasima, Phuket, Songkhla | Same |
| 4 | **Property ownership transfers** | **DOL** | National | Registration type "sale" only (excludes ขายฝาก, mortgage, gift, inheritance); only โฉนด, น.ส.3, น.ส.3ก; 1 unit = 1 plot for residential & vacant land (other types may be multi-plot); **value = "มูลค่าทุนทรัพย์จดทะเบียน" declared to DOL, *not* appraisal value** |
| 5 | NHA projects | NHA | National | Hire-purchase & rental; Baan Ua-Arthorn definitions |
| 6 | Housing loans | BOT, FPO, GHB, GSB, NHA, Islamic Bank, BAAC, life insurers | National | Outstanding (end-quarter) & new; developer loans split by land allocation/house+land/shophouse/condo |
| 7 | Residential building permits | NSO, BMA Public Works | National | New construction only; low-rise (detached/semi/townhouse) vs high-rise (condo/flat/apartment incl. <6 floors). **Note: from Q1/2550, >60 % of each province collected and estimated up to 100 %** |
| 8 | Apartment/serviced-apartment business loans | BOT | National (by province) | Outstanding |
| 9 | New launches (BMR) | REIC survey | BKK + 5 provinces | Projects newly opened for booking for the first time (low-rise and condo) |
| 10 | New launches (regional) | REIC survey | Chiang Mai, Chonburi, Rayong, Nakhon Ratchasima, Khon Kaen, Phuket | Same |
| 11 | New sales (survey) | REIC survey | **26 provinces** (BMR + 20 strategic regional provinces) | Units with new sale-and-purchase **contracts** in survey period; bookings without contract excluded. BMR: 2 rounds/yr. Regional: 1 round/yr (Q3) in 2552–2560; 2 rounds/yr from 2561 |
| 12 | Starts (survey) | REIC survey | 26 provinces | Piling started; condo = all units in building; row housing = whole row; excludes allocated vacant plots |
| 13 | Cumulative unsold (survey) | REIC survey | 26 provinces | Units without sale contract at survey time |
| 14 | Completed unsold (survey) | REIC survey | 26 provinces | Unsold and construction complete |
| 15 | Foreign condo ownership | DOL | National | Sale transfers to foreigners/foreign juristic persons (≤49 % rule) |
| 16 | Housing price index | REIC | BKK + Nonthaburi, Pathum Thani, Samut Prakan | See §7 |
| 17 | HDSI | REIC | BKK + 5 provinces | Quarterly since Q4/2550; current & 6-month expectation; 6 questions; listed : non-listed weight 60:40 |
| 18 | Refinance | DOL | National | Redemption + new mortgage; lender groups bank / cooperative / other |

**Coverage inconsistency [Verified across sources]:** survey provinces are "26" (S7, 2020), "18 main regional provinces" (S4, 2026), and "27 provinces" (REIC Exclusive Member, S13). Sets and dates of change are **[Uncertain]**.

---

## 7. Index methodology evidence

### 7.1 New housing (detached + townhouse) price index, BMR [Documented S8, S7]

- Coverage: Bangkok, Nonthaburi, Pathum Thani, Samut Prakan (4 provinces).
- Population: **new** housing-estate projects **still on sale with ≥6 unsold units**; second-hand excluded.
- Sample: **purposive, 245** samples.
- Price: "ราคาขายที่แท้จริง" = **advertised selling price minus promotions** (air-con, furniture, cash discount, transfer fees); excludes loose furniture. ⇒ **Promotion-adjusted offering price, not a registered transaction price.**
- Base year **2555 = 100**; data collected in the **middle month of each quarter** (Feb/May/Aug/Nov).
- Projects falling below 6 unsold units are **replaced by new projects in nearby locations**.
- Formula: not stated in S8 [Uncertain].
- Latest public headline: **Q2/2569 = 131.2** (−0.9 % YoY; +0.2 % QoQ), published 7 Jul 2569 [Verified S16 /1941].

### 7.2 New condominium price index, BMR [Documented S9, S7]

- Coverage: Bangkok, Nonthaburi, Samut Prakan.
- History: **half-yearly from H1/2554 (base 2553)** → **H2/2556 rebased to 2555 and coverage expanded** from Bangkok only to 3 provinces → **quarterly from Q1/2558** (base 2555).
- Population: condo projects on sale with ≥6 unsold units; second-hand excluded; replacement rule as §7.1.
- Sample (S7): **simple random sampling, 150** samples; price net of promotions.
- Calculation: starting prices of studio / 1-bed / 2-bed → average price per m² per type → weighted by project salable area → project average → area/province weights → **Chain Laspeyres**.
- Latest public headline: **Q2/2569 = 161.7** (+1.6 % YoY; +0.6 % QoQ) [Verified S16 /1942].
- Note: the automated PDF summariser initially described this index as "transaction-price based"; **that statement was wrong** and was discarded after reading the PDF directly.

### 7.3 Undeveloped vacant land price index, BMR [Documented S10]

- Coverage: Bangkok, Nonthaburi, Pathum Thani, Samut Prakan, Samut Sakhon, Nakhon Pathom (6 provinces).
- Data: **DOL vacant-land transfer records**; land without buildings, **≥200 sq wa**, and only transfers where **transferor or transferee is a juristic person** ("because most reflect actual sale prices", since companies must book costs correctly for tax).
- Calculation: **Chain Laspeyres**; average price per sq wa weighted by transfer value 2555–2559; **multiple regression** with factors (1) land location, (2) land-use plan (ผังเมือง), (3) mass-transit line passing.
- Base **2555**, quarterly.
- Latest public headline found on a detail page: **Q2/2568 = 415.2** (+4.3 % YoY; −4.1 % QoQ) [Verified S16 /1901]; later quarters are listed only as member PDFs (Q4/2568, Q1/2569, Q2/2569 "edit").
- Whether "price" = DOL registered capital value (§6.3 #4) is **[Assumption]** (S10 says "transfer data", not which value field).

### 7.4 EEC housing price index [Documented S19]

- Coverage: **Chonburi, Rayong, Chachoengsao — published per province** and for the 3-province aggregate.
- Types: overall housing estate, detached, semi-detached, townhouse (per province).
- Population: new projects on sale ≥6 unsold units; excludes second-hand.
- Sample: purposive, **250**; price net of promotions; **base 2565**.
- Q2/2569: EEC 126.4 (+0.5 % YoY, 0.0 % QoQ); Chonburi 130.5; Rayong 122.1; Chachoengsao 122.3. Quarterly series from Q1/2565 shown in charts. [Verified]
- Also publishes promotion mix (gifts 45.0 %, free transfer costs 41.6 %, cash discount 13.4 %).

### 7.5 Other indices (not methodologically reviewed)

| Index | What is documented | Status |
|---|---|---|
| Composite real-estate market index (residential), Thailand | Quarterly; Q3/2566 = 82.5 (−8.9 % QoQ, −13.6 % YoY) [Verified S16 /1855]; relates to GDP in commentary | Components, base, weights **[Uncertain]** |
| EEC condo price index | Quarterly; methodology PDF exists | **[Uncertain]** (not read) |
| EEC vacant land price index | Quarterly; methodology PDF "Q2-2024" exists | **[Uncertain]** (not read) |
| HDSI | §6.3 #17 | Sentiment, not price |
| HPCI (BMR) | Quarterly; methodology PDF exists | Sentiment, not price |
| HCCI | Quarterly; methodology PDF exists | Cost index, not market value |
| Construction-material wholesale price index | Monthly; listed under "other" | Origin likely Ministry of Commerce [Assumption] |

---

## 8. Press-release content samples [Verified]

### 8.1 H1/2569 national housing market (S17, 27 Aug 2569)

- National residential transfers H1/2569: **167,665 units (+17.6 % YoY), THB 429,839 m (+9.8 %)**; H1/2568: 142,619 units, THB 391,601 m.
- Low-rise 111,624 units / THB 299,432 m; condo 56,041 units / THB 130,407 m.
- Second-hand 63 % vs new 37 % (share); price-band shares (2.01–3.00 m = 24 %; ≤1.00 m = 27 %).
- Foreign condo transfers 6,533 units / THB 28,267 m; top nationalities with named provinces.
- Outstanding individual housing loans THB 5,174,141 m; new loans THB 289,315 m.
- **Forecasts** under stated assumptions (GDP 2.25 %, MRR 6.55 %, inflation 1.75 %): 2569 transfers 323,479 units / THB 880,760 m; 2570 THB 908,358 m. Mentions new Treasury appraisal cycle 2570–2573 effective 1 Jan 2570.
- Granularity: **national, low-rise vs condo, new vs second-hand, price band**. No province table.

### 8.2 Q2/2569 second-hand housing (S18, 8 Sep 2569)

- **Listing (asking) supply** compiled from property listing websites, public/private FIs, AMCs, **and LED** (via taladnudbaan.com); **transfers** from DOL.
- Tables: listings by **region** (7 regions), **top-10 provinces** (units, value, **average asking price per unit**), type, price band, **seller type** (individuals/agents 70,542; **LED 61,646 units**; AMCs; commercial banks; SFIs); transfers by region, top-10 provinces, type, price band.
- Example: Bangkok listed second-hand 55,412 units, THB 521,431 m, avg asking **9.4 m/unit**; Bangkok second-hand transfers Q2/2569 13,910 units, THB 38,295 m.
- Copyright line: *"การนำข้อมูลที่ปรากฏในรายงานฉบับนี้ไปใช้งาน หรือเผยแพร่ต่อ ไม่ว่าแต่เพียงบางส่วนหรือทั้งหมด กรุณาอ้างอิง 'ศูนย์ข้อมูลอสังหาริมทรัพย์' เป็นแหล่งที่มาของข้อมูลด้วย"* (use or redistribution, in part or whole — please cite REIC).
- **Double-counting risk:** LED properties are a large share of REIC's second-hand listing supply.

### 8.3 Field observations for structured extraction

- Periods use Thai BE with quarter/half notation (`Q2/2569`, `H1/69`, `ก.ค. 69`).
- Values: units; THB million ("ลบ."); percentages with YoY/QoQ; index points; averages in THB million per unit.
- Province names in Thai; region grouping "กรุงเทพฯ-ปริมณฑล" is REIC-defined (not an administrative region). BMR definition varies by indicator (3, 4, 5 or 6 provinces).
- No province/amphoe codes, no project IDs, no coordinates in any public document read.
- Extraction from PDFs is technically feasible but **table layouts differ per report and over time** [Verified for 3 samples / Assumption for others].

---

## 9. Licensing & terms findings

### 9.1 Terms & Conditions, effective "ฉบับปรับปรุง 1 มิถุนายน 2565" [Verified S11]

1. Content on the site — "ข้อมูลประเภทข้อความ/ข้อเขียน แผนที่ รูปภาพ … และสิ่งอื่นๆ" — is protected by copyright/IP of REIC; **"ห้ามมิให้มีการทำซ้ำ และแก้ไขสิ่งหนึ่งสิ่งใดในเว็บไซต์นี้ หรือนำข้อมูลทั้งหลาย … ไปเผยแพร่ โดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษร"** (no reproduction, modification or publication without written consent).
2. §2.1: access is limited to **personal use** ("แบบส่วนบุคคล"); user agrees not to perform, **or use automated software to perform**, listed acts including 2.1.7 copying/duplicating any part of the site **to another website** without written permission, and 2.1.8 obtaining content "by any means not intended to be available on this site".
3. §3/§6: no warranty of accuracy, completeness or timeliness; not to be relied on for legal/financial decisions.
4. §2.2: REIC may suspend service without notice.
5. Governing law: Thai law.
6. The terms describe the site partly as a listing site for homes for sale (appears to be generic/legacy wording) [Verified text; interpretation Assumption].

### 9.2 Report-level notice [Verified S18, S19]

Press releases carry "คำสงวนลิขสิทธิ์": use/redistribution in part or whole — **please cite REIC as the source**. This is more permissive in wording than §9.1 but does not state commercial rights, database extraction rights, or derivative-works terms.

### 9.3 Paid products

No licence/subscription terms were visible on product pages (S12, S13). Whether member data can be stored, combined, shown to third-party users, or used commercially: **[Uncertain]**.

### 9.4 Interpretation (NOT legal advice) [Assumption]

- Systematic, automated collection of REIC web content, or redistribution of REIC tables inside another application, appears **not permitted without written consent** under §9.1.
- Citing individual published figures with attribution (e.g. a press-release headline) appears consistent with §9.2, but whether that extends to storing time series in a product database is unclear.
- **A written data-use agreement with REIC is the only clear path to production use.**

---

## 10. Cost / product evidence [Documented S12–S14; prices as shown on 2026-09-14]

| Product | Price (THB) | Contents (as documented) |
|---|---|---|
| General member (สมาชิกทั่วไป) | Not shown [Assumption: free] | Entitlements [Uncertain] |
| สมาชิกพิเศษพร้อมข้อมูลรายพื้นที่ / สมาชิกสืบค้นข้อมูลบนเว็บไซต์ | **20,000 / year** | Web search of demand, supply & price indicators for all 7 property types, "ครอบคลุมพื้นที่ทั่วประเทศ", **"ตรวจสอบข้อมูลย้อนหลังได้กว่า 10 ปี"** |
| Personalize Package — transfers | 15,000 (list 18,000) / year | Transfers BMR 5,000; national 5,000; foreign condo BMR/regional 2,000 each; refinance 2,000; long-term leases 2,000; add-ons |
| Personalize Package — field survey | 12,000 (list 20,000) / year | New sales, launches, starts, cumulative unsold, completed unsold — BMR and regional, 2,000 each |
| Personalize Package — completed & registered | 5,000 (list 6,000) / year | BMR 3,000; national 3,000 |
| Personalize Package — land allocation permits | 2,000 / year | National |
| Monthly new-launch project report (BMR) | **25,000** | Lists of new condo & housing-estate projects, expected future launches, **"รายละเอียดพิกัดที่ตั้งโครงการ"** (project location coordinates) |
| ข้อมูลสำรวจโครงการที่อยู่อาศัยรายโครงการ | **1,000** (unit of sale unclear) | Field-surveyed projects still on sale, BMR + provinces; buy whole province or selected area; **"แผนที่ตั้ง และรายละเอียดของโครงการ"** (map location & project details) |
| REIC Exclusive Member | By data volume | Project-level insight, **27 provinces**, scheduled datasets, 3–5-year supply/demand forecasts, custom area surveys, time series |
| R-MAT transfer package | By package | Transfers **by province and khet/amphoe**, new vs second-hand, housing type, price band; 1 year history; monthly update; 77 provinces |
| R-MAT Package 1 / 2 / 3 | 300,000 / 150,000 / 80,000 | Dashboard + digital map: total supply, new supply, new sales, remaining supply, **absorption rate**; integrates project survey, new launch and transfer datasets |

Whether any of these include downloadable machine-readable files or an API: **[Uncertain]** — must be asked.

---

## 11. Uncertainties & assumptions register

| # | Item | Label |
|---|---|---|
| U1 | Exact entitlements of free general membership | [Uncertain] |
| U2 | Export formats (Excel/CSV) of member statistics tables | [Uncertain] |
| U3 | Whether any REIC API or bulk feed exists for contracted customers | [Uncertain] |
| U4 | Amphoe/khet-level data outside R-MAT transfers; tambon-level data anywhere | [Uncertain] |
| U5 | Schema of project-level survey data (IDs, coordinates, developer, prices per unit type) | [Uncertain] — coordinates/map location [Documented] as product feature |
| U6 | Whether historical values are revised and whether vintages are kept | [Uncertain]; evidence of re-uploaded "edit" PDFs [Verified file names] |
| U7 | Formula/weights of composite market index, EEC condo & EEC land indices, HPCI, HCCI | [Uncertain] |
| U8 | Current survey province set (18 / 20 / 26 / 27) | [Uncertain] |
| U9 | Whether `/Upload/` falls under robots `Disallow: /upload` | [Uncertain] |
| U10 | Commercial use / storage / redistribution rights for public and paid data | [Uncertain] |
| U11 | Whether BOT open datasets republish REIC series under CC-BY | [Uncertain] |
| U12 | Land price index uses DOL registered capital value | [Assumption] |
| A1 | "Latest period" column in `/Product/Table` = next period to be released | [Assumption] |
| A2 | REIC does not publish individual transaction records | [Assumption] — none observed; REIC's DOL-derived products are aggregated |

---

## 12. Follow-up questions to put to REIC (for the project team to decide whether to ask)

1. Is there a data-licensing / API / bulk-file arrangement for organisations (formats, update cadence, SLA, price)?
2. Can licensed data be stored in our database, combined with other sources, and displayed (aggregated or raw) to our users? Commercial use?
3. What are free general-member entitlements?
4. Smallest geography available per indicator (province / khet-amphoe / tambon / project), and which admin codes are used.
5. Project survey data schema: project ID stability, coordinates, developer, unit mix, prices (asking vs net), survey dates.
6. Revision policy: are past values revised; are vintages available?
7. Current survey province list and the dates coverage changed.
8. Index methodologies not published (composite index, EEC indices), and rebasing history.
9. Robots/automation policy for `/Upload/` public PDFs.
10. Whether REIC wants to be informed that member-linked PDFs are retrievable without login (§5.4).
