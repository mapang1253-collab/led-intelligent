# 1. Legal / Regulatory — Source Investigation

> **HISTORICAL REGIONAL SOURCE INVESTIGATION.** Chon Buri/EEC is the research and validation fixture in this file, not a candidate MVP or product boundary. Current nationwide scope, legal-rule governance and activation requirements are defined by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/validation-architecture.md`](../../docs/validation-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-15 (B.E. 2569)
- **Test area:** Chon Buri (regional research fixture inside the Eastern Economic Corridor, EEC)
- **Test points (WGS84, approximate):** P-A Mueang Chon Buri 13.3611, 100.9847 · P-B Si Racha 13.1737, 100.9311 · P-C Bang Saen 13.2830, 100.9270
- **Method:** Public CKAN APIs, public ArcGIS REST services, official legal text (Royal Gazette announcement PDF, as republished by the Association of Siamese Architects), `curl` at ≤1 req/s. No login, token or CAPTCHA was bypassed.

> Labels: **[Verified-live]** · **[Documented]** (stated by the owner) · **[Assumption]** · **[Not tested]**
> Evidence types: **Authoritative fact** · **Derived feature** · **Market evidence** · **User input** · **Assumption**

---

## 1. Why this category matters for Best Potential Use

Legal permissibility is HBU **gate 1** ([`docs/data-architecture.md`](../../docs/data-architecture.md) AD-13). A use that isn't permitted can't be "best". Gap G2 was ranked Critical, with no source found.

The test this category must pass: *does the evidence let the system reject or allow a proposed use concept for a specific parcel?*

## 2. Which plan applies in Chon Buri

### 2.1 DPT open data — list of plans in force

```
GET https://opendata.dpt.go.th/dataset/97570bf5-6c09-419c-83e2-ce650cf14bba/resource/54c73a2d-77d8-4f9c-b65c-7e3a0758e727/download/tp_name.csv
→ HTTP 200, 67,890 B
NAME,PROVINCE,TYPE,STATUS,DATE
ผังเขตพัฒนาพิเศษภาคตะวันออก,ฉะเชิงเทรา ชลบุรี ระยอง,ผังเขตพัฒนาเศรษฐกิจพิเศษ,บังคับใช้,9 ธันวาคม 2562
```

The in-force list contains **no other Chon Buri plan** [Verified-live]. The historical regulation list (`tp_reg.csv`, 197,801 B) does record `ผังเมืองรวมจังหวัดชลบุรี, แรกประกาศ, 2017-05-03` and `ผังเมืองรวมเมืองชลบุรี` revisions (1990–2010) [Verified-live].

**Reading:** for Chon Buri, the plan in force per DPT's list is the **EEC land-use plan** [Verified-live for the list]. How current DPT's list is: **not stated** (`update_frequency: ตามเวลาจริง` for `dpt_01_01`, `ไม่ทราบ` for `dpt1_001_002`).

### 2.2 The legal instrument

Royal Gazette vol. 136, special issue 301 ง, 9 December 2562: *ประกาศคณะกรรมการนโยบายเขตพัฒนาพิเศษภาคตะวันออก เรื่อง แผนผังการใช้ประโยชน์ในที่ดิน และแผนผังการพัฒนาโครงสร้างพื้นฐานและระบบสาธารณูปโภค เขตพัฒนาพิเศษภาคตะวันออก พ.ศ. 2562*.

Text retrieved from `https://download.asa.or.th/03media/04law/eec/ba62.pdf` (HTTP 200, 108 MB, 200 pages) and text-extracted locally [Verified-live].

