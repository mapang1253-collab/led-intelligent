# 2. Demographics / Demand — Source Investigation

> **HISTORICAL REGIONAL SOURCE INVESTIGATION.** Chon Buri/EEC is the research and validation fixture in this file, not the product boundary. Current nationwide scope, demand-method governance and activation requirements are defined by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/validation-architecture.md`](../../docs/validation-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Test area:** Chon Buri. Test point P-A Mueang Chon Buri 13.3611, 100.9847
- **Method:** data.go.th CKAN API, agency CKAN/catalog APIs, public statistics pages and files, GISTDA public ArcGIS REST. `curl` at ≤1 req/s; no authentication bypassed.

> Labels: **[Verified-live]** · **[Documented]** · **[Assumption]** · **[Not tested]**

---

## 1. Why this category matters

Demand drivers decide whether a use concept has customers (HBU test 3). Gap G7 (local demographics/economy) was ranked High, and the existing four sources offer only national/area-level REIC figures and weak OSM proxies ([`data-requirements.md`](../data-architecture/data-requirements.md) §8).

The test each candidate must pass: *does it describe who is near the property — residents, workers, visitors, students — at a granularity finer than the province, or at least well-defined at province level?*

---

## 2. Population, households, age — DOPA (กรมการปกครอง)

### 2.1 Current source: DOPA registration statistics site

| Item | Finding |
|---|---|
| Authoritative owner | กรมการปกครอง (Department of Provincial Administration), Bureau of Registration Administration |
| What it is | **Registered** population (ทะเบียนราษฎร) — people with a house registration in the area. Not residents actually present |
| Access | Public web pages and linked `.txt` files; **no API documented**; no login for the statistics pages ("บุคคลทั่วไป") [Verified-live] |
| Help page | `helpStatByAge.php`: download the `.txt`, open in Excel, delimiter pipe (`\|`), encoding "Thai (Windows)" [Verified-live] |

**Real request (province index for 2568):**

```
GET https://stat.bora.dopa.go.th/new_stat/webPage/statByProvince.php?year=68
→ HTTP 200, 17,171 B — table of province links
```

**Real request (Chon Buri single-year-age file):**

```
GET https://stat.bora.dopa.go.th/new_stat/file/6812/6812cc20.txt
→ HTTP 200, 126,391 B, UTF-8 with BOM, 178 lines, `|`-delimited
```

Response (truncated):

```
จังหวัดชลบุรี|5503|5134|6169|5899|7120|6469|...|798596|847389|1645985|
อำเภอเมืองชลบุรี|171|178|263|217|...
ตำบลหนองรี|52|66|75|65|71|72|...
ตำบลหนองข้างคอก|20|21|35|38|...
```

| Finding | Label |
|---|---|
| File `6812` = period **Dec 2568**; code `20` = Chon Buri | Verified-live (URL pattern + link from 2568 page); month semantics [Assumption] |
| Rows at **province → amphoe → tambon** level (178 rows) | Verified-live |
| Each row: name + age columns + three totals. Province totals 798,596 + 847,389 = **1,645,985** (arithmetically consistent: male, female, total) | Verified-live |
| Age columns appear as male/female pairs per single year of age | **Assumption** — the "โครงสร้างข้อมูล" help text wasn't fully parsed |
| No area codes in the file — names only (`ตำบลหนองรี`) | Verified-live |
| Households are not in this file | Verified-live |

### 2.2 data.go.th copy (`statbyyear`) — stale

```
GET https://data.go.th/api/3/action/package_show?id=statbyyear  → HTTP 200
GET .../download/stat_t.txt  → HTTP 200, 51,591,676 B
```

| Finding | Label |
|---|---|
| Publisher กรมการปกครอง, collected by DGA with a script; licence **Creative Commons Attributions**; `update_frequency: ไม่มีการปรับปรุงหลังจากการจัดเก็บข้อมูล`; metadata modified 2021-11-26 | Verified-live |
| Pipe-delimited columns: `YYMM`, `CC-CODE`, `CC-DESC`, `RCODE-CODE`, `RCODE-DESC`, `CCAATT-CODE`, `CCAATT-DESC`, `CCAATTMM-CODE`, `CCAATTMM-DESC`, `MALE`, `FEMALE`, `TOTAL`, `HOUSE` — **includes admin codes and house counts** | Verified-live |
| Period coverage **3612 → 6312** (Dec 2536 → Dec 2563) | Verified-live |
| Chon Buri rows: 4,398 | Verified-live |
| **Stale by ~5 years** | Verified-live |
| `datastore_search_sql` on data.go.th returned an HTML "Access Denied" page | Verified-live |

### 2.3 EEC tambon population with polygons — GISTDA

```
GET https://gistdaportal.gistda.or.th/data/rest/services/EEC_Public/Population_2562/MapServer/0/query
    ?geometry=100.9847,13.3611&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json
