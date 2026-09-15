# OpenStreetMap (OSM) — API, Data & Licensing Investigation

> **HISTORICAL SOURCE RESEARCH.** This file records dated source observations and does not activate an adapter. Current nationwide scope, source roles and activation rules are governed by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-14 (B.E. 2569)
- **Method:** Reading official OSMF / OSM wiki / Nominatim / Overpass / Open Data Commons documentation, plus a small number of live requests to public services **within their usage policies** (identifying `User-Agent`, single thread, ≥2 s between Nominatim calls, ≥20 s between Overpass calls, retries only after 30–45 s back-off). Total live requests: ~11 Nominatim, ~16 Overpass (incl. retries), ~45 Geofabrik taginfo (lightweight stats API).
- **No application code was written.** Test commands were ad-hoc `curl` + a throwaway Python parser in the session scratchpad (not in the repo).
- **Companion summary:** [`docs/data-sources/osm.md`](../../docs/data-sources/osm.md)

> **Status labels**
> - **[Verified]** — observed directly in a live test on 2026-09-14.
> - **[Documented]** — stated in official/first-party documentation (URL given).
> - **[Assumption]** — reasonable inference or general knowledge not confirmed here.
> - **[Uncertain]** — conflicting, incomplete, or not tested.
>
> Some documentation was read through an automated page-to-text summarizer; wording in quotes below is as returned by that tool and **should be re-checked against the source page before being relied on for legal or compliance purposes.**

---

## 0. Repository context at time of research

| File | State on 2026-09-14 |
|---|---|
| `README.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/data-architecture.md`, `docs/system-design.md` | Empty |
| `docs/data-sources/treasury.md`, `research/treasury/api-investigation.md` | Empty |
| `docs/data-sources/reic.md` | Empty |
| `docs/data-sources/led.md`, `research/led/api-investigation.md` | Populated — key point for OSM: **LED records contain no coordinates**; they carry deed no. + deed tambon/amphoe/province, property tambon/amphoe/province and sometimes a house number. |

---

## 1. Sources consulted

| # | Source | URL | Type |
|---|---|---|---|
| S1 | OSM copyright & licence page | https://www.openstreetmap.org/copyright | First-party |
| S2 | ODbL 1.0 full text | https://opendatacommons.org/licenses/odbl/1-0/ | Licence text |
| S3 | OSMF Attribution Guidelines (adopted 2021-06-25) | https://osmfoundation.org/wiki/Licence/Attribution_Guidelines | OSMF |
| S4 | OSMF Licence & Legal FAQ | https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ | OSMF |
| S5 | OSMF Community Guidelines index | https://osmfoundation.org/wiki/Licence/Community_Guidelines | OSMF |
| S6 | Geocoding Guideline | https://osmfoundation.org/wiki/Licence/Community_Guidelines/Geocoding_-_Guideline | OSMF |
| S7 | Produced Work Guideline | https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline | OSMF |
| S8 | Substantial Guideline (board-endorsed 2014-06-06) | https://osmfoundation.org/wiki/Licence/Community_Guidelines/Substantial_-_Guideline | OSMF |
| S9 | Collective Database Guideline | https://osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline | OSMF |
| S10 | OSMF Terms of Use | https://osmfoundation.org/wiki/Terms_of_Use | OSMF |
| S11 | OSMF Operations policies index | https://operations.osmfoundation.org/policies/ | OSMF |
| S12 | Nominatim Usage Policy | https://operations.osmfoundation.org/policies/nominatim/ | OSMF |
| S13 | OSM (editing) API Usage Policy | https://operations.osmfoundation.org/policies/api/ | OSMF |
| S14 | Nominatim Search API docs | https://nominatim.org/release-docs/latest/api/Search/ | Nominatim project |
| S15 | Nominatim installation requirements | https://nominatim.org/release-docs/latest/admin/Installation/ | Nominatim project |
| S16 | Overpass API wiki page (instances & policies) | https://wiki.openstreetmap.org/wiki/Overpass_API | OSM wiki |
| S17 | Overpass "commons" usage rules (overpass-api.de) | https://dev.overpass-api.de/overpass-doc/en/preface/commons.html | Overpass maintainer |
| S18 | Planet OSM downloads | https://planet.openstreetmap.org/ | First-party |
| S19 | Geofabrik Thailand extract | https://download.geofabrik.de/asia/thailand.html | Widely-used ecosystem provider |
| S20 | Geofabrik taginfo Thailand | https://taginfo.geofabrik.de/asia:thailand/ | Ecosystem provider |
| S21 | OSM wiki — Thailand | https://wiki.openstreetmap.org/wiki/Thailand | OSM wiki |
| S22 | Thailand/Places and Boundaries | https://wiki.openstreetmap.org/wiki/Thailand/Places_and_Boundaries | OSM wiki |
| S23 | Thailand/Naming and Addressing | https://wiki.openstreetmap.org/wiki/Thailand/Naming_and_Addressing | OSM wiki |
| S24 | Thailand/Transportation | https://wiki.openstreetmap.org/wiki/Thailand/Transportation | OSM wiki |
| S25 | Cadastre (wiki) | https://wiki.openstreetmap.org/wiki/Cadastre | OSM wiki |
| S26 | osm2pgsql manual | https://osm2pgsql.org/doc/manual.html | Ecosystem tool |