| Finding | Evidence | Label |
|---|---|---|
| Defines **zone types** with purposes (e.g., พ. ศูนย์กลางพาณิชยกรรม, sub-areas พ.-1 to พ.-7; ม. ชุมชนเมือง, ม.-1 to ม.-53; รม. รองรับการพัฒนาเมือง …) | ข้อ 7 | Verified-live |
| Defines **permitted uses and prohibited uses per zone type** | ข้อ 8 onward | Verified-live |
| **Does not contain FAR, OSR, building coverage, height or setback rules.** Full-text search of all 200 pages for `อัตราส่วนพื้นที่อาคารรวม`, `อัตราส่วนของที่ว่าง`, `ความสูง`, `ถอยร่น` → **0 hits** | text search | Verified-live (subject to PDF text-extraction quality) |
| **Interim instrument:** applies until a Ministry of Interior comprehensive plan (ผังเมืองรวม) is enforced in the area | ข้อ 3: "…ให้สิ้นสุดระยะเวลาการใช้บังคับเมื่อมีประกาศกระทรวงมหาดไทยให้ใช้บังคับผังเมืองรวมในท้องที่…" | Verified-live |
| **Amended:** No. 2 (พ.ศ. 2563) cancels area `ขก.-3` in the land-use map | `ba63(02).pdf`, ข้อ 3 | Verified-live |

Example rule, recorded verbatim (whitespace normalised):

> ข้อ ๘ ที่ดินประเภท พ. เป็นที่ดินประเภทศูนย์กลางพาณิชยกรรม ให้ใช้ประโยชน์ในที่ดิน เพื่อพาณิชยกรรม การอยู่อาศัย สถาบันราชการ สาธารณูปโภค สาธารณูปการ และกิจการอื่น นอกจากข้อห้าม ดังต่อไปนี้ (๑) โรงงานตามกฎหมายว่าด้วยโรงงาน เว้นแต่… (๒) คลังน้ำมัน… (๓) คลังก๊าซปิโตรเลียมเหลว… (๔) เลี้ยงสัตว์ทุกชนิดเพื่อการค้าที่อาจก่อเหตุรำคาญ… (๕) จัดสรรที่ดินเพื่อประกอบอุตสาหกรรม… (๖) จัดสรรที่ดินเพื่อประกอบเกษตรกรรม…

**Architectural significance:** the rules are written as *"allowed: broad categories, except a prohibited list"*. That suits a **use-agnostic** system. A proposed use concept can be checked against the prohibited list for its zone. There is no fixed list of allowed businesses to enumerate.

## 3. Candidate source A — EEC land-use plan map (GISTDA-hosted ArcGIS service)

| Item | Finding |
|---|---|
| Authoritative owner | EEC Policy Committee / Eastern Economic Corridor Office (สกพอ.) — legal instrument. **Host:** GISTDA portal. Whether the hosted layer is the official digital version is **not stated** [Verified-live: no copyright/description text] |
| Endpoint | `https://gistdaportal.gistda.or.th/data/rest/services/EEC_Public/แผนที่การใช้ประโยชน์ในที่ดิน/MapServer` |
| Folder discovery | `GET https://gistdaportal.gistda.or.th/data/rest/services?f=json` → HTTP 200, public folder list incl. `EEC_Public` [Verified-live] |
| Service metadata | `capabilities: Map,Query,Data`, `maxRecordCount: 1000`, spatial reference 32647 (UTM 47N) [Verified-live] |
| Layers | 0 ขอบเขตพื้นที่ · 1 เขตการปกครอง · 2 เขตชายฝั่ง · 3 เขตอนุรักษ์และเขตทหาร · 4 โครงข่ายถนนEEC · 5 ทางรถไฟEEC · 6 ทางรถไฟความเร็วสูง · 7 โครงข่ายถนน · **8 การใช้ประโยชน์ในที่ดิน** [Verified-live] |
| Layer 8 fields | `MIN_PL_NO`, `MIN_PL_BLOCK`, `PLLU_DESC`, `SUM_AREA_RAI`, `MIN_AREA_KM`, `REMARK`, `PL_BLOCK_R2`, `PL_NO_R2`, `Shape_*` [Verified-live] |
| Layer 8 classes (`PLLU_DESC`) | ศูนย์กลางพาณิชยกรรม · ชุมชนเมือง · รองรับการพัฒนาเมือง · เขตส่งเสริมเศรษฐกิจพิเศษสำหรับกิจการพิเศษ · เขตส่งเสริมเศรษฐกิจพิเศษสำหรับอุตสาหกรรมเป้าหมายพิเศษ · พัฒนาอุตสาหกรรม · ชุมชนชนบท · ส่งเสริมเกษตรกรรม · เขตปฏิรูปที่ดิน · อนุรักษ์ป่าไม้ · ที่โล่งเพื่อการรักษาคุณภาพสิ่งแวดล้อม · อ่างเก็บน้ำ หนอง บึง · พื้นที่เกาะ · เขตทหาร [Verified-live] |
| Authentication | **None** for this service. Note: sibling folder `L14_Elevation` returned `499 Token Required` — tokens are enforced where required, and this service did not require one [Verified-live] |
| Rate limits | Not published. `maxRecordCount` 1000 per query [Verified-live] |
| Licence | **Not stated** on the service. The legal text itself is a public Royal Gazette publication |

