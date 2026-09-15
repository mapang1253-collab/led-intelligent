# Treasury — Reconciliation and Live Verification

> **HISTORICAL SOURCE INVESTIGATION.** This file records the repository state and source checks observed on 2026-09-15. The referenced files have since been restored. Current nationwide scope, source roles and activation rules are governed by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md). Chon Buri is a research fixture only.

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Why this file exists:** At the start of the Phase 3 investigation, the repository classified Treasury as "Unknown / not researched" because its two Treasury files appeared as **0 bytes**. The project owner stated that Treasury had been researched. This file records the reconciliation, the live re-verification and the discrepancies. The populated copies now included in this handoff supersede that file-state problem.
- **Method:** File-system inspection; plain HTTPS requests to public open-data endpoints (`curl`, identifying User-Agent, ≤1 request/second); inspection of the public web application's JavaScript bundle (read only). **No token-bearing or session-bearing endpoint was called.**

> Labels: **[Verified-live]** observed in a request on 2026-09-15 · **[Prior-research]** stated in the Codex-folder Treasury research, not re-tested here · **[Assumption]** · **[Not tested]**

---

## 1. Where the Treasury research is

| Location | State |
|---|---|
| Current repository copy of `docs/data-sources/treasury.md` at investigation start | 0 bytes; now restored and populated |
| Current repository copy of `research/treasury/api-investigation.md` at investigation start | 0 bytes; now restored and populated |
| Prior research-workspace copy of `docs/data-sources/treasury.md` | **3,444 bytes — populated** (created 2026-09-14 21:00) |
| Prior research-workspace copy of `research/treasury/api-investigation.md` | **4,201 bytes — populated** |

The prior workspace was a separate documentation package. It is not required by this handoff; the relevant Treasury research and its re-verification are now stored inside this repository.

**Conclusion:** Treasury *was* researched, but outside this repository. The earlier repo statement "Treasury has not been researched" was accurate about **this repo's files** but wrong about **the project**. Architecture decisions that depended on "Treasury Unknown" must be revisited (§6).

## 2. What the prior research states [Prior-research]

1. Treasury CKAN holds Chon Buri land-valuation data with fields `UTMMAP1`, `UTMMAP2`, `UTMMAP3`, `UTMMAP4`, `UTMSCALE`, `LAND_NO`, `EVAPRICE`.
2. A "public DS_TRANSIT endpoint" provides a path to parcel data; `GIS5_Q_PARCEL` supplies `SHAPE` geometry.
3. `RAWANG` must be used to disambiguate parcels.
4. Geometry is SRID 24047 or 24048; reproject to WGS84.
5. Validate a candidate parcel against CKAN `EVAPRICE`.
6. The direct ArcGIS `MapServer` is token-gated; not to be used.
7. Exact request URLs and parameters were **not retained** ("This document intentionally does not fabricate them").

## 3. Live verification

### 3.1 Land valuation dataset — **verified, and broader than recorded**

```
GET https://data.go.th/api/3/action/package_show?id=land-valuation
→ HTTP 200
```