`https://operations.osmfoundation.org/policies/overpass/` → **HTTP 404**. The OSMF policies index (S11) lists Tile, Vector Tile, Nominatim and API policies but **no Overpass policy** — the public Overpass instances are **not run by the OSMF**; overpass-api.de is run by FOSSGIS / the Overpass maintainer (S16). [Verified]

---

## 2. Access method investigation

### 2.1 Overpass API (read-only query engine)

| Item | Finding | Label |
|---|---|---|
| Main public endpoint | `https://overpass-api.de/api/interpreter` (POST `data=<query>`) | [Documented S16] [Verified] |
| Operator | FOSSGIS / Overpass maintainer — not OSMF | [Documented S16] |
| Other public instances | Several exist (e.g. private.coffee, VK Maps); commercial keyed offerings listed on the wiki (Geofabrik, others) | [Documented S16] — not evaluated |
| Auth | None for public instance | [Verified] |
| Usage limits (overpass-api.de) | "maximum of about 10000 requests per day and keep their download volume below about 1 GB per day"; per-IP slots, queue up to 15 s, HTTP 429 when no slot | [Documented S17] |
| Regular applications | Wiki: for regular applications divide by 100 → ~**100 queries / 10 MB per day** | [Documented S16] |
| Commercial / backend use | "Commercial use should use self-hosted or paid Overpass servers"; S17 recommends own instance for "applications for non-mappers relying on public instances as backend" | [Documented S16, S17] |
| Defaults | timeout 180 s, memory 512 MiB per request (configurable in query) | [Documented S17] |
| Output | XML, JSON, CSV; `out count`, `out center`, `out geom` | [Documented S16] [Verified json/count/center] |
| Radius queries | `(around:<m>,<lat>,<lon>)` | [Verified] |
| Area queries | `area["ISO3166-1"="TH"][admin_level=2]` then `(area.x)` | [Verified] |
| Historic ("attic") data | Supported on overpass-api.de via `[date:"…"]` / `[diff:…]` | [Documented S16]; not tested |
| Freshness | Response `osm3s.timestamp_osm_base` was ~1–2 min behind wall clock | [Verified] |
| Thailand | Fully queryable (global DB) | [Verified] |
| Bulk download | Technically possible for bboxes, but policy limits make it inappropriate for country-scale bulk; use extracts | [Documented S16/S17] + [Assumption] |

#### Reliability observation (important)