### Real request and response

```
GET https://gistdaportal.gistda.or.th/data/rest/services/EEC_Public/%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%82%E0%B8%A2%E0%B8%8A%E0%B8%99%E0%B9%8C%E0%B9%83%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B4%E0%B8%99/MapServer/8/query
    ?geometry=100.9847,13.3611&geometryType=esriGeometryPoint&inSR=4326
    &spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json
→ HTTP 200 (3.56 s)
```

| Test point | `MIN_PL_BLOCK` | `PLLU_DESC` | Polygon area |
|---|---|---|---|
| P-A Mueang Chon Buri | **พ.-2** | ที่ดินประเภทศูนย์กลางพาณิชยกรรม | 22,442 rai |
| P-B Si Racha | **พ.-3** | ที่ดินประเภทศูนย์กลางพาณิชยกรรม | 9,360 rai |
| P-C Bang Saen | **ม.-21** | ที่ดินประเภทชุมชนเมือง | 18,933 rai |

Response excerpt (P-A):

```json
{"MIN_PL_NO":"2","MIN_PL_BLOCK":"พ.-2","MIN_AREA_KM":35.907705533923966,
 "OBJECTID":281,"PLLU_DESC":"ที่ดินประเภทศูนย์กลางพาณิชยกรรม","SUM_AREA_RAI":22442.315958702482,
 "REMARK":null,"PL_BLOCK_R2":null,"PL_NO_R2":null}
```

The block codes (`พ.-2`, `ม.-21`) use the same notation as the legal text (`พ. - ๑ ถึง พ. - ๗`, `ม. - ๑ ถึง ม. - ๕๓`) [Verified-live]. So the map result can be linked to the rule text by zone type.

### Evaluation

| Criterion | Assessment |
|---|---|
| Granularity | Zone polygon (tens of km² in urban centres). **A parcel near a zone boundary may be misclassified** if the property anchor is imprecise |
| Coverage | EEC area (Chachoengsao, Chon Buri, Rayong); the service extent was not measured |
| History | Single current layer; no versions exposed. Whether Amendment No. 2 (2563) is reflected: **Not tested** |
| Update frequency | Not stated |
| Materially improves Best Potential Use? | **Yes** — it's the only tested evidence that can **exclude** use concepts (e.g., factory uses in พ./ม. zones) |
| MVP suitability | **Suitable with conditions:** (1) needs a location anchor (point); (2) zone boundary proximity must lower confidence; (3) currency must be confirmed against the in-force instrument; (4) licence/attribution clarified with GISTDA/EECO |
| Evidence type | Zone membership = **derived feature** (point-in-polygon) from an **authoritative fact** (published plan). Permitted/prohibited rules = **authoritative fact** (legal text) |

## 4. Candidate source B — DPT data service (`dptdata.dpt.go.th`)

```
GET https://dptdata.dpt.go.th/dptservice/dptapiaccess.php?filetokenkey=5IQxskMi...   (URL as published in data.go.th dataset dpt_02_02 "ขอบเขตผังเมือง")
→ HTTP 200  {"returnCode":"99","returnMessage":"Token Fail or Token Expire"}
```

