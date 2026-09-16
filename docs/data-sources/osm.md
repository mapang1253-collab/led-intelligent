# Data Source: OpenStreetMap (OSM)

> **Authority note:** dated source research only. Any systematic adapter activation and current architecture are governed by docs/data-architecture.md and docs/implementation-plan.md. This university project remains Thailand-wide; regional examples are fixtures only.

- **Maintainer:** OpenStreetMap contributors (volunteer community); infrastructure & licensing by the **OpenStreetMap Foundation (OSMF)**, UK non-profit
- **Last researched:** 2026-09-14
- **Status:** Research only — this file does not activate an integration; current source roles and activation gates are defined by the active architecture documents.
- **Evidence & raw findings:** [`research/osm/api-investigation.md`](../../research/osm/api-investigation.md)

> Labels: **[Verified]** = observed in live tests on 2026-09-14. **[Documented]** = stated in official OSM/OSMF/ecosystem docs. **[Assumption]** / **[Uncertain]** = not confirmed.
>
> Historical context: at the time of the original investigation, the Treasury, REIC and architecture files were empty. They are populated now. The integration notes below remain dated research and are not final instructions.

---

## 1. Overview

- A crowd-sourced, global map **database** (not just a map) of roads, buildings, land use, POIs, admin boundaries, transport, etc. [Documented]
- Data licensed under **ODbL 1.0** — open, free to use including commercially, with attribution and share-alike conditions (§11). [Documented]
- **No accuracy guarantee**: OSMF does not "guarantee the truthfulness, accuracy, or reliability" of content. [Documented]
- **Thailand:** active community with Thai tagging conventions; whole country covered at road-network level, but POI, address and sub-district detail is uneven (§10). [Verified + Documented]

## 2. Useful data types — Thailand coverage snapshot

Counts from Geofabrik taginfo (data to 2026-09-13). Real-world comparisons are rough general-knowledge figures. [Verified counts / Assumption comparisons]

| Category | OSM tags (typical) | TH objects | Coverage judgement |
|---|---|---|---|
| Roads & classes | `highway=motorway…residential` | ~2.98 M ways | **Best layer**; `ref`, `lanes`, `surface` often missing |
| Intersections | derived from shared way nodes | — | Derivable; requires network processing |
| Buildings | `building=*` | 1.72 M (82 % `building=yes`) | Footprints common, **building use rarely tagged** |
| Land use (res/com/ind/retail) | `landuse=*` | 33.7k / 3.0k / 3.9k / 1.4k | Patchy, non-exhaustive polygons |
| Schools / universities | `amenity=school/university` | 17.3k / 458 | Partial (TH has ~30k+ schools) |
| Hospitals / clinics | `amenity=hospital/clinic` | 1.8k / 1.6k | Partial; mis-classification observed |
| Markets / malls / supermarkets / convenience | `amenity=marketplace`, `shop=mall/supermarket/convenience` | 2.0k / 549 / 2.4k / 11.2k | Partial; convenience under-mapped |
| Restaurants | `amenity=restaurant` | 22.6k | Very incomplete outside centres |
| Hotels / attractions | `tourism=hotel/attraction` | 10.0k / 3.6k | Tourist areas better |
| Banks / ATMs | `amenity=bank/atm` | 2.6k / 3.3k | ATMs strongly under-mapped |
| Bus stops / rail stations | `highway=bus_stop`, `railway=station` | 8.0k / 662 | Rail good; bus stops poor |
| Parking / fuel | `amenity=parking/fuel` | 10.6k / 8.7k | Moderate |
| Government | `amenity=townhall`, `office=government` | 447 / 3.7k | Partial |
| Parks / religious | `leisure=park`, `amenity=place_of_worship` | 3.1k / 26.4k | Partial |
| Admin boundaries | `boundary=administrative` | province 78, amphoe/khet 928, **tambon 838** | Province & amphoe ≈ complete; **tambon ≈ 12 %** |
| Addresses | `addr:housenumber` | **68k** | **Essentially absent** |
| Land parcels | `boundary=lot`, `ref:cadastre`, … | **0** | **None** |

## 3. Data model (relevant parts)