| Time (UTC) | Query | Result |
|---|---|---|
| 15:08 | 4 queries, 5 s apart (multi-statement `out count`) | **all HTTP 504** "Dispatcher_Client::request_read_and_idx::timeout. The server is probably too busy" |
| 15:09 | `/api/status` | "Rate limit: 2 — 2 slots available now" (i.e. not our rate limit; server load) |
| 15:09–15:10 | same small query, twice, 30 s apart | 504, then 200 (7.6 s) |
| 15:10–15:16 | 5 queries sequential, 20 s gaps + 45 s back-off | 1st attempt success 2/5; one **HTTP 429**; one needed 3 attempts |

⇒ **[Verified]** The public instance was intermittently overloaded during testing. Even at very low volume, a user-facing feature depending on it would have failed or stalled. Not suitable as a production dependency.

#### Example queries & responses [Verified]

Test points: **P1 Siam, Bangkok (13.7466, 100.5347)** — dense urban core. **P2 Nong Chok district office (13.8557, 100.8626)** — peri-urban eastern Bangkok (point taken from Nominatim result N1).

```overpassql
[out:json][timeout:60];
nwr["amenity"~"^(school|university|college|kindergarten)$"](around:1000,13.7466,100.5347);out count;
nwr["amenity"~"^(hospital|clinic|doctors)$"](around:3000,13.7466,100.5347);out count;
nwr["amenity"~"^(restaurant|fast_food|cafe)$"](around:500,13.7466,100.5347);out count;
nwr["shop"="supermarket"](around:2000,13.7466,100.5347);out count;
nwr["railway"="station"](around:3000,13.7466,100.5347);out count;
way["highway"~"^(motorway|trunk|primary)$"](around:1000,13.7466,100.5347);out count;
way["building"](around:500,13.7466,100.5347);out count;
nwr["addr:housenumber"](around:500,13.7466,100.5347);out count;
way["landuse"](around:1000,13.7466,100.5347);out count;
```

Response shape (first element):

```json
{"version":0.6,"generator":"Overpass API 0.7.62.11 87bfad18",
 "osm3s":{"timestamp_osm_base":"2026-09-14T15:08:36Z",
          "copyright":"The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."},
 "elements":[{"type":"count","id":0,"tags":{"nodes":"11","ways":"7","relations":"1","total":"19"}}]}
```

| Metric (raw OSM object counts) | P1 Siam | P2 Nong Chok |
|---|---|---|
| Education objects within 1 km | 19 (11 nodes, 7 ways, 1 rel) | 1 |
| hospital/clinic/doctors within 3 km | 119 | **1** |
| restaurant/fast_food/cafe within 500 m | 137 | 1 |
| supermarkets within 2 km | 19 | 4 |
| `railway=station` within 3 km | 25 | 0 |
| motorway/trunk/primary **way segments** within 1 km | 112 | 10 |
| building ways within 500 m | 342 | 451 |
| objects with `addr:housenumber` within 500 m | 30 | 2 |
| landuse ways within 1 km | 97 | 23 |

Observations:
- Counts are **object counts, not real-world facility counts**: one hospital can be a node and a campus way; roads are split into many way segments (112 "major road" ways ≠ 112 roads). [Verified]
- P2 (a Bangkok district of substantial population) returned only 1 health object within 3 km and 1 food object within 500 m, while 451 buildings are mapped. This pattern suggests **buildings are traced from imagery but POIs are sparsely mapped outside the core**. Whether real-world amenities are genuinely that sparse at P2 is **[Uncertain]** — not ground-truthed.

Nearest-station query:

```overpassql
[out:json][timeout:60];nwr["railway"="station"](around:30000,13.8557,100.8626);out center tags 60;
```

→ 58 stations within 30 km. Nearest by straight-line (haversine computed client-side): มีนบุรี / Min Buri (`station=monorail`, operator นอร์ทเทิร์นบางกอกโมโนเรล) 14,980 m; คลองหลวงแพ่ง 15,081 m; หัวตะเข้ 16,580 m; two separate `ลาดกระบัง` nodes at 18,820 m and 18,838 m (**duplicate-like entries** — likely different platforms/lines). [Verified] Straight-line distance, **not** travel distance.