→ HTTP 200
{"TB_IDN":200101,"TAMBON_T":"บางปลาสร้อย","AMPHOE_T":"เมืองชลบุรี","CHANGWAT_T":"ชลบุรี","SHAPEAREA":2644344.54939,
 "MALE62":6893,"FMALE62":7645,"TOTAL62":14538,"HOUSE62":7341, ...}

GET .../query?where=PV_IDN=20&returnCountOnly=true&f=json  → {"count":92}
```

| Finding | Label |
|---|---|
| **Tambon polygons** for the EEC with DOPA-style codes (`TB_IDN` 200101), Thai/English names, area, population and houses for **2562** | Verified-live |
| Chon Buri: **92 tambon polygons** | Verified-live |
| No authentication; licence **not stated** on the service | Verified-live |
| Population values are 2562 (dated); the **polygons** are the durable value | Verified-live |

**Cross-benefit:** this partially closes gap **G10** (tambon boundaries, ~12 % in OSM) for Chon Buri and the EEC.

### 2.4 Nationwide tambon reference points — GISTDA `opendata/Tambon`

Service description [Verified-live]: *ข้อมูลพิกัดละติจูด ลองจิจูดที่บ่งชี้ชื่อตำบล อำเภอ จังหวัด … จัดทำจากข้อมูลขอบเขตการปกครองของกรมการปกครอง ผู้จัดทำข้อมูล: กรมการปกครอง ลิขสิทธิ์: DGA Open Government License*. **Points**, not polygons. Query not tested.

### 2.5 Non-registered ("latent") population — Pattaya

```
GET data.go.th package 238 → resource https://data.pattaya.go.th/dataset/b6b70935-.../download/238
category_type,category_label,pop_2563,pop_2564,pop_2565,pop_2566,pop_2567
เพศ,   ชาย,"41,597","70,081","147,982","184,758","216,128"
```

City-level only (เมืองพัทยา), annual 2563–2567, Open Data Common. Relevant because registered population **understates** people present in tourist/industrial areas [Assumption, supported by the existence of this dataset].

### 2.6 Evaluation

| Criterion | DOPA current files | data.go.th copy | GISTDA EEC tambon |
|---|---|---|---|
| Granularity | Tambon (names) | Tambon (codes) | Tambon polygon (codes) |
| Coverage | National | National | EEC |
| History | Year pages 2537–2568 | 2536–2563 | 2562 only |
| Update | Monthly/annual files [Documented on site menu] | None | None |
| Auth | None | None | None |
| Licence | Not stated on site | CC BY | Not stated |
| Improves Best Potential Use? | **Yes** — resident base and age structure near the property | Superseded | **Yes** — density denominator and tambon geometry |
| MVP | **Suitable** (file download; name matching needed) | Use only for codes/history | **Suitable** (geometry + codes) |

**Security note [Verified-live]:** the page `stat.bora.dopa.go.th/stat/statnew/statMenu/newStat/home.php` loads scripts from third-party domains (`imgserver.org`, `*.ovh` counters). The project should consume **only the `.txt` data files**, never embed or execute these pages.

---

## 3. Income — NSO Household Socio-Economic Survey

```
GET https://data.go.th/api/3/action/package_show?id=os_08_00007  → HTTP 200
  Title รายได้เฉลี่ยต่อเดือนของครัวเรือน · Publisher สำนักงานสถิติแห่งชาติ · Licence Creative Commons Attributions · freq ปี · geo จังหวัด

GET https://catalogapi.nso.go.th/api/index?table=SFD_SPB0802_66&format=json
→ HTTP 200, 4,964,707 B, 7,700 records, keys [year, province, source_income1, source_income2, source_income3, soc_eco_class1, soc_eco_class2, value, unit, attribute, source]
  {"year":"2566","province":"ชลบุรี","source_income1":"รายได้ประจำ","source_income2":"รายได้ที่เป็นตัวเงิน","source_income3":"เงินที่ได้รับเป็นการช่วยเหลือ","soc_eco_class1":"ผู้ประกอบธุรกิจของตนเองที่ไม่ใช่การเกษตร", "value":1764.0,"unit":"บาท", ...}

GET https://catalogapi.nso.go.th/api/index?table=SFD_SPB0803&format=json
→ HTTP 200, 8,085 records — income distribution (% of households by income band) by province
  {"year":"2566","province":"ชลบุรี","hh_size":"รวมทั้งสิ้น","income":"ต่ำกว่า 1,500 บาท","value":0.1,"unit":"ร้อยละ"}