| Item | Finding |
|---|---|
| Owner | กรมโยธาธิการและผังเมือง (DPT) |
| What it offers | Plan boundary data (`ขอบเขตผังเมือง`) via token-keyed file access. The portal's JavaScript references registration and request flows (`register`, `dptrequest/selectcategory`) [Verified-live code inspection] |
| Access | **Token required**; the catalog-published token is expired/invalid [Verified-live]. Obtaining a token requires registration/request [Documented by portal code; process not completed] |
| Zone-level land-use polygons | **Not found** in DPT's public CKAN (14 datasets; only plan names/dates and the token-gated boundary service) [Verified-live] |
| MVP suitability | **Not for MVP** unless the project registers. Even then, "plan boundary" isn't zoning detail |

## 5. Candidate source C — Building-control rules (FAR, OSR, height, setback, road-width rules)

| Item | Finding |
|---|---|
| In the EEC plan | **Absent** (§2.2) |
| Where such rules usually live | Comprehensive plan ministerial regulations (ผังเมืองรวม) and Building Control Act ministerial regulations [Assumption — general Thai regulatory knowledge; not researched as text in this session] |
| Machine-readable source | **None found** |
| Special controls seen but not tested | GISTDA `EEC_Data/Envinment_Control_Phatthaya` and `Envinment_Control_banglamung` services exist (names suggest environmental control areas, which often carry height limits) [Verified-live: service names only; **content not tested**] |
| MVP suitability | **Not available** as data. Intensity must be a **user input** or an explicitly labelled **assumption** |

## 6. Candidate source D — Special-area restrictions

| Layer | Status |
|---|---|
| EEC land-use service layer 2 เขตชายฝั่ง, layer 3 เขตอนุรักษ์และเขตทหาร | Present [Verified-live: layer list]; point query **not tested** |
| EEC land-use classes อนุรักษ์ป่าไม้, เขตปฏิรูปที่ดิน, เขตทหาร, ที่โล่งเพื่อการรักษาคุณภาพสิ่งแวดล้อม | Present as zone classes in layer 8 [Verified-live] |
| Environmental control areas (Pattaya, Bang Lamung) | Services exist [Verified-live: names]; **not tested** |

## 7. Requirement classification

| Requirement | Classification | Source / reason | Evidence type |
|---|---|---|---|
| Zoning / land-use zone (Chon Buri) | **AVAILABLE — new source** | EEC land-use map via GISTDA ArcGIS; legal basis Royal Gazette 2562 (+ amendment 2563) | Derived feature from authoritative fact |
| Permitted / prohibited uses | **AVAILABLE — new source** (manual curation) | Rule text per zone type; must be curated once into a reference table, with source clause | Authoritative fact |
| Building restrictions (general) | **NOT AVAILABLE** | No machine-readable source; not in EEC plan | — |
| Height restrictions | **NOT AVAILABLE** (MVP) | Not in EEC plan; environmental control layers untested | User input / assumption |
| Setback | **NOT AVAILABLE** | Not in EEC plan | User input / assumption |
| FAR / BCR / OSR | **NOT AVAILABLE** | Verified absent from EEC plan text | **ASSUMPTION** (user-adjustable) |
| Special-area restrictions | **AVAILABLE — new source** (partial; untested queries) | Coastal/conservation/military layers + zone classes | Derived feature |

## 8. Recommendation

1. **Adopt** the EEC land-use zone as the MVP's legal-permissibility evidence for Chon Buri, **only as a screen**: "not prohibited in this zone type" / "prohibited" / "unknown (near boundary or outside EEC coverage)".
2. **Curate** a small reference of zone type → permitted categories → prohibited list, each with its legal clause, instrument version and amendment status.
3. **Do not** present intensity (FAR/height/setback) as evidence; treat buildable floor area as a **user-adjustable assumption** with a visible "not verified against building control law" label.
4. Before relying on it: confirm with EECO/GISTDA that the hosted layer reflects the in-force plan including amendments, and clarify licence/attribution.
5. Keep DPT data service and DOL LandsMaps as **further research** (registration/credentials), not MVP dependencies.