Major roads near P2 (`way["highway"~"^(motorway|trunk|primary|secondary)$"](around:1500,…);out tags center 20;`): 20 segments, e.g. `primary` ถนนเลียบวารี, `primary`/`secondary` ถนนเชื่อมสัมพันธ์, `secondary` ถนนมิตรไมตรี (`lanes=2`), ถนนสังฆสันติสุข. **No `ref` on any segment; `lanes` present on 3/20; `surface` on 3/20.** [Verified]

Hospitals within 3 km of P1 (`out center tags 30`): 30 objects. Names in Thai + `name:en` mostly present. Noted: **no `beds` tag on any**; `operator:type` on 2/30; `check_date` on 0/30; 2 unnamed objects; classification noise — a dental faculty hospital, a fertility institute (Jetanin) and a public health centre (ศูนย์บริการสาธารณสุข 23) are tagged `amenity=hospital`. Chulalongkorn Hospital is a single way at 1,548 m. [Verified]

Admin boundary completeness query:

```overpassql
[out:json][timeout:120];area["ISO3166-1"="TH"][admin_level=2]->.th;
rel(area.th)[boundary=administrative][admin_level=4];out count;
rel(area.th)[boundary=administrative][admin_level=6];out count;
rel(area.th)[boundary=administrative][admin_level=8];out count;
```

| Level (per S22) | OSM relations found | Official count | Coverage |
|---|---|---|---|
| 4 province (จังหวัด) | 78 | 77 [Assumption — general knowledge] | ≈ complete; the extra 1 is [Uncertain] |
| 6 amphoe / khet | 928 | 878 amphoe + 50 khet = 928 [Assumption — general knowledge] | ≈ complete |
| 8 tambon / khwaeng | **838** | ~7,255 [Assumption — general knowledge, not verified against DOPA] | **≈ 12 % — largely missing** |

[Verified counts; official totals are assumptions]. **Implication:** tambon-level polygons for joining LED/Treasury tambon names **cannot be relied on from OSM**; amphoe and province polygons appear usable.

### 2.2 Nominatim (geocoder)

| Item | Finding | Label |
|---|---|---|
| Public endpoint | `https://nominatim.openstreetmap.org/search`, `/reverse`, `/lookup` | [Documented S14] [Verified] |
| Operator | OSMF | [Documented S11, S12] |
| Auth | None | [Verified] |
| Rate limit | "absolute maximum of 1 request per second" | [Documented S12] |
| Identification | valid HTTP Referer or User-Agent identifying the application (a default curl UA was **not** rejected in our test — do not rely on that) | [Documented S12] [Verified N5] |
| Bulk geocoding | allowed only in a limited way: single thread, single machine; scripts running longer than a day → ~4 requests/minute; results **must be cached** | [Documented S12] |
| Prohibited | autocomplete / search-as-you-type; systematic queries (e.g. grid reverse queries, full downloads); scraping detail pages; reselling geocoding results; built-in integration in no-code/low-code/LLM platforms without deliberate developer responsibility | [Documented S12] |
| Repeated identical queries | clients may be classified as faulty and blocked | [Documented S12] |
| Parameters | free-form `q` or structured (`amenity`,`street`,`city`,`county`,`state`,`country`,`postalcode`), `countrycodes`, `viewbox`/`bounded`, `layer`, `featureType`, `addressdetails`, `accept-language`, `limit` ≤ 40 | [Documented S14] |
| Formats | xml, json, jsonv2, geojson, geocodejson | [Documented S14] |
| Licence in response | `"licence":"Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright"` | [Verified] |
| Service guarantees | OSMF ToS: services may be suspended "at any time, with or without cause, and with or without notice"; no SLA | [Documented S10] |
| Self-hosting | PostgreSQL + PostGIS + osm2pgsql; min 2 GB RAM; planet needs ~128 GB RAM / ≥1 TB NVMe; a country extract (Thailand PBF 312 MB) is far smaller | [Documented S15]; Thailand-extract sizing [Assumption] |

#### Tests [Verified]