| Element | What it is | Typical use for us |
|---|---|---|
| **Node** | Point with lat/lon (WGS84) + tags | POIs (shops, ATMs, stations) |
| **Way** | Ordered list of nodes; open = line, closed = line or area | Roads, building footprints, landuse, campus outlines |
| **Relation** | Group of nodes/ways/relations with roles | Admin boundaries, multipolygons, transit routes |
| **Tags** | Free-form `key=value` pairs; conventions, not schema | Classification (`amenity=school`), names (`name`, `name:en`), attributes |
| **Areas** | Not a primitive — inferred from closed ways/multipolygon relations by tags | Polygons for landuse, admin zones |
| **POI** | Informal: any node **or** area with POI tags | Must normalize node vs polygon (use point/centroid) |

Feature conversion: filter by tag → geometry (point / line / polygon, polygons → centroid or "point on surface") → spatial ops (distance, radius count, length within buffer, area share) → per-property features. **One real facility may exist as several objects** (node + way), so dedupe is needed. [Verified]

## 4. Access methods — which to use for what

| Method | Provides | Limits / policy | Production-appropriate? |
|---|---|---|---|
| **Overpass API** (public `overpass-api.de`, FOSSGIS-run) | Tag/radius/area queries; JSON/XML/CSV; attic history | ~10k req & 1 GB/day for one-off projects; **regular apps ÷100 (~100 req/day)**; "commercial use should use self-hosted or paid servers"; no auth [Documented]. **Tests: repeated 504 "server too busy" + one 429** [Verified] | **No** — prototyping / ad-hoc research only |
| **Nominatim** (public, OSMF-run) | Forward/reverse geocoding | **≤1 req/s**; identifying UA; must cache; no autocomplete; no systematic/grid queries; bulk only single-thread (long jobs ~4 req/min); no SLA [Documented] | **No** for production or bulk; acceptable for low-volume manual checks |
| **Main OSM API** (`api.openstreetmap.org`) | Editing API | "not for read-only purposes or projects"; heavy users must use planet [Documented] | **No — do not use** |
| **Regional extract** (Geofabrik Thailand PBF 312 MB, daily; also shp/gpkg) | Full TH snapshot, daily diffs, monthly history back to 2014 | Free, ODbL | **Yes** — most appropriate basis for any systematic use |
| **Planet file** (88 GB PBF weekly, history, minutely diffs) | Global/full history | Free, ODbL | Only if multi-country or full history needed |
| **Self-hosted Overpass / Nominatim** (on extract) | Same as public, no external limits | Own ops cost; Nominatim & osm2pgsql need PostgreSQL/PostGIS | Yes, if query-style access is needed |
| **Commercial OSM-based providers** | Hosted Overpass/geocoding/tiles with SLA | Paid; terms vary | Possible; **not researched** |

| Task | Appropriate method (options) |
|---|---|
| Exploratory questions, feature prototyping | Public Overpass (low volume, cached), overpass-turbo |
| Per-property nearby/radius features at scale | Local Thailand extract → spatial database (or self-hosted Overpass) |
| Geocoding a few addresses for manual review | Public Nominatim (≤1 req/s, cached) |
| Geocoding many LED/Treasury addresses | Self-hosted Nominatim or a commercial/Thai government geocoder — and expect low hit rates (§6) |
| Admin-area polygons | Extract (province/amphoe); tambon needs another source |
| Map display | Tiles are a separate policy (not researched here); OSMF does not provide free tiles for third parties [Documented] |

## 5. Nearby / radius analysis

| Question | Feasible? | Required | Caveat |
|---|---|---|---|
| Schools within 1 km | Yes | Point coordinate + school objects + radius count | Counts objects; under-mapping → undercount |
| Hospitals within 3 km | Yes | Same | Mis-tagged clinics/institutes; no beds/public-private reliably |
| Restaurants within 500 m | Technically yes | Same | **Weakest evidence** — very incomplete outside cores |
| Nearest railway station | Yes | Station points + nearest-neighbour | Straight-line ≠ travel distance; duplicate stations |
| Supermarkets within 2 km | Yes | Same | Brand/format inconsistent |
| Major roads nearby | **Yes, relatively reliable** | Road ways + distance / length in buffer | Road class is a convention, not official status; `ref` often missing |
| Road/accessibility context | Partly | Road network; true travel time needs a routing engine (e.g. OSRM/Valhalla — not researched) | Frontage/access to the parcel itself **not** knowable |
| Business concentration | Partly | POI mix by category in buffer | Reflects mapping activity as much as reality |

Live example [Verified]: Siam (central Bangkok) vs Nong Chok district office (eastern Bangkok) — health objects within 3 km **119 vs 1**; food within 500 m **137 vs 1**; buildings within 500 m **342 vs 451**. Buildings are mapped in both; POIs are not. **Low counts cannot be read as "no amenities"** without a completeness check.

