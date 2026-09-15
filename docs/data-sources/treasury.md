# Data Source: Treasury Department (กรมธนารักษ์)

> **Authority note:** dated source research only. Any systematic adapter activation and current architecture are governed by docs/data-architecture.md and docs/implementation-plan.md. This university project remains Thailand-wide; regional examples are fixtures only.

- **Owner:** กรมธนารักษ์, Ministry of Finance (maintainer in open-data metadata: `pvb@treasury.go.th`)
- **Last researched:** 2026-09-14 (original research, Chon Buri) · **re-verified and extended 2026-09-15**
- **Status:** Research only — no integration decision beyond `docs/data-architecture.md`.
- **Evidence:**
  - Original research: imported into [`research/treasury/api-investigation.md`](../../research/treasury/api-investigation.md) from the prior research workspace; the external workspace is not required for this handoff.
  - Live re-verification: [`research/data-requirements-source-investigation/00-treasury-verification.md`](../../research/data-requirements-source-investigation/00-treasury-verification.md)

> Labels: **[Verified]** observed live on 2026-09-15 · **[Prior-research]** stated in the original research, not re-tested · **[Assumption]** · **[Unknown]**
>
> **History note:** until 2026-09-15 this file was empty in this repository, and other repo documents therefore treated Treasury as "not researched". That was a repository-state issue, not a research gap.

---

## 1. What Treasury provides

| Dataset | Content | Access | Status |
|---|---|---|---|
| **ราคาประเมินที่ดิน** (`land-valuation`) | Assessed land value per parcel: `UTMMAP1`, `UTMMAP2`, `UTMMAP3`, `UTMMAP4`, `UTMSCALE`, `LAND_NO`, `EVAPRICE` | CKAN CSV per province (`catalog.treasury.go.th`, harvested to data.go.th); datastore API | [Verified] |
| **ราคาประเมินสิ่งปลูกสร้าง** (`building-valuation`) | Assessed building value by building type × province: `ID_CONSTR`, `NAME_CONSTR`, `CHANGWAT_CODE`, `CHANGWAT_NAME`, `PRICE_CONSTR` | Single CSV `construct_all_20240805.csv` | [Verified] |
| Parcel geometry pathway (`DS_TRANSIT` → `GIS5_Q_PARCEL` → `SHAPE`) | Parcel polygon, SRID 24047/24048, `RAWANG` | Internal web-application route of `assessprice.treasury.go.th` | [Prior-research]; access nature corrected below |
| Direct ArcGIS MapServer | — | Token-gated | [Prior-research] — not to be used |

## 2. Verified facts

| Topic | Finding |
|---|---|
| Purpose (land) | "ราคาประเมินที่ดินเพื่อประโยชน์แห่งรัฐ ในการจัดเก็บภาษีที่ดิน ตาม พรบ ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562" [Verified] |
| Licence | **Open Data Common** (both datasets) [Verified] |
| Update frequency | Every **4 years** [Verified metadata] |
| Coverage | **National — 77 provincial CSV files** for land [Verified]. The original research investigated Chon Buri |
| Chon Buri land file | `land_20_chon-buri.csv`, 38,701,426 B, Last-Modified 2026-05-08, **984,881 rows** [Verified] |
| Fields present | Map sheet (`UTMMAP1–4`, `UTMSCALE`), land number (`LAND_NO`), value (`EVAPRICE`) [Verified] |
| Fields **absent** | Deed (โฉนด) number, tambon/amphoe/province names, land area, coordinates [Verified] |
| Data quality | Some rows have empty `EVAPRICE` [Verified]. The data.go.th **datastore API converts identifiers to numbers and strips leading zeros** (`0632` → `632`); use the CSV text [Verified] |
| Building values (Chon Buri) | 69 building types, e.g. `402 ตึกแถวสองชั้น 8300`, `510 ภัตตาคาร 6950` [Verified] |
| Units | Not stated in metadata. THB/sq wa (land) and THB/m² (building) presumed [Assumption] |
| Appraisal cycle of current files | **Unknown.** A new cycle 2570–2573 takes effect 1 Jan 2570 (per REIC research) |
| `RAWANG` needed for parcel disambiguation | [Prior-research] |
| Geometry SRID 24047/24048 → reproject to WGS84 | [Prior-research] |
| Validate a geometry candidate against `EVAPRICE` | [Prior-research — design step] |

## 3. Correction to the original research: DS_TRANSIT

The original research describes DS_TRANSIT as "a public DS_TRANSIT endpoint". Read-only inspection of the public web application's JavaScript (2026-09-15) shows DS_TRANSIT is the application's **internal data-service route**. Its requests carry a **`CSRF_TOKEN` read from the session cookie** and a `guestId`. No API documentation or terms were found [Verified — code inspection; the route was not called].

**Consequence:** under this project's rule of not bypassing tokens or access controls, DS_TRANSIT is **not an approved integration path** unless Treasury confirms it may be used. This is recorded as an open decision; it doesn't contradict the original finding that the pathway *exists*.

## 4. Matching

| From | To Treasury value | Feasible? |
|---|---|---|
| User supplies map sheet (ระวาง) + land number (เลขที่ดิน), e.g., from the title deed | Exact row lookup on `UTMMAP*` + `UTMSCALE` + `LAND_NO` | **Yes** [Verified fields]; that users can read these from a deed is [Assumption]; key uniqueness without `RAWANG` [Unknown] |
| LED record (deed no. + admin names) | — | **No direct join** — LED doesn't carry map sheet or land number, and Treasury carries neither deed no. nor admin names [Verified] |
| Coordinates / pin | Parcel → value | Only with parcel geometry; **no approved public geometry path verified** |
| Tambon / amphoe | Area summary | **No** — rows have no admin names [Verified] |

## 5. Role in the system

- **Official assessed land value** for a specific parcel, when the user provides map sheet + land number. Measure type: *assessed* (never market value).
- **Official building value per m²** by type and province, as a **reference anchor** for capex assumptions. Labelled "assessment value, not construction cost".
- **Not** a location source for MVP (no approved geometry path).

## 6. Integration constraints (from original research, still valid)

- Paginate and respect rate limits; don't bulk-fetch without an operational plan.
- Preserve original identifiers as text, declared SRID, transformation method, request details and validation result.
- A geometry result isn't automatically an exact parcel match; `RAWANG` and value validation are required.
- Don't derive coordinates from `LAND_NO` or `UTMMAP*`.
- Don't bypass tokens or access controls.

## 7. Open questions

1. `EVAPRICE` unit and the appraisal cycle represented by current files.
2. Uniqueness of `UTMMAP1–4 + UTMSCALE + LAND_NO` within a provincial file; role of `RAWANG`.
3. Permission to use DS_TRANSIT, or another official parcel-geometry route (e.g., DOL LandsMaps API credentials).
4. Handling of blank `EVAPRICE` rows.
5. Refresh at the 1 Jan 2570 cycle change.