| # | Request | Result |
|---|---|---|
| N1 | `search?q=สำนักงานเขตหนองจอก&countrycodes=th&format=jsonv2&addressdetails=1` | Node 374115402 `amenity=townhall` at 13.8557281, 100.8625714. Address: ถนนเชื่อมสัมพันธ์, แขวงกระทุ่มราย, เขตหนองจอก, กรุงเทพมหานคร, **`municipality: ศาลาแดง`**, 10530. The "ศาลาแดง" municipality inside Bangkok's address hierarchy looks **wrong** — an example of address-hierarchy artefacts. [Verified; cause Uncertain] |
| N2 | structured `city=หนองจอก&state=กรุงเทพมหานคร&country=th` | Relation 3147501 เขตหนองจอก (admin boundary, bbox given) and relation 11547824 แขวงหนองจอก. Admin-area geocoding works in Bangkok. |
| N3 | `q=4/1 หมู่ 7 แม่เล่ย์ แม่วงก์ นครสวรรค์` (LED-style rural house address) | **`[]` — no result** |
| N4 | `reverse?lat=13.7466&lon=100.5347&zoom=18` | Nearest object: a café, `house_number 991`, ถนนพระรามที่ 1, สยาม, แขวงปทุมวัน, เขตปทุมวัน, 10330. Reverse returns *nearest mapped object*, not "the property". |
| N5 | request with default curl UA | HTTP 200 (policy still requires identification) |
| N6 | `q=ตำบลแม่เล่ย์ อำเภอแม่วงก์ จังหวัดนครสวรรค์` | Only result: way 1219538836 `office=government` "ที่ทำการองค์การบริหารส่วนตำบลแม่เล่ย์" (a building). **No tambon boundary returned** — consistent with missing admin_level 8 relations. Using this point as a "tambon location" would be misleading. |
| N7 | same with obsolete name "กิ่งอำเภอแม่วงก์" (as seen in LED data) | **`[]`** — name normalization needed before geocoding. |
| N8 | `reverse?lat=15.75&lon=99.55&zoom=14` (rural) | Relation 18352529 อำเภอแม่วงก์, จังหวัดนครสวรรค์, 60150 — resolved only to **amphoe**, no tambon. |
| N9 | `q=โฉนดเลขที่ 27649 หนองจอก กรุงเทพมหานคร` (deed number) | **`[]`** — Nominatim has no concept of deed/parcel numbers. |
| N10 | `q=Mae Wong, Nakhon Sawan` | Returned two waterway segments "คลองแม่วงก์" — **wrong feature type** for an admin-area query; English/romanized input is less reliable. |

### 2.3 Main OSM API (`api.openstreetmap.org/api/0.6`)

- Purpose: "The editing API is provided in order to edit the map data" — **not for read-only purposes or projects**. [Documented S13]
- Max 2 download threads; "Large or frequent data users must use the download service 'planet.osm' or other alternatives". [Documented S13]
- "Commercial services, or those that seek donations, should be especially aware that access may be withdrawn at any point." [Documented S13]
- Editing requires OAuth 2.0 login. [Assumption — general knowledge; not needed for this project]
- **Verdict:** not an appropriate data source for this project. Not live-tested (deliberately).

### 2.4 Planet file & regional extracts

| Item | Finding | Label |
|---|---|---|
| Planet PBF | 88 GB, weekly; XML 166 GB; changesets 8.1 GB | [Documented S18, as of 2026-09-14] |
| Full history | history files including old versions and deleted objects | [Documented S18] |
| Replication diffs | minutely / hourly / daily | [Documented S18] |
| Licence of files | ODbL 1.0 for files after 2012-09-12 (CC BY-SA 2.0 before) | [Documented S18] |
| Geofabrik Thailand PBF | **312 MB**, "all OSM data up to 2026-09-13T20:21:20Z", updated daily | [Documented S19] |
| Geofabrik Thailand Shapefile / GeoPackage | 690 MB / 710 MB (layered, simplified schema) | [Documented S19] |
| Geofabrik extras | `.osc.gz` daily change files, `.poly` boundary, monthly historic snapshots back to 2014 (41 MB → 327 MB), vector tiles (Shortbread), taginfo | [Documented S19] |
| Privacy | public extracts omit user names / changeset IDs; full-metadata versions restricted to OSM contributors | [Documented S19] |
| Auth / cost | none / free download | [Documented S19] |

