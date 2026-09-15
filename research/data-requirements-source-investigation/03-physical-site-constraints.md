# 3. Physical Site Constraints — Source Investigation

> **HISTORICAL REGIONAL SOURCE INVESTIGATION.** Chon Buri/EEC is the research and validation fixture in this file, not the product boundary. Current nationwide scope, physical-method governance and activation requirements are defined by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/validation-architecture.md`](../../docs/validation-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Test area / points:** Chon Buri. P-A Mueang Chon Buri 13.3611, 100.9847 · P-B Si Racha 13.1737, 100.9311 · P-C Bang Saen 13.2830, 100.9270
- **Method:** Public ArcGIS REST, public cloud object storage, catalog pages. Raster/vector values were extracted locally with throwaway research tooling in the session scratchpad (not in the repository). No authentication bypassed.

> Labels: **[Verified-live]** · **[Documented]** · **[Assumption]** · **[Not tested]**

---

## 1. Why this category matters

HBU **gate 2** (physically possible) and part of risk (Q5, Q17). Gaps G1 (location anchor), G8 (parcel physical facts) and G9 (hazard) were ranked Critical/High/Medium ([`docs/data-architecture.md`](../../docs/data-architecture.md) §10).

The test each candidate must pass: *can it tell whether a site physically supports a use concept, or change the cost/risk of that concept?*

---

## 2. Land area, parcel shape, frontage — parcel geometry

| Candidate | Result | Label |
|---|---|---|
| **Treasury land valuation CSV** | Parcel key + assessed value only; **no area, no geometry** | Verified-live ([00-treasury-verification.md](00-treasury-verification.md) §3.1) |
| **Treasury DS_TRANSIT / `GIS5_Q_PARCEL`** | Internal web-app route requiring a session CSRF token. **Not called** | Verified-live (code inspection) |
| **GISTDA `EEC_Public/EEC_PacelsRec` layer 1 ชลบุรี** (DOL-sourced parcels for EEC planning) | **Raster layer** — `fields: null`, point queries return `400 Invalid or missing input parameters` | Verified-live |
| **GISTDA `EEC_Public/EEC_Pacels` layer 0 บ้านฉาง** | Vector parcels with `LAND_NO`, `UTMMAP1–4`, `UTMSCALE`, `AREA`, `PARCEL_SEQ`… — **Ban Chang (Rayong) only** | Verified-live (schema) |
| **DOL LandsMaps API** (`gdcatalog.go.th/dataset/gdpublish-mapland-parcel`) | Parcel boundary, coordinates, area, appraised value per parcel. Access: organisational request letter + DOL-issued Consumer-Key/Secret; 100,000 req/day/organisation; licence not specified | Documented (catalog); **not tested** |
| **LED** (existing) | Land area in rai/ngan/wa for LED items; sketch-map JPEGs | Existing research |
| **OSM** (existing) | No parcels | Existing research |

**Conclusion:**
- **Land area:** available for LED items (existing) or from the user's title deed (**user input**).
- **Parcel shape and frontage:** **not available** through any approved public path tested for Chon Buri. Frontage/shape must be **user input** (or derived later if parcel geometry becomes available).

---

## 3. Road access and road width

| Candidate | Result |
|---|---|
| OSM roads (existing) | Road class near a point; `width`/`lanes` rarely tagged; **not legal access** (existing research) |
| GISTDA EEC land-use service layers 4 โครงข่ายถนนEEC, 7 โครงข่ายถนน | Present [Verified-live: layer list]; attributes **not tested** |
| Department of Highways / Rural Roads datasets | **Not tested** |

**Classification:** legal road access and road width → **USER INPUT**. Proximity to road class → **DERIVED** from OSM (existing).

**Why road width matters beyond access:** Thai building-control rules commonly link permitted building types (e.g., large or high-rise buildings) to adjacent road width [Assumption — general regulatory knowledge; rule text not researched here]. That makes road width a potential **legal** input, not just physical.

---

## 4. Slope / elevation — Copernicus DEM GLO-30

| Item | Finding |
|---|---|
| Authoritative owner | European Space Agency / Copernicus programme (global DEM); distributed via AWS Open Data |
| Registry | `https://registry.opendata.aws/copernicus-dem/` [Verified via search] |
| Licence | "GLO-30 Public and GLO-90 are available on a free basis for the general public under the terms and conditions of the Licence" (readme links to the licence) [Verified-live: readme text]. Licence text itself **not read** |
| Auth | **None** (public HTTPS on S3) [Verified-live] |
| Format | Cloud-Optimized GeoTIFF, 1° tiles, 3600×3600 px, float32, pixel 1 arc-second (~30 m) [Verified-live] |
| Nature | **Surface model (DSM)** — includes buildings and vegetation, not bare earth [Documented in product name `DSM`] |
| History / update | Static product; tile `Last-Modified: 09 May 2022` [Verified-live] |