## 6. Geocoding (Nominatim)

- Address → coordinates: yes; coordinates → address: yes. [Documented/Verified]
- Thailand: works for **named places, POIs, amphoe/khet and Bangkok khwaeng** [Verified]. Fails for LED-style rural house addresses (`4/1 หมู่ 7 …` → none) [Verified]; tambon query returned the **TAO office building**, not a tambon polygon [Verified]; obsolete names (`กิ่งอำเภอ…`) → none [Verified]; English input returned wrong feature types [Verified]; reverse geocoding in rural area resolved only to amphoe [Verified]; Bangkok address hierarchy contained a suspicious municipality label [Verified].
- Structural reason: only ~68k house numbers mapped nationwide [Verified]. A result is the **nearest/best-matching mapped object**, not the property.
- Individual user requests: acceptable only at very low volume within policy; **no SLA**. Bulk: public instance is **not** appropriate. As a production dependency: **not appropriate** on the public service; self-hosting removes policy limits but **not** the data gap.
- Stored individual geocoding results do not impose share-alike on our other data (Geocoding Guideline) [Documented]; mass aggregation can.

## 7. Property / parcel geometry

- **OSM does not contain Thai cadastral parcels** (0 parcel-type objects) [Verified]; OSM's cadastre tagging is only for referencing external cadastres [Documented].
- **Cannot** convert a deed number (โฉนดเลขที่) to a location (Nominatim → no result) [Verified].
- **Cannot replace** DOL/LandsMaps: no parcel boundaries, no deed identifiers, community data is not legally authoritative, and Thai address points are largely absent.
- Best OSM can offer without other sources: **amphoe/province polygon** (≈ complete) or a named POI/village point — area-level context, not property-level.

## 8. Matching with other sources

```
Treasury / LED property record
   │  (deed no. + tambon/amphoe/province, maybe house no.)   ← no coordinates in LED [see led.md]
   ▼
[MISSING STEP] coordinate or parcel geometry  ← needs DOL/cadastral source, user-supplied pin, or other geocoder
   ▼
latitude / longitude (WGS84)  ← the ONLY identifier OSM needs
   ▼
OSM spatial queries (radius, nearest, within polygon)
   ▼
location / accessibility / business-context features
```

- **Join key for OSM is geometry, not an ID.** There is no shared identifier between OSM and Treasury/LED/REIC. [Verified by absence]
- Fallback **area-level join**: normalized admin names → OSM amphoe/province polygons → area-level statistics (e.g. POI density per amphoe). Tambon level is **not** reliable from OSM (≈12 % coverage). [Verified]
- Treasury: if Treasury exposes parcel/zone geometry or coordinates, OSM joins spatially; otherwise same problem as LED. [Assumption — Treasury not yet researched]
- REIC: likely province/amphoe/project-level; joins by admin area, or by project location if REIC provides points. [Assumption — REIC not yet researched]
- Additional source(s) required for point-level analysis: **DOL LandsMaps / cadastral data**, a user-confirmed map pin, or an authoritative Thai geocoder / DOPA address data (all need separate research and licence checks).

## 9. Candidate features (not a final feature set)

| Candidate | Evidence basis | Main limitations |
|---|---|---|
| `distance_to_nearest_{trunk,primary,secondary}_road` | Road network (best layer) | Class ≠ official status; distance to road ≠ frontage/access |
| `major_road_length_within_{500m,1km}` / `road_density` | Road ways | Segmentation; residential sois under-mapped in rural areas |
| `intersection_density_1km` | Way topology | Needs network cleaning |
| `distance_to_nearest_rail_station` (+ type: SRT/BTS/MRT/monorail) | `railway=station`, `station=*` | Straight-line; duplicate station objects |
| `bus_stop_count_1km` | `highway=bus_stop` | Very incomplete |
| `distance_to_nearest_{school,hospital}` | amenity tags | Partial coverage, mis-tagging |
| `school_count_1km`, `hospital_count_3km` | amenity tags | Undercounts; node/way duplicates |
| `supermarket/mall/convenience_count_2km` | shop tags | Under-mapped chains |
| `restaurant_count_500m`, `commercial_poi_count_1km`, `poi_category_mix` | amenity/shop tags | **Reflects mapper activity**; weak outside cities |
| `building_count/footprint_ratio_500m` | building footprints | Use rarely tagged; imagery vintage varies |
| `landuse_share_{residential,commercial,industrial}_1km` | landuse polygons | Non-exhaustive; not zoning (ผังเมือง) |
| `distance_to_{park,government_office,tourist_attraction}` | leisure/office/tourism | Partial |
| `amphoe_poi_density` (area-level fallback) | admin polygons + POIs | Coarse; hides within-area variation |
| `data_completeness_indicator` (e.g. POIs vs buildings ratio in buffer) | Derived | Proxy only; needed to qualify other features |