Tools for loading: osm2pgsql (→ PostGIS; flex output with Lua; EPSG:3857 default, 4326 supported; slim mode + change files for incremental updates) [Documented S26]; osmium, imposm, pyosmium [Documented S18/S19 mentions]. Not tested (no code).

### 2.5 Other ecosystem options (identified, not evaluated)

| Option | What | Note |
|---|---|---|
| Geofabrik taginfo (Thailand) | Tag statistics API | Used below for coverage stats. [Verified] |
| Commercial Overpass / geocoding / tiles providers (e.g. Geofabrik services and others listed on S16; OSM-based geocoders such as LocationIQ/OpenCage; OSMF points to "third-party providers") | Paid, SLA-backed hosting of OSM-derived services | [Assumption] — terms, prices and Thai quality not researched |
| ohsome API (HeiGIT) | OSM history analytics | [Assumption] — widely used; not researched |
| Overture Maps / other OSM-derived datasets | Mixed-source POI/building data | Out of scope; different licences — not researched |

---

## 3. Thailand coverage statistics (Geofabrik taginfo) [Verified]

Source DB `data_until: 2026-09-13 20:07:12`. API: `https://taginfo.geofabrik.de/asia:thailand/api/4/tag/stats?key=<k>&value=<v>` and `/key/stats?key=<k>`.

| Tag | Objects in Thailand | Comparison / comment |
|---|---|---|
| `amenity=school` | 17,331 | Thailand has roughly 30,000+ schools [Assumption] → likely incomplete |
| `amenity=university` | 458 | |
| `amenity=hospital` | 1,838 | Includes mis-tagged clinics/centres (see §2.1); sub-district health promoting hospitals (รพ.สต., ~9,800 [Assumption]) may be tagged hospital, clinic, or missing [Uncertain] |
| `amenity=clinic` | 1,605 | Private clinics nationwide are far more numerous [Assumption] |
| `amenity=restaurant` | 22,581 | Very incomplete vs real-world count [Assumption] |
| `shop=convenience` | 11,201 | 7-Eleven alone reportedly >14,000 TH stores [Assumption] |
| `shop=supermarket` | 2,371 | |
| `shop=mall` | 549 | |
| `amenity=marketplace` | 2,020 | Fresh/temporary markets hard to map [Assumption] |
| `amenity=bank` / `atm` | 2,633 / 3,340 | ATMs clearly under-mapped [Assumption] |
| `amenity=fuel` | 8,742 | |
| `amenity=place_of_worship` | 26,369 | ~40,000+ temples in Thailand [Assumption] |
| `highway=bus_stop` | 8,043 | Very incomplete outside major cities [Assumption] |
| `railway=station` | 662 | Plausible for SRT + urban rail [Assumption] |
| `tourism=hotel` / `attraction` | 10,042 / 3,613 | |
| `amenity=parking` | 10,638 | |
| `amenity=townhall` / `office=government` | 447 / 3,694 | |
| `leisure=park` | 3,051 | |
| `landuse=residential/commercial/industrial/retail/farmland` | 33,694 / 2,962 / 3,883 / 1,357 / 24,235 | Landuse polygons are patchy and non-exhaustive |
| key `building` | 1,720,348 (`building=yes` 1,404,052) | Mostly untyped footprints |
| key `highway` | 2,977,594 | Road network is the most complete layer [Assumption, consistent with tests] |
| key `name` / `name:en` | 373,802 / 230,607 | |
| key `addr:housenumber` | **68,177** | Thailand has >20 million households [Assumption] → addresses essentially absent |
| key `addr:street` / `addr:postcode` | 47,578 / 120,100 | |
| key `opening_hours` | 20,386 | |
| key `check_date` | 5,112 | Very few objects carry survey dates |
| `boundary=lot`, `boundary=cadastral`, `landuse=plot`, key `ref:cadastre` | **0** | No cadastral/parcel data |
| `place=plot` | 17 | Negligible |
| key `admin_level` values | 6: 4,300 · 7: 4,237 · 10: 2,764 · 4: 1,965 · 8: 1,729 · 2: 513 | Counts include member ways, not only relations |