**Real request:**

```
GET https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N13_00_E100_00_DEM/Copernicus_DSM_COG_10_N13_00_E100_00_DEM.tif
→ HTTP 200, 29,692,359 B, Last-Modified Mon, 09 May 2022 14:04:56 GMT
```

**Result (values read locally; slope via 3×3 Horn method):**

| Point | Elevation (DSM) | Slope |
|---|---|---|
| P-A Mueang Chon Buri | **4.6 m** | 1.33° |
| P-B Si Racha | **13.1 m** | 0.49° |
| P-C Bang Saen | **8.6 m** | 4.30° |

**Evaluation:**
- In built-up areas, DSM slope reflects **buildings**, not terrain (P-C's 4.30° may be a building edge or a hill — unknown). Slope for small urban parcels is **low confidence**.
- Useful for **low-lying site** flags (flood-risk context) and for hillside/rural parcels.
- **Improves Best Potential Use?** Marginally for flat urban Chon Buri; more for hillside sites. **MVP:** optional, low priority.
- GISTDA `L14_Elevation` returned `499 Token Required` [Verified-live] — not used.

---

## 5. Flood risk — GISTDA recurring flood areas 2005–2016

| Item | Finding |
|---|---|
| Authoritative owner | GISTDA (สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ), satellite-derived flood extents |
| Endpoint | `https://gistdaportal.gistda.or.th/data/rest/services/FL_Flood/FL_RepeatedFlooding_GISTDA_50k_Y2005_Y2016/MapServer/0` (also a FeatureServer) |
| Description / copyright | "พื้นที่น้ำท่วมซ้ำซาก ปี 2005 -2016" / copyright **GISTDA** [Verified-live] |
| Fields | `year2005` … `year2016`, `flood_freq`, `area_rai`, `tb_idn`, `tb_tn`, `ap_tn`, `pv_tn` … [Verified-live] |
| Auth | None [Verified-live] |
| Open-data catalog | `opendata.gistda.or.th` dataset `disasters-01` "ข้อมูลพื้นที่น้ำท่วมซ้ำซาก", licence **Open Data Common**, format API [Verified-live] |
| Newer API | `https://api-gateway.gistda.or.th/api/2.0/resources/features/flood/30days` → `HTTP 407 {"detail":"Authentication Required"}`; documented as requiring an API key [Verified-live / Documented] |

**Real requests:**

```
GET .../FL_RepeatedFlooding_GISTDA_50k_Y2005_Y2016/MapServer/0/query
    ?geometry=100.85,12.60,101.75,13.60&geometryType=esriGeometryEnvelope&inSR=4326
    &spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json
→ HTTP 200 {"count":17416}

GET .../query?geometry=100.9847,13.3611&geometryType=esriGeometryPoint&inSR=4326&...&outFields=*&f=json
→ HTTP 200, features: 0          (P-A not inside a recorded recurring-flood polygon)
```

**Evaluation:**

| Criterion | Assessment |
|---|---|
| Granularity | Flood polygon (1:50,000 scale per service name) |
| Coverage | National service; 17,416 polygons intersect the Chon Buri bounding box (the box also overlaps neighbouring areas) |
| History | 2005–2016, per-year flags; **not updated since 2016** as a layer |
| Meaning | **Observed historical flooding**, not a hazard model or return period. "No polygon" ≠ "no flood risk" |
| Improves Best Potential Use? | **Yes** as a risk flag (ground-floor uses, storage, capex for flood protection) |
| MVP | **Suitable** as a labelled historical-flood flag |

---

## 6. Existing structures — building footprints

### 6.1 Microsoft Global ML Building Footprints

```
GET https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv
→ HTTP 200, 7,171,802 B; Thailand rows: 142 quadkeys (UploadDate 2026-02-23)

GET https://minedbuildings.z5.web.core.windows.net/global-buildings/2026-02-03/global-buildings.geojsonl/RegionName=Thailand/quadkey=132203311/part-...csv.gz
→ HTTP 200, 108,881,578 B
```

| Result | Value |
|---|---|
| Features in quadkey 132203311 (covers P-A) | **1,318,422** |
| Footprints with centroid within 500 m of P-A | **903** |
| Properties | `{"height": -1.0, "confidence": -1.0}` — **no height, no confidence, no use** |

| Item | Finding |
|---|---|
| Owner | Microsoft (ML-derived from imagery) |
| Auth | None [Verified-live] |
| Licence | ODbL is the licence Microsoft states for this dataset [**Assumption** — licence page not read in this session] |
| Evaluation | Better completeness than volunteer mapping is plausible; **no building use, floors or condition** |
| Improves Best Potential Use? | **Moderately** — built density around a site; "is the parcel already built" only with parcel geometry |
| MVP | **Optional.** OSM buildings already exist in the architecture. Adopt only if an OSM completeness check shows a material gap in the study area |

### 6.2 Other

| Candidate | Status |
|---|---|
| OSM `building=*` (existing) | Existing research |
| Treasury building valuation types | Official classification of building types for assessment — useful to describe *what* stands on the site if the user supplies it (file 04) |
| LED photos (existing) | Unstructured |
| Google Open Buildings | **Not tested** |

**Classification:** building presence/density near a site → **AVAILABLE — existing (OSM) / new (Microsoft)**. Building on the parcel, its type, floors, condition → **USER INPUT**.

---

## 7. Utilities

| Candidate | Result |
|---|---|
| GISTDA `EEC_Data/Electrical`, `GAS_Pipeline`, `Gas_separation_plant` services | Exist [Verified-live: names]; content **not tested** |
| PEA / PWA service-area or connection data | **Not tested**; no public per-parcel source identified |

**Classification:** utility availability at a parcel → **USER INPUT** (optionally a DERIVED proximity flag if GISTDA infrastructure layers are later tested).

---

## 8. Requirement classification

| Requirement | Classification | Source | Evidence type |
|---|---|---|---|
| Land area | **AVAILABLE — existing source** (LED items) / **USER INPUT** (others) | LED; title deed | Authoritative fact / user input |
| Parcel shape | **NOT AVAILABLE** (MVP) | No approved public geometry for Chon Buri | — |
| Frontage | **USER INPUT** | — | User input |
| Road access (legal) | **USER INPUT** | — (OSM gives proximity only) | User input |
| Road proximity / class | **DERIVED** (existing) | OSM | Derived feature |
| Road width | **USER INPUT** | — | User input |
| Slope / elevation | **AVAILABLE — new source** | Copernicus GLO-30 DSM | Derived feature (low confidence in built-up areas) |
| Flood risk | **AVAILABLE — new source** | GISTDA recurring flood 2005–2016 | Derived feature from authoritative observation |
| Existing structures (nearby) | **AVAILABLE — existing (OSM) / new (Microsoft)** | OSM; Microsoft footprints | Derived feature |
| Existing structures (on the parcel: type, floors, condition) | **USER INPUT** | — | User input |
| Utilities | **USER INPUT** | — | User input |

## 9. Recommendation

1. **Adopt for MVP:** GISTDA recurring-flood flag (with "historical 2005–2016, not a hazard model" disclosure).
2. **Collect as user inputs** (structured, labelled *user-asserted*): land area (if not LED), frontage, road width, legal road access, existing building type/floors/condition, utilities, and the deed's map sheet + land number (enables the exact Treasury value lookup).
3. **Optional:** Copernicus elevation for low-lying/hillside flags. Microsoft footprints only if OSM building completeness is shown to be inadequate for the study area.
4. **Keep open:** parcel geometry. Options are DOL LandsMaps API credentials, Treasury permission for DS_TRANSIT, or remaining with user-asserted pins (P3). This decision still blocks authoritative anchors (G1).