```

| Item | Finding |
|---|---|
| Granularity | **Province** (tables `SFD_SPB0802_66`, `SFD_SPB0803`); regional tables `SES_OS_19/20` go back to 2554 [Verified-live] |
| Year | **2566 only** in the province tables [Verified-live] |
| Auth / key | **None** [Verified-live] |
| Format | JSON and CSV [Verified-live] |
| Sample survey | Values carry survey footnotes (e.g., "ข้อมูลจากการสำรวจตัวอย่างมีค่าเป็น 0") [Verified-live] |
| Improves Best Potential Use? | **Moderately** — price-tier context of a use concept, at province level only |
| MVP | **Suitable as province context**; must never be shown as local income |

---

## 4. Workers / employment

### 4.1 DIW factory registry — EEC (workers per factory, tambon)

```
GET https://data.go.th/api/3/action/package_show?id=fac-eec-class31  → HTTP 200
  Title ข้อมูลโรงงานในเขตพัฒนาพิเศษภาคตะวันออก · Publisher กรมโรงงานอุตสาหกรรม · Licence Open Data Common · freq เดือน · modified 2026-08-24
GET https://diw-dataset.diw.go.th/dataset/0e396901-f467-48f9-98a4-9f8642508644/resource/08cd67da-127d-4c23-97fa-dc98ad6863d6/download/
→ HTTP 200, 4,919,896 B, ~8,247 rows
```

```csv
เลขทะเบียนโรงงานเดิม,fid,รหัสประเภท,ประเภทโรงงาน,จำพวก,ปีที่อนุญาต,ชื่อโรงงาน,ประกอบกิจการ,เลขที่,หมู่,ซอย,ถนน,ตำบล,อำเภอ,จังหวัด,รหัสไปรษณีย์,เงินทุนรวม (ล้านบาท),คนงานรวม,แรงม้า
,20200080625694,06402,การทำผลิตภัณฑ์ด้วยวิธีปั๊มหรือกระแทก,3,2569,บริษัท ศูนย์รวมเหล็ก พาณิชย์ แหลมฉบัง จำกัด,ปั๊มแผ่นโลหะ,456,9,,,หนองขาม,ศรีราชา,ชลบุรี,20230,175,8,283
```

| Item | Finding |
|---|---|
| Content | Licensed factories (class 3) in the EEC: type, year, capital, **total workers (คนงานรวม)**, address to **tambon/amphoe** [Verified-live] |
| Chon Buri rows | 4,144 of the file [Verified-live] |
| Coordinates | **None** [Verified-live] |
| Contains business names | Yes — juristic entities; no personal names observed in the sample |
| Limitation | Factory workers only (not retail, services, offices); licensed workforce ≠ current headcount [Assumption] |
| Improves Best Potential Use? | **Yes** for worker-driven concepts (worker housing, food/service near industrial estates) — at tambon level |
| MVP | **Suitable** (aggregate workers by tambon → derived feature) |

### 4.2 Social Security Office insured persons — province, monthly

```
data.go.th sso01 (สำนักงานจังหวัดชลบุรี) → https://chonburi.gdcatalog.go.th/.../download...
ปี,เดือน,มาตรา 33 (คน),มาตรา 39 (คน),มาตรา 40 (คน),รวม (คน)
2565,ม.ค.,"736,993","92,701","538,815","1,368,509"
```

Province, monthly, from 2565, Open Data Common [Verified-live]. **Context only.**

### 4.3 Labour force survey — Chon Buri, quarterly

```
data.go.th lfchonburi → CSV
จังหวัด,ปี,ไตรมาส,เพศ,หัวข้อ,จำนวน
ชลบุรี,2559,1,ชาย,ประชากรอายุ 15 ปีขึ้นไป,716067
ชลบุรี,2559,1,ชาย,ผู้มีงานทำ,574117
```

Province, quarterly, from 2559; also occupation and industry breakdown resources [Verified-live]. **Context only.**

---

## 5. Tourism

### 5.1 MOTS — domestic tourism by province, monthly (with hotel occupancy)

```
GET https://www.mots.go.th/news/category/820   → HTTP 200 (list page, 2569)
GET https://www.mots.go.th/images/v2022_84449624-a42a-4e8b-8c2f-eb983373f91b.xlsx  → HTTP 200, 594,611 B
Sheets: ม.ค.2569R, ก.พ.2569R, มี.ค.2569R, เม.ย.2569p, พ.ค.2569p, มิ.ย.2569p, ก.ค.2569p, ส.ค.2569p, สะสมม.ค.-ส.ค 2569p
Columns: อัตราการเข้าพัก (2569, 2568, change) · จำนวนผู้เข้าพัก · จำนวนผู้เยี่ยมเยือนทั้งหมด · ผู้เยี่ยมเยือนคนไทย · ...
ชลบุรี (ม.ค.2569R): occupancy 78.45 % (2568: 82.12 %, −3.67) · guests 1,537,605 · visitors 2,128,326 · Thai visitors 1,187,042
```

| Item | Finding |
|---|---|
| Owner | กระทรวงการท่องเที่ยวและกีฬา |
| Granularity | **Province, monthly**; R = revised, p = preliminary [Verified-live] |
| History | Category pages for 2566, 2567, 2569 exist [Verified-live via search]; data.go.th `stattourism` says "ตั้งแต่ปี 2551" (HTML link, CC BY) [Verified-live] |
| Access | Public xlsx; **no API**; files named by upload UUID (not predictable) [Verified-live] |
| Improves Best Potential Use? | **Yes** for visitor-driven concepts; **occupancy is also a financial reference (§4 of file 04)** |
| MVP | **Suitable** as province context; manual/curated file ingestion |

### 5.2 Chon Buri provincial office — visitors & revenue

`csv1` → `จังหวัด,ปี,เดือน,ผู้เยี่ยมเยือน,จำนวน(คน),รายได้(ล้านบาท)` e.g. `ชลบุรี,2565,1,ไทย,"926,649","5,152.39"` [Verified-live]. Duplicates MOTS at province level; useful as a CSV mirror.

---

## 6. Students

| Candidate | Result |
|---|---|
| data.go.th `q=จำนวนนักเรียน` | 371 datasets, overwhelmingly **per-province office uploads of other provinces**, inconsistent schemas [Verified-live] |
| Chon Buri provincial office datasets (286) filtered for นักเรียน/นักศึกษา | **None found** [Verified-live] |
| GISTDA `EEC_Public/EEC_School`, `opendata/School` services | Exist [Verified-live: names]; **not tested** |
| OBEC per-school student counts, MHESI university enrolment | **Not tested** |
| Existing OSM school/university locations | Available (existing source), counts of institutions, not students |

**Classification:** student numbers **NOT AVAILABLE** reliably for MVP. Institution locations are a **derived** proxy from OSM (existing) or GISTDA school layers (untested).

---

## 7. Local economic activity

| Candidate | Result |
|---|---|
| DIW factories (workers, capital) by tambon | Available (§4.1) |
| OSM POI mix (existing) | Available, completeness-biased (existing research) |
| DBD juristic persons | data.go.th has 32 DBD datasets; province-office uploads exist (e.g., Nakhon Ratchasima monthly registrations) [Verified-live: listing]; **Chon Buri dataset not tested** |
| NSO/NESDC gross provincial product | **Not tested** |

---

## 8. Requirement classification

| Requirement | Classification | Source | Granularity | Evidence type |
|---|---|---|---|---|
| Population | **AVAILABLE — new source** | DOPA registration files (Dec 2568) | Tambon | Authoritative fact (registered, not present, population) |
| Population density | **DERIVED** | DOPA population ÷ GISTDA EEC tambon polygon area | Tambon | Derived feature |
| Households | **AVAILABLE — new source** (dated) | DOPA `HOUSE` (data.go.th copy to 2563) / GISTDA `HOUSE62` (2562) | Tambon | Authoritative fact (houses registered, ≈ not households) |
| Age distribution | **AVAILABLE — new source** | DOPA single-year age file | Tambon | Authoritative fact |
| Income | **AVAILABLE — new source** (province only) | NSO SES 2566 API | Province | Market-context evidence (survey) |
| Students | **NOT AVAILABLE** (MVP) | — (OSM institution locations as proxy) | — | Derived proxy only |
| Workers | **AVAILABLE — new source** (factory workers) | DIW EEC factory registry | Tambon | Authoritative fact (licensed workforce) |
| Tourism | **AVAILABLE — new source** | MOTS monthly provincial xlsx | Province | Market evidence |
| Local economic activity | **DERIVED** | DIW factories + OSM POIs (existing) | Tambon / point | Derived feature |
| Non-registered population | **AVAILABLE — new source** (Pattaya only) | Pattaya City open data | City | Authoritative fact (estimate) |

## 9. Recommendation

1. **Adopt for MVP:** DOPA tambon population and age (current files), GISTDA EEC tambon polygons (for density and as the tambon geometry reference), DIW factory workers by tambon, NSO province income, MOTS province tourism.
2. **Label granularity every time.** Income and tourism are **province-level context**, not neighbourhood facts.
3. **Disclose "registered population"** and note under-counting in tourist/industrial areas, using Pattaya's latent-population figures as supporting evidence where relevant.
4. **Don't pursue** student counts for MVP. Use institution proximity (OSM) as a labelled proxy.
5. **Further research:** DBD Chon Buri juristic registrations, GISTDA school layers, gross provincial product, whether DOPA exposes household counts in current files.