---

## 4. Thailand tagging conventions (OSM wiki) [Documented S21–S24]

- Admin levels: 4 = จังหวัด (province), 6 = อำเภอ / เขต (Bangkok), 8 = ตำบล / แขวง (Bangkok), 10 = หมู่บ้าน. Municipalities (เทศบาล) overlap tambons/amphoes in complex ways. [S22]
- Addresses: `addr:housenumber` (e.g. `85/1`), `addr:street`, `addr:place` (หมู่ที่ n), `addr:subdistrict`, `addr:district`, `addr:province`, `addr:postcode`. [S23]
- Names: `name` in Thai script by default; `name:th-Latn` RTGS; `name:en` only when officially signed. Rural areas often lack names. [S23]
- Roads: national highways by digit count → trunk (1–2 digit) / primary (3 digit) / tertiary (4 digit), with exceptions; rural roads secondary/tertiary; `ref` only when signposted, otherwise `unsigned_ref`. [S24 — as summarized; re-check details before using as rules]
- Community asks organised mapping projects to contact the Thai forum first; notes imagery (Bing) can be 5+ years old in rural areas; DoH/DRR road data used for verification, not import. [S21]

---

## 5. Parcel / cadastre findings

- OSM wiki "Cadastre" page documents only `ref:cadastre` / `url:cadastre` tags for **linking to an external cadastre**, and warns to check licences of cadastral sources. [Documented S25]
- Thailand: `boundary=lot`, `boundary=cadastral`, `landuse=plot`, `ref:cadastre` → **0 objects**; `place=plot` → 17. [Verified S20]
- Nominatim deed-number search → no result (N9). [Verified]
- Thai DOL cadastral data (LandsMaps) is a separate, government-controlled source; importing it into OSM would require compatible licensing, which is not documented. [Assumption]
- **Conclusion:** OSM does not contain Thai land parcels, cannot resolve a deed number to a location, and cannot replace a DOL/cadastral source. [Verified for current data + Documented design of OSM]

---

## 6. Licensing findings

### 6.1 Documented requirements

| Topic | Documented statement | Source |
|---|---|---|
| Licence | Data under ODbL 1.0; "You are free to copy, distribute, transmit and adapt our data" | S1 |
| Credit | Credit OpenStreetMap and its contributors; make clear data is under ODbL; link to `openstreetmap.org/copyright` | S1, S3 |
| Share-alike | "If you alter or build upon our data, you may distribute the result only under the same license" | S1 |
| Commercial | ODbL permits commercial use; "You can charge any amount of money you want for any service or data you provide"; OSMF does not provide free APIs/tiles for third parties | S1, S4 |
| "Publicly" | ODbL: "to Persons other than You or under Your control by either more than 50% ownership or by the power to direct their activities" | S2 |
| Internal use | FAQ: using OSM data privately within your organisation "is not public use" → share-alike not triggered | S4 |
| Derivative Database | "based upon the Database, and includes any translation, adaptation, arrangement, modification, or any other alteration" | S2 |
| Produced Work | "a work (such as an image, audiovisual material, text, or sounds) resulting from using the whole or a Substantial part of the Contents"; publicly used produced works need a notice (ODbL 4.3) | S2, S7 |
| Produced Work test | "If the published result of your project is intended for the extraction of the original data, then it is a database and not a Produced Work" | S7 |
| Access to derivative DB (ODbL 4.6) | If a Derivative Database, or a Produced Work from one, is publicly used, the derivative database (or a file of alterations) must be offered | S2, S4, S7 |
| Collective Database | Using OSM "in unmodified form as part of a collection of independent databases" is not a derivative database; guideline: collective if for a given data type & regional cut data is all-OSM or all-non-OSM, or a non-OSM database adds a property to an OSM feature by reference | S2, S9 |
| Substantial | <100 features clearly insubstantial; systematic extraction (e.g. all eating places in an area) is substantial; features for an area ≤1,000 inhabitants insubstantial; repeated small extractions are cumulated | S8 |
| Geocoding | Individual geocoding results "may be stored and used together with other proprietary or third party data without having a share-alike impact on such other data"; aggregating results to recreate substantial OSM content creates a derivative DB; a publicly used geocoder must attribute OSM | S6 |
| Attribution form | "© OpenStreetMap contributors" / "© OpenStreetMap" acceptable; interactive maps: corner, may collapse but must remain reachable; print: include URL; apps: splash/credits acceptable if details reachable | S3 |
| Non-map uses | Geocoders/routing/ML using OSM must credit OSM | S3 |
| Warranty | OSMF does not "guarantee the truthfulness, accuracy, or reliability of any submitted community content"; services "as is" | S10 |