| Metadata | Value [Verified-live] |
|---|---|
| Title | ราคาประเมินที่ดิน |
| Publisher | กรมธนารักษ์ (maintainer `pvb@treasury.go.th`) |
| Description | ราคาประเมินที่ดินเพื่อประโยชน์แห่งรัฐ ในการจัดเก็บภาษีที่ดิน ตาม พรบ ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562 |
| Licence | **Open Data Common** |
| Update frequency | every **4 years** (`update_frequency_unit: ปี`, interval 4) |
| Geographic coverage | จังหวัด |
| Resources | **77 CSV resources — one per province** (e.g. `land_10_bangkok.csv`, `land_20_chon-buri.csv`, `land_21_rayong.csv`) |
| Host | `catalog.treasury.go.th` (Treasury's own CKAN, harvested by data.go.th) |
| metadata_modified | 2026-06-25 |

Chon Buri file:

```
HEAD https://catalog.treasury.go.th/dataset/f5072145-2f1a-4500-bf60-d122b866ac2f/resource/26af9fa1-75f5-442e-bf45-4aabbae47c6a/download/land_20_chon-buri.csv
→ HTTP 200, Content-Type text/csv, Content-Length 38,701,426, Last-Modified Fri, 08 May 2026 03:17:51 GMT
```

Response (first rows):

```csv
UTMMAP1,UTMMAP2,UTMMAP3,UTMMAP4,UTMSCALE,LAND_NO,EVAPRICE
5235,3,2638,00,4000,6079,8000.00000000
5134,1,0632,10,1000,234,15000.00000000
5235,4,2682,00,4000,2771,11000.00000000
...
5135,1,1676,13,1000,38,
```

Datastore API (same resource):

```
GET https://data.go.th/api/3/action/datastore_search?resource_id=26af9fa1-75f5-442e-bf45-4aabbae47c6a&limit=3
→ HTTP 200, total 984,881
  {'UTMMAP1': 5235, 'UTMMAP2': 3, 'UTMMAP3': 2638, 'UTMMAP4': 0, 'UTMSCALE': 4000, 'LAND_NO': 6079, 'EVAPRICE': 8000}
  {'UTMMAP1': 5134, 'UTMMAP2': 1, 'UTMMAP3': 632,  'UTMMAP4': 10, 'UTMSCALE': 1000, 'LAND_NO': 234, 'EVAPRICE': 15000}
```

Findings:

| # | Finding | Label |
|---|---|---|
| T1 | Fields match the prior research exactly | Verified-live |
| T2 | Coverage is **national (77 provincial files)**, not Chon Buri only. The prior research investigated Chon Buri; it did not claim other provinces were absent | Verified-live |
| T3 | Chon Buri has **984,881 rows** | Verified-live |
| T4 | **No tambon/amphoe name, no deed (โฉนด) number, no coordinates, no land area** in the file | Verified-live |
| T5 | Parcel key = map sheet (`UTMMAP1`–`4`, `UTMSCALE`) + `LAND_NO` (เลขที่ดิน) | Verified-live |
| T6 | Some rows have **empty `EVAPRICE`** | Verified-live |
| T7 | **The data.go.th datastore API casts the identifiers to numbers**, stripping leading zeros (`0632` → `632`, `00` → `0`). Identifier matching must use the CSV text, not datastore values | Verified-live |
| T8 | `EVAPRICE` unit is not stated in metadata. THB per square wa is the usual unit for Thai land assessment | **Assumption** — confirm |
| T9 | Which appraisal cycle the file represents is not stated in metadata. A new cycle 2570–2573 starts 1 Jan 2570 (per REIC research) | **Unknown** |
| T10 | Whether `UTMMAP*` + `LAND_NO` is unique within a province without `RAWANG` or a land-office code | **Not tested**; prior research says `RAWANG` is needed for disambiguation |

### 3.2 Building valuation dataset — **new; not in prior research**

```
GET https://data.go.th/api/3/action/package_show?id=building-valuation   → HTTP 200
GET https://catalog.treasury.go.th/dataset/83038253-61e8-431e-947b-6931cc689c3a/resource/cf687667-5386-4813-8062-429fb0cd4acf/download/construct_all_20240805.csv
→ HTTP 200, 519,788 B, 5,313 data rows
```

```csv
ID_CONSTR,NAME_CONSTR,CHANGWAT_CODE,CHANGWAT_NAME,PRICE_CONSTR
105,บ้านพักอาศัยตึกสองชั้น,90,สงขลา,8350
```

Chon Buri (`CHANGWAT_CODE=20`): **69 building types**, e.g. `201 บ้านแถว (ทาวน์เฮาส์) ชั้นเดียว 7600`, `402 ตึกแถวสองชั้น 8300`, `509/2 สำนักงาน ความสูงเกินกว่า 5 ชั้นขึ้นไป 8800`, `510 ภัตตาคาร 6950`. Licence Open Data Common; frequency 4-yearly; URL field `https://assessprice.treasury.go.th`.

Unit is not stated; THB per m² is presumed [Assumption]. These are **assessment standard building values** for the land and building tax — not construction contract costs.

### 3.3 DS_TRANSIT — **not a published public API**

The public web application `https://assessprice.treasury.go.th/` loads `./assets/index-Bt4nObq7.js` (3.9 MB). Read-only inspection of that bundle shows:

```
... "DS_TRANSIT"].join("/"),guestId:2};
... "DS_TRANSIT"}reqUrl(e,t,i){try{(t=t||{}).CSRF_TOKEN=Yu("CSRF_TOKEN"), ...
... "GIS5_Q_PARCEL",Object.assign(i,this.session.log)).query() ...
https://assessprice.treasury.go.th/assessprice/ashx/Proxy.ashx?
https://npvc.treasury.go.th/arcgis/rest/services/...
... RAWANG:t.RAWANG,UTMMAP:t.UTMMAP,UTMMAP4:t.UTMMAP4,UTMSCALE:t.UTMSCALE,LAND_NO:t.LAND_NO ...
```

| Finding | Label |
|---|---|
| `DS_TRANSIT` is the **internal data-service route of the web application**. The request builder attaches a `CSRF_TOKEN` read from the browser session cookie, plus a `guestId` and session log object | Verified-live (code inspection) |
| `GIS5_Q_PARCEL` is a query name used through that route; `RAWANG` is a field in its results | Verified-live (code inspection) |
| No API documentation, terms of use or published contract for `DS_TRANSIT` was found | Verified-live (absence in the pages inspected) |
| The route **was not called** in this investigation | By design |

**Discrepancy D-T1:** the prior research calls DS_TRANSIT a "public endpoint". What we observed is an **undocumented web-application service that requires a session CSRF token**. Under this project's rule ("do not bypass authentication, CAPTCHA, tokens, or access controls"), it should **not** be treated as an approved integration path unless Treasury confirms it may be used, or publishes it. Whether obtaining a guest session through the normal page load counts as "bypassing" is a judgement call for the project owner. This investigation takes the conservative reading.

### 3.4 Other parcel-geometry paths tested (for completeness)

| Path | Result | Label |
|---|---|---|
| GISTDA ArcGIS `EEC_Public/EEC_PacelsRec/MapServer` layer 1 "ชลบุรี" (description: รูปแปลงที่ดิน…ใช้สำหรับจัดทำแผนผังการพัฒนาเขตพัฒนาพิเศษภาคตะวันออก) | **Raster Layer** (image only, `fields: null`); point queries return `400 Invalid or missing input parameters` | Verified-live |
| GISTDA `EEC_Public/EEC_Pacels/MapServer` layer 0 "บ้านฉาง" | Vector polygons with `LAND_NO`, `UTMMAP1–4`, `UTMSCALE`, `PARCEL_SEQ`, `AMP_ID`… — **Ban Chang (Rayong) only**; not Chon Buri | Verified-live (layer schema) |
| DOL LandsMaps API (gdcatalog `gdpublish-mapland-parcel`) | Requires an organisational request letter + DOL-issued Consumer-Key/Secret; 100,000 requests/day/organisation; licence not specified | Documented (catalog page); **not tested** |

## 4. What Treasury provides — corrected summary

| Capability | Status |
|---|---|
| Parcel-level assessed land value, nationwide, CSV, open licence | **Available** (verified) |
| Assessed building value per m² by building type × province | **Available** (verified) |
| Join key from a property to its assessed value | Map sheet + land number (`UTMMAP*`, `UTMSCALE`, `LAND_NO`) — **not** deed number, **not** address |
| Admin area of a valuation row | **Not in file** |
| Parcel geometry / coordinates | **No approved public path verified** (DS_TRANSIT token-bearing; GISTDA Chon Buri raster only; DOL API needs agency credentials) |
| Update | 4-yearly cycle; current cycle represented by the file: **Unknown** |

## 5. Discrepancies with existing documentation

| ID | Existing statement | Where | New evidence | Effect |
|---|---|---|---|---|
| D-T0 | "Treasury has not been researched"; all Treasury capabilities Unknown | `docs/data-architecture.md` header, §9, AD-15, OD-1; `research/data-architecture/data-requirements.md` §0; `docs/data-persistence-and-lifecycle.md` §5.2 | Treasury research exists (Codex folder) and core claims re-verified live | Treasury moves from Unknown to **partially verified** |
| D-T1 | "A public DS_TRANSIT endpoint is available" | Codex `treasury.md`, `api-investigation.md` | Internal app route with session CSRF token | Not an approved path under project rules |
| D-T2 | Treasury research is scoped to "Chon Buri" | Codex `treasury.md` title | Dataset is national | Scope was an investigation choice, not a data limit |
| D-T3 | LED ↔ Treasury join "Deed no. + tambon + amphoe + province → Treasury per-parcel/per-unit assessed price" [Assumption] | `docs/data-sources/led.md` §12 | Treasury file has **no deed number and no admin names**; key is map sheet + land number, which LED records do **not** carry | **Direct LED → Treasury join is not possible** with verified fields |
| D-T4 | Treasury join key "U"; candidate "title type + number + land-office jurisdiction" | `docs/data-architecture.md` §6.4 | Key is `UTMMAP1–4 + UTMSCALE + LAND_NO` (+ `RAWANG` per prior research) | Update T-ladder |
| D-T5 | Codex data-architecture describes LED only as `led_it_0002` aggregate | Codex `docs/data-architecture.md` | This repo's LED research (per-property announcements/results) is more complete | No change to this repo; Codex LED view is superseded |

## 6. Implications

1. **Exact assessed value is obtainable without geometry** if the user supplies the map sheet and land number. Those values appear on a Thai title deed [Assumption — general knowledge; confirm with a sample deed image]. This makes the Treasury value a **USER INPUT → exact lookup** flow, not a spatial match.
2. LED items can't be linked to Treasury values from LED fields alone. For an LED item, the Treasury value needs user- or analyst-supplied map sheet + land number (e.g., from the deed copy).
3. Treasury **building** values give an official per-m² reference by building type for Chon Buri, usable as a **reference** input for replacement-cost/capex scenarios, labelled "assessment standard, not construction cost".
4. Parcel geometry — and therefore frontage, shape and point-level OSM features from an authoritative anchor — remains **unavailable through an approved public path** for Chon Buri.

## 7. Open items

1. Confirm `EVAPRICE` unit and the appraisal cycle of the current files (ask `pvb@treasury.go.th` or read `assessprice.treasury.go.th` FAQ).
2. Test uniqueness of `UTMMAP*`+`UTMSCALE`+`LAND_NO` within the Chon Buri file (offline, on the downloaded CSV).
3. Project-owner decision on DS_TRANSIT (D-T1): do not use / ask Treasury / accept as a public web service.
4. Whether a university project can obtain DOL LandsMaps API credentials.
5. Import the Codex Treasury research into this repository (done in this change set — see `docs/data-sources/treasury.md`).