Every OSM-derived feature should carry **extraction date** and a **coverage/confidence** qualifier. [Assumption — recommendation]

## 10. Data quality

| Issue | Evidence | Impact on investment analysis |
|---|---|---|
| Incomplete POIs | Nong Chok: 1 health object in 3 km; national counts far below real-world [Verified/Assumption] | Undervalues peri-urban/rural locations; bias toward well-mapped areas |
| Regional variation | Bangkok core dense; rural addresses/tambons missing [Verified] | Features not comparable across regions without normalization |
| Missing attributes | `ref`, `lanes`, `beds`, `operator:type`, `check_date` mostly absent [Verified] | Cannot distinguish quality/size (e.g. big hospital vs clinic) |
| Inconsistent tagging / misclassification | Dental faculty, fertility institute tagged hospital [Verified] | Noisy counts |
| Duplicates / overlaps | Node + way per facility; duplicate station names [Verified] | Inflated counts unless deduped |
| Outdated objects | Only 5.1k objects with `check_date`; Bing imagery 5+ yrs old in rural TH [Verified/Documented] | Closed businesses may persist; new developments missing |
| Positional accuracy | Imagery alignment issues noted by Thai community [Documented] | Small-radius (≤500 m) features sensitive |
| Admin hierarchy artefacts | Unexpected municipality label in Bangkok result [Verified] | Name-based joins unreliable |
| Community effects | Organised/imported edits vary; no warranty [Documented] | Sudden jumps in counts over time unrelated to real change |

## 10b. Subdistrict boundaries are not in OSM (probed 2026-09-16)

A direct Overpass query for `ตำบลบางปลาสร้อย` at `admin_level=8` returned zero elements,
while `อำเภอเมืองชลบุรี` (`admin_level=6`) and `จังหวัดชลบุรี` (`admin_level=4`) both
resolved with centres. Thai subdistrict boundaries are therefore **not available** from
OSM for this project's purposes, and no radius around a subdistrict can be computed from
OSM alone. The public Overpass endpoint also returned repeated HTTP 504s under light use.

See [`docs/adr/0004-no-property-imagery-or-surroundings.md`](../adr/0004-no-property-imagery-or-surroundings.md).

## 11. Licensing & attribution

**Documented:**
- ODbL 1.0; copy, distribute, adapt permitted; **commercial use allowed**.
- **Attribution required** for public use: credit "OpenStreetMap" / "© OpenStreetMap contributors", indicate ODbL, link `https://www.openstreetmap.org/copyright`; placed where users see the work (map corner, credits screen, reports).
- **Share-alike:** a publicly used **Derivative Database** must be under ODbL; publicly used Produced Works require the notice and, if made from a derivative database, that database (or alterations) must be offered (ODbL 4.6).
- **Internal use** within the organisation is not "public use".
- **Collective Database** (OSM kept independent from other data, joined by reference) is not a derivative database.
- **Substantial** extraction: <100 features clearly not; systematic extraction of a category across a town is.
- Stored individual **geocoding results** can be combined with proprietary data without share-alike on that data.
- Storing and transforming extracts is permitted by the licence; obligations attach to **public use**, not storage.

**Interpretation (not legal advice) [Assumption]:**
- Scores/distances/counts shown in the app ≈ Produced Work → attribution needed.
- Offering exports/APIs of OSM POI lists or OSM-enriched tables ≈ possible Derivative Database → share-alike.
- Mixing OSM with non-OSM data *for the same feature type* (e.g. merging a Ministry school list into OSM schools) is the main way to accidentally create a derivative database.
- The app would need at minimum: visible OSM attribution on maps and on pages showing OSM-derived features, plus a data-sources/licence page.

## 12. Storage considerations (research-level)

OSM-derived data is commonly stored in **PostgreSQL + PostGIS** (osm2pgsql, Nominatim and Overpass-alternatives build on it): geometry types Point/LineString/Polygon/Multi*, SRID 4326 or 3857, **GiST spatial indexes**, metre distances via `geography` or a projected CRS. GeoPackage/Shapefile/GeoParquet are file-based alternatives. [Documented / Assumption] No choice made.