### 6.2 Interpretation (NOT legal advice) [Assumption]

- Storing a Thailand extract, transforming it (e.g. into PostGIS, computing points from polygons), and joining it with Treasury/LED/REIC data **internally** is permitted and does not by itself trigger share-alike.
- Showing users **computed scores / counts / distances** is most likely a Produced Work → attribution required; whether ODbL 4.6 then requires offering the underlying OSM-derived table depends on whether that table is a Derivative Database vs. unmodified/collective use. Keeping OSM-derived tables separate from proprietary tables (joined by reference/key) aligns with the Collective Database guideline.
- Exposing lists of OSM POIs (names + coordinates) via an API or export at town scale is likely **Substantial** and would make that dataset subject to ODbL share-alike.
- Adding our own attributes *into* OSM feature records for the same data type (e.g. correcting school names from a Ministry list) may create a Derivative Database.
- Third-party source licences (LED CC BY-NC etc.) are a separate constraint; ODbL share-alike could conflict with sharing obligations of other sources if data is mixed. Needs legal review.

---

## 7. Storage & freshness notes

- Typical stack: PostgreSQL + PostGIS; geometries Point/LineString/Polygon/Multi*; SRID 4326 (lat/lon) or 3857; GiST spatial indexes; distance in metres via `geography` type or projected CRS (e.g. UTM 47N/48N for Thailand — EPSG:32647/32648 [Assumption]). [Documented S26 for geometry/SRID; indexes/UTM Assumption]
- osm2pgsql and Nominatim both require PostgreSQL/PostGIS. [Documented S15, S26]
- Freshness: Overpass ~1–2 min behind [Verified]; Geofabrik daily [Documented S19]; planet weekly + minutely diffs [Documented S18]; Geofabrik monthly snapshots since 2014 and full-history planet available for historical analysis [Documented S18, S19].
- Very few Thai objects carry `check_date` (5,112) [Verified] → the last edit time of an object (available from history/metadata) is not a reliable "still exists" signal. [Assumption]

---

## 8. Uncertainties & follow-ups

1. Real-world completeness of POIs by province/amphoe — requires comparison against authoritative lists (e.g. Ministry of Education school list, MOPH health facility registry, DoH roads). Not done.
2. Why OSM has 78 province-level relations vs 77 provinces.
3. Exact official tambon count used for coverage calculation (DOPA) — not verified.
4. Whether any Thai government open dataset (e.g. data.go.th) provides tambon polygons under a licence compatible with our use — not researched (outside OSM scope).
5. Commercial providers' prices, SLAs, and Thai geocoding quality — not researched.
6. Legal status of our specific outputs (Produced Work vs Derivative Database) — needs legal review.
7. Overpass reliability observation is a single ~10-minute window; load varies by time of day.
8. Some documentation was read via an automated summarizer (see header note); verify quoted wording before compliance use.