## 13. Update / freshness

- Data changes continuously; minutely diffs exist; Geofabrik Thailand updated daily. [Documented]
- Live querying (public APIs) is policy-limited and unreliable [Verified]; maintaining a periodically refreshed local dataset is the documented route for large/frequent users [Documented].
- Stale data effects: closed/new POIs; for investment features, monthly–quarterly refresh may suffice [Assumption — to decide].
- **History available:** full-history planet, Overpass attic queries, Geofabrik monthly snapshots since 2014 [Documented] — but changes over time mix real change with mapping activity.

## 14. Cost

| Access | Cost |
|---|---|
| Data (ODbL) | Free |
| Public Overpass / Nominatim | Free **but** strict limits, no SLA, not for production backends |
| Extracts (Geofabrik, planet) | Free download |
| Self-hosting (PostGIS / Overpass / Nominatim / routing) | Infrastructure + maintenance effort (Thailand extract is small: 312 MB PBF) |
| Commercial OSM-based providers | Paid; not researched |

"OSM is free" ≠ "unlimited API usage is free".

## 15. Recommended role (for discussion — not a decision)

OSM is best positioned as the **spatial-context and accessibility evidence layer**, used from a **locally held Thailand extract**, and **only once a property has a trustworthy coordinate from another source**. It should never be the source of the property's location itself.

| Dimension | Evidence OSM can provide | Strength | Important caveats |
|---|---|---|---|
| **Valuation** | Indirect location covariates (road access class, distance to rail, amenity proximity) for comparison/modelling | **Weak** | No prices, parcels, zoning or building data; covariates biased by mapping completeness |
| **Location analysis** | Road network context, nearest rail/school/hospital, admin area (amphoe/province), landuse share | **Medium–Strong** (roads/rail) · **Medium–Weak** (POIs) | Needs accurate point; tambon polygons missing; straight-line distances |
| **Business potential** | POI mix/density, commercial/retail landuse, traffic-generating facilities, tourism POIs | **Weak–Medium** (urban) · **Weak** (rural) | Counts reflect mapping effort; no footfall, revenue or rent data |
| **Investment analysis** | Supporting context flags (e.g. near major road/rail, amenity-poor area) | **Supporting only** | Must not drive decisions alone; add confidence/completeness indicators |
| **Geospatial visualization** | Basemap data, roads, buildings, POIs around a property | **Strong** | Attribution required; public tile service has its own policy (not researched) |

## 16. OSM is NOT authoritative evidence for

1. Land parcel boundaries, deed numbers, ownership or title.
2. The exact location of a Treasury/LED property.
3. Legal road access / frontage of a parcel, or right-of-way.
4. Zoning / town-planning (ผังเมือง) or permitted land use.
5. Official administrative boundaries (esp. tambon) for legal/valuation purposes.
6. Property values, rents, transaction prices.
7. The absence of amenities ("0 schools within 1 km" may be missing data).
8. Whether a business is currently operating; opening hours; size/quality of facilities.
9. Building use, floors, age, or condition.
10. Official road classification/status, travel times, flooding, environmental risk.
11. Planned/future infrastructure (lines under construction may be tagged inconsistently).
12. Postal addresses in Thailand.

## 17. Open questions requiring human/project decisions

1. **Coordinate source:** Which source will supply property coordinates/parcel geometry (DOL LandsMaps, Treasury, user pin, commercial/Thai geocoder)? Without it OSM is limited to amphoe/province-level context.
2. Is **amphoe-level** OSM context acceptable as a fallback, and how should it be labelled?
3. **Access model:** local extract + own spatial DB vs self-hosted Overpass vs paid provider (public APIs ruled out for production by their policies).
4. **Public vs internal use:** Will OSM-derived features/tables be shown or exported to external users? (Determines ODbL share-alike exposure.) Legal review requested?
5. Will we ever merge non-OSM data into OSM feature layers (e.g. official school/hospital lists)? That affects Collective vs Derivative Database status.
6. **Refresh cadence** and whether to retain historical snapshots.
7. Which **POI categories** are trustworthy enough to include, and what completeness validation (against Ministry lists) is required first?
8. Straight-line distance acceptable, or is a **routing engine** (travel time) in scope?
9. Map display: which tile/basemap service (separate policy/cost research)?
10. Source for **tambon boundaries** (since OSM covers ~12 %).
