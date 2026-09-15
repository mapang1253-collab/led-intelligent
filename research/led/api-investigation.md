# LED (กรมบังคับคดี) — API & Endpoint Investigation

> **HISTORICAL SOURCE RESEARCH.** This file records dated source observations and does not activate an adapter. Current nationwide scope, source roles and activation rules are governed by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).

- **Investigated:** 2026-09-14 (B.E. 2569)
- **Method:** Plain HTTPS requests (`curl`) and page inspection, exactly as a browser would submit the public forms. No login, no authentication bypass, no automated solving of verification codes. Low request volume (~30 requests total, with pauses).
- **Companion doc:** [`docs/data-sources/led.md`](../../docs/data-sources/led.md)

> **Status legend**
> - **DOCUMENTED** — officially published API/dataset with metadata.
> - **PUBLIC-UNDOCUMENTED** — reachable via normal public web pages/forms, but no API documentation, no stability guarantee.
> - **NOT TESTED** — identified but deliberately not exercised.

---

## 1. Summary of findings

| # | Source | Status | Granularity | Machine-readable | Useful for us |
|---|---|---|---|---|---|
| A | `opendata.led.go.th` / `data.go.th` CKAN API (org `led`) | DOCUMENTED | Monthly, national aggregates by asset type | Yes (CSV, CKAN JSON, datastore API) | Market context only |
| B | `asset.led.go.th/newbidreg/` auction announcement search | PUBLIC-UNDOCUMENTED | Per property (per sale item) | No — HTML only | **High** (core LED value) |
| C | `asset.led.go.th/report/report.asp` auction results report | PUBLIC-UNDOCUMENTED | Per sale item, per sale date | No — HTML only | **High** (realized prices) |
| D | Property images `asset.led.go.th/PPKPicture/...` | PUBLIC-UNDOCUMENTED | Per property | JPEG | Low–medium (visual evidence) |
| E | `live.led.go.th`, LED e-auction, LED mobile apps | NOT TESTED | — | — | Unknown |

**No official per-property API was found.** Per-property data exists only as server-rendered HTML (classic ASP).

---

## 2. Source A — Official open data (CKAN)

### 2.1 Endpoints (DOCUMENTED, standard CKAN API v3)

| Purpose | URL |
|---|---|
| Org lookup | `https://data.go.th/api/3/action/organization_autocomplete?q=บังคับคดี` → `{"id":"14005000","name":"led"}` |
| List LED datasets | `https://data.go.th/api/3/action/package_search?fq=organization:led&rows=100` (43 datasets on 2026-09-14) |
| LED's own CKAN | `https://opendata.led.go.th/api/3/action/package_list` (same dataset IDs; data.go.th harvests from it — `harvest_source_title: "harvest : led"`) |
| Dataset metadata | `https://opendata.led.go.th/api/3/action/package_show?id=<name>` |
| Row query | `https://data.go.th/api/3/action/datastore_search?resource_id=<id>&limit=N` (datastore_active = true) |

No API key was required for any of the above.

### 2.2 Relevant datasets

| Dataset `name` | Title | Content | First year | Update | License |
|---|---|---|---|---|---|
| `led_it_0002` | ประกาศขายทอดตลาดนัดแรก | Count + value of properties announced for **first** auction round, by fiscal year / month / asset type | 2565 | Monthly | CC BY-NC |
| `led_it_0003` | จำนวนประกาศขายทอดตลาด | Count + value of all auction announcements, by FY / month / asset type | 2566 | Monthly | CC BY-NC |
| `led_ppd_0003` | มูลค่าการผลักดันทรัพย์สินออกจากกระบวนการบังคับคดี | Value of assets exiting enforcement (withdrawal, suspension, auction) — officer appraisal at seizure | 2565 | Monthly | CC BY-NC |
| `led_ppd_0006` | …ด้วยการขายทอดตลาด | Same, auction only | — | Monthly | CC BY-NC |
| `led_ppd_0007` | จำนวนสำนวนคดีในขั้นตอนขายทอดตลาด | Number of case files in auction stage, monthly | — | Monthly | CC BY-NC |
| `led_it_0001` | หมายบังคับคดี | Enforcement writs (many monthly CSVs) | — | Monthly | CC BY-NC |
| `led_os_0002` | สถานที่ตั้งของหน่วยงาน | LED office addresses/phones | — | "อื่นๆ" | CC BY-NC |

Metadata common to these: `data_classification: เปิดเผย`, `accessible_condition: ไม่มีการจำกัดการเข้าถึงข้อมูล`, `isopen: False`, `license_title: Creative Commons Attribution Non-Commercial`, maintainer `itsupport@led.mail.go.th` (IT) or `plan@led.mail.go.th` (planning). `geo_coverage_other` = "ตามกฎกระทรวงแบ่งส่วนราชการ กรมบังคับคดี" — i.e. **not broken down geographically**.

### 2.3 Example resources & responses

`led_it_0002` → `https://opendata.led.go.th/dataset/dee095a1-97eb-46ce-9ca2-2f3697c10040/resource/a7414d95-b70a-43a7-9af6-a9f4cdc793e4/download/auction-01-07-2569.csv` (363 lines)

```csv
Fiscal year,month,Type,Value,Price
2565,พฤศจิกายน,ที่ดินพร้อมสิ่งปลูกสร้าง,28,262459446.3
2565,พฤศจิกายน,ที่ดินว่างเปล่า,78,555763076.3
2565,พฤศจิกายน,ห้องชุด,5,19933900
```

`led_it_0003` → `.../resource/01150677-4d40-4e71-adaa-9415838f64a2/download/auction-02-07-2569.csv` (393 lines)

```csv
Fiscal year,month,Type,Value,Price
2566,ตุลาคม,ที่ดินพร้อมสิ่งปลูกสร้าง,8033,72199859204
2566,ธันวาคม,ที่ดินพร้อมสิ่งปลูกสร้าง,18259,1.15067E+11
```

Datastore API response (truncated):

```json
{"success": true, "result": {"resource_id": "a7414d95-b70a-43a7-9af6-a9f4cdc793e4",
 "records": [{"_id":1,"Fiscal year":2565,"month":"ตุลาคม","Type":"ที่ดินพร้อมสิ่งปลูกสร้าง","Value":0,"Price":0.00}],
 "fields": [{"id":"Fiscal year","type":"numeric"},{"id":"month","type":"text"},{"id":"Type","type":"text"},{"id":"Value","type":"numeric"},{"id":"Price","type":"numeric"}]}}
```

**Quality notes:** Thai month names; Buddhist-era fiscal year (Oct–Sep); `Price` sometimes in Excel scientific notation (`1.15067E+11` — precision lost); `led_ppd_0003` CSV has trailing empty columns (`,,,,`). Meaning of `Value` = count ("เรื่อง") per `unit_of_measure`; exact definition of `Price` (appraisal vs. starting price) is **not stated** — UNCERTAIN.

---

## 3. Source B — Auction announcement search (`asset.led.go.th/newbidreg/`)

Technology: classic ASP, session cookie `ASPSESSIONID…`, UTF-8 HTML. `robots.txt` on both `www.led.go.th` and `asset.led.go.th`: `User-agent: * / Allow: /`. `https://asset.led.go.th/` meta-refreshes to `/newbidreg/`.

### 3.1 Entry points observed

| Path | Method | Parameters | Verification code? | Tested |
|---|---|---|---|---|
| `/newbidreg/default.asp` (main search) | POST | `region_name` (office), `province`, `ampur`, `tumbol`, `postcode`, `asset_type`, `person1` (plaintiff), `bid_date`, `price_begin`, `price_end`, `rai_if`/`rai`, `quaterrai_if`/`quaterrai`, `wa_if`/`wa` (1 = equal, 2 = less than, 3 = greater than), `oseckey`, `seckey`, `search=ok` | **Yes** — "รหัสยืนยัน" field | **Not submitted.** We treat the verification code as an anti-automation control and did not automate it. |
| `/newbidreg/get_amphur.asp?provinceId=<2-digit province code>` | GET | `provinceId` (e.g. `10` = Bangkok, `50` = Chiang Mai) | No | Yes — returns HTML `<option value='1070'>เขตพระโขนง(บางกะปิ)</option>…` |
| `/newbidreg/get_tambon.asp?amphurId=<id>` | GET | `amphurId` | No | Not called directly (same pattern) |
| `/newbidreg/asset_day.asp` ("ทรัพย์ขายวันนี้") | POST | `search_bid_date=DD/MM/YYYY(BE)`, `search=ok` | No | Yes |
| `/newbidreg/asset_search_day.asp` | POST | `province_id` (LED office code, e.g. `602`, `024`), `province_name`, `search_bid_date`, `search=ok`, `page` | No | Yes |
| `/newbidreg/asset_search_law_suit.asp` (search by red case no.) | POST | `search_law_suit_no`, `search_law_suit_year`, `search_law_court_name`, `search_owner_suit_name`, `search_person1`, `search=ok` | No | Yes |
| `/newbidreg/asset_map.asp` | GET | — | No | Yes — SVG province picker only, **no coordinates** |
| `/newbidreg/asset_open.asp` (detail page) | POST | the full hidden-field record (see 3.3) | No | Yes |

`default.asp` with `mode=map` / `mode=lawsuit` → 302 to `asset_map.asp` / `asset_search_law_suit.asp`.

### 3.2 `asset_day.asp` response

HTML table: office name, number of items for sale today, "ดูทรัพย์" button (a hidden form per office posting to `asset_search_day.asp`), link to `https://live.led.go.th/index.asp?branch=<slug>`.

Example on 14/09/2569: นครสวรรค์ 3, พิษณุโลก 1, ล้มละลาย 1 = 187, ล้มละลาย 2 = 87, ล้มละลาย 5 = 235, …

```html
<form METHOD=POST action="asset_search_day.asp" name="list1" id="list1" target="_blank">
  <input type="hidden" name="province_id" value="602">
  <input type="hidden" name="province_name" value="นครสวรรค์">
  <input type="hidden" name="search_bid_date" value="14/09/2569">
  <input type="hidden" name="search" value="ok">
</form>
```

Note: `province_id` here is an **LED office code** (e.g. `602` นครสวรรค์, `024` ล้มละลาย 5), **not** a DOPA/Interior province code. Office codes also appear in `/report/report.asp` (`020`–`024`, `040` = ล้มละลาย 1–6, `025` = ล้มละลาย สถาบันการเงิน, `027` = กองล้มละลาย, …).

### 3.3 `asset_search_day.asp` / `asset_search_law_suit.asp` response

- Visible table columns: ล๊อตที่-ชุดที่, ลำดับที่การขาย, หมายเลขคดี, ประเภททรัพย์, ไร่, งาน, ตร.วา, ราคาประเมิน, ตำบล, อำเภอ, จังหวัด.
- 30 rows per page; pagination by POSTing `page=N` (ล้มละลาย 5 showed `1/8`).
- Red rows = sold or withdrawn/suspended (per on-page note).
- **Each row embeds a hidden `<form action="asset_open.asp">` containing the full structured record.** This is the richest machine-parseable representation available.

Hidden fields observed (example values from a bankruptcy-division listing; personal names redacted):

| Field | Example | Interpretation (confidence) |
|---|---|---|
| `auc_asset_gen` | `1968758` / *(empty)* | Internal asset ID — **empty for all 30 bankruptcy-division rows sampled**; present for provincial office rows (medium) |
| `law_court_id`, `law_court_name` | `112`, `ล้มละลายกลาง` | Court (high) |
| `law_suit_no`, `law_suit_year` | `ล.2011`, `2566` | Red case number / BE year (high) |
| `fbidnum`, `fsubbidnum`, `str_bid_num` | `13`, `1`, `13 - 1` | Sale lot / sub-item (high) |
| `AssetTypeID`, `assettypedesc` | `003`, `ที่ดินพร้อมสิ่งปลูกสร้าง` | Asset type (high) — codes listed in §3.5 |
| `landtype` | `โฉนดเลขที่`, `ตามสำเนาโฉนดเลขที่`, `-` | Title document type, free text (medium) |
| `deedno` | `27649`, `20686,80392-80398`, `27200 (เดิม 68748)`, `-` | Title deed number(s), free text (high that it is the deed no.; format not normalized) |
| `deedtumbol`, `deedampur`, `deedcity` | `หนองจอก`, `หนองจอก`, `กรุงเทพมหานคร` | Location **as written on the deed** (high) |
| `addrno`, `tumbol`, `ampur`, `city` | `33/11`, `หนองจอก`, … / `4/1 ม.7`, `ตำบลแม่เล่ย์`, `อำเภอกิ่งอำเภอแม่วงก์` | House number & location of property (high); prefix style inconsistent between offices |
| `rai`, `quaterrai`, `wa` | `0`, `0`, `19.8` | Area. For condos `wa` appears to hold m² (label on detail page: "ตร.วา/ตร.ม.") (medium) |
| `assetprice3` | `1026168` | ราคาประเมินของเจ้าพนักงานบังคับคดี (verified against detail page) |
| `assetprice4` | `3318873.9` | ราคาประเมินของเจ้าพนักงานประเมินราคาทรัพย์กรมบังคับคดี (verified) |
| `assetprice5` | `3318873.9` | ราคาที่กำหนดโดยคณะกรรมการกำหนดราคาทรัพย์ (verified) |
| `assetprice1`, `assetprice2` | `0` | Likely ราคาประเมินของผู้เชี่ยวชาญ (expert) and/or another price — **UNVERIFIED** |
| `assetprice6`–`9` | empty | Unknown |
| `ReserveFund`, `ReserveFund1` | `250000`, `166000` | Bidder deposit (normal / for creditor-spouse) (high) |
| `biddate1`–`biddate8` | `25690420` … `25690914` | Scheduled auction round dates, `YYYYMMDD` BE (high) |
| `issale`, `issale1`–`issale8` | `0`, `1`, `3`, `10` | Per-round status. Observed on detail pages: `0` → "-" (pending), `1` → "ขายได้" (sold), `3` → "งดขายไม่มีผู้สู้ราคา" (no bidder). `10` = **unknown** |
| `ischeck_date` | `25690220` | Date posted to web (matches "วันที่ประกาศขึ้นเว็บ 20-02-2569") (high) |
| `saletypename` | `ปลอดการจำนอง`, `ปลอดภาระผูกพัน`, `ติดจำนอง`(expected) | Encumbrance status of sale (high) |
| `occupant` | `ผู้ถือกรรมสิทธิ์`, `เจ้าของ` | Occupant label (medium) |
| `debtname`, `debtprice`, `debtdetail` | empty/`0` | Mortgage creditor / amount when sold subject to mortgage (medium) |
| `sale_location1/2`, `sale_time1/2` | "ณ อาคารอสีติพรรษ กรมบังคับคดี…", `9.00` | Auction venue/time (high) |
| `landpicture`, `map`, `mapjot` | `Z:\งานล้ม\2568\12-2558\26\27649p.jpg` | Internal file paths → public at `/PPKPicture/<path>` (photo `p`, sketch map `m`, plaintiff's map `j`) |
| `eauc` | `0` | Probably e-auction flag (low) |
| `remark`, `remark1` | `เป็นทรัพย์หมาย ข` | Free-text remarks |
| `person1`, `person2`, `ownername`, `owner_suit_name`, `tel` | *(redacted)* | Plaintiff, defendant, title holder, responsible officers, office phone — **personal data** |

### 3.4 `asset_open.asp` detail page

Human-readable rendering of the same record plus: court, red case no., plaintiff, defendant, asset type, deed type & number, area, address, owner, office & phone, officers, sale venue, per-round date & status table, the four price lines, deposit, posting date, legal remarks.

- Map buttons: "ดูแผนที่ตั้งทรัพย์พอสังเขป" (JPEG sketch), "ดูแผนที่โจทก์ส่ง" (JPEG), "ดูแผนที่จากกรมที่ดิน" → `window.open('https://landsmaps.dol.go.th/')` — **a generic link to DOL LandsMaps, no parcel parameters passed**.
- **No latitude/longitude anywhere** in listing, detail, or map pages.
- For an already-sold item (`issale*=1`), the detail page **omits the price section** entirely.
- Page footer: *"ข้อมูลต่าง ๆ ในเว็บไซต์นี้ ถือเป็นสมบัติของกรมบังคับคดี ห้ามผู้ใดนำไปใช้, ทำซ้ำ, ดัดแปลง, แก้ไขข้อมูล ดังกล่าวโดยมิได้รับอนุญาต ผู้ใดฝ่าฝืนจะถูกดำเนินคดีตามกฎหมาย"*
- Page note: *"ประกาศนี้จะถูกลบจากเวปไซต์หลังจากพ้นกำหนดวันขายทอดตลาดนัดสุดท้าย"* — announcements are removed after the last auction round.

### 3.5 Asset type codes (`asset_type` select)

`001` ที่ดินว่างเปล่า · `002` ห้องชุด · `003` ที่ดินพร้อมสิ่งปลูกสร้าง · `004` กรรมสิทธิ์ห้องชุด · `005` สิทธิการเช่า · `006` สิทธิการเช่าอาคารพาณิชย์ · `007` สิทธิการเช่าที่ดิน · `008` ทรัพย์สินต่างๆ · `009` สิ่งปลูกสร้าง · `010` สิทธิการเช่าที่ดินฯ · `011` สิทธิการเช่าสิ่งปลูกสร้าง · `012` บัตรธนาคาร · `013` สิทธิการเช่าอาคารราชพัสดุ · `014` สิทธิการเช่าอาคาร · `016` สิทธิการไถ่คืน · `017` สิทธิการเช่าช่วงที่ดิน · `018` อาวุธปืน · `019` บัตรเงินฝาก · `020` ธนบัตร · `0010`–`0015` securities/savings instruments.

Real-estate relevant: `001`, `002`, `003`, `004`, `009`, and possibly leasehold types `005`–`007`, `010`, `011`, `013`, `014`, `017`.

Note `013` สิทธิการเช่าอาคารราชพัสดุ = leasehold on **Treasury (ธนารักษ์) state property** — a direct conceptual link to the Treasury source.

### 3.6 Location select codes

`provinces` select uses 2-digit codes that match the standard Thai province code scheme (e.g. `10` กรุงเทพมหานคร, `50` เชียงใหม่, `20` ชลบุรี, `97` บึงกาฬ). `get_amphur.asp` returns 4-digit district codes (e.g. `1070`, `1041`). Some district entries carry historical names (`คลองสาน(บางลำภูล่าง)`) and a leading BOM character (`﻿`). Whether these equal DOPA codes exactly is **UNVERIFIED**.

---

## 4. Source C — Auction results report (`asset.led.go.th/report/`)

| Path | Method | Parameters | Notes |
|---|---|---|---|
| `/report/` | GET | — | Landing page. States: **"หมายเหตุ: รายงานผลการขายย้อนหลัง 6 เดือน"** |
| `/report/report.asp` | POST | `PROVINCE_ID` (LED office code, required), `saledate` `DD/MM/YYYY` BE (required), `Action` | No verification code |
| `/report/reports.asp` | POST | `ALAW_SUIT_NO` + `ALAW_SUIT_YEAR`, or `person1` (+ optional `startdate`) | Case-number or plaintiff lookup; not exercised beyond form inspection |
| `/report_new/reportm.asp` | GET | — | Older menu page, same "ย้อนหลัง 6 เดือน" note |

### Example — `PROVINCE_ID=024` (ล้มละลาย 5), `saledate=24/08/2569`

Columns: ลำดับที่ · ศาล · เลขคดีแดง · ที่ดินโฉนด · โจทก์ · ประเภททรัพย์ · ราคาประเมิน · ผลการขาย · ราคาขายได้ / ราคาเสนอสูงสุด

| ลำดับ | ศาล | คดีแดง | โฉนด | ประเภท | ราคาประเมิน | ผล | ราคาขายได้ |
|---|---|---|---|---|---|---|---|
| 1 - 1 | ล้มละลายกลาง | 7240/2550 | 24729 | ที่ดินว่างเปล่า | 25,000 | ขายได้ | 250,000 |
| 2 - 4 | ล้มละลายกลาง | ล.11195/2553 | 32644 | ที่ดินว่างเปล่า | 24,000 | ขายได้ | 27,000 |
| 8 - 1 | ล้มละลายกลาง | ล.4351/2567 | 16196 | ที่ดินพร้อมสิ่งปลูกสร้าง | 2,700,672 | ขายได้ | 2,960,000 |
| 13 - 1 | ล้มละลายกลาง | ล.2011/2566 | 27649 | ที่ดินพร้อมสิ่งปลูกสร้าง | 3,318,874 | งดขายไม่มีผู้สู้ราคา | 0 |

(Plaintiff column omitted here.) **Cross-check succeeded:** row 13-1 (case ล.2011/2566, deed 27649, appraisal 3,318,874) matches the announcement record from §3.3 and the round-7 status "งดขายไม่มีผู้สู้ราคา" on the detail page.

The results report has **no tambon/amphoe/province and no area** — location must come from joining back to the announcement record (case no. + lot + deed no.).

### History depth probe (same office, `024`)

| saledate | data rows |
|---|---|
| 20/04/2569 | 27 |
| 09/03/2569 | 24 |
| 15/01/2569 | none |
| 12/11/2568 | none |
| 13/08/2568 | none |

Consistent with the stated ~6-month window, **but not conclusive** — the empty dates may simply not have been sale dates for that office.

---

## 5. Source D — Images

`https://asset.led.go.th/PPKPicture/งานล้ม/2568/12-2558/26/27649m.jpg` → `200 image/jpeg` (32 KB); `…27649j.jpg` → 853 KB. Paths derive from the `Z:\` fields by replacing the drive prefix. Scanned sketches/photos only; no georeference.

---

## 6. Not tested / out of scope

- `https://live.led.go.th/` — live-stream of auctions.
- LED e-auction / bidder registration (`qcivil.led.go.th` login, "ลงทะเบียนเข้าสู้ราคา") — **requires login; not accessed**.
- LED mobile apps (`https://www.led.go.th/apps/android.asp`, `/ios.asp`) — may use their own backend API; **not inspected** (would require app traffic analysis, out of scope for "normal public access").
- `https://ledwebsite.led.go.th/ledweb/led/web/system/WEB1I010Action.do` — linked from footer; not investigated.
- Third-party aggregators (e.g. `assets-led.com`) exist and appear to republish LED data. Not official; not evaluated.
- DOL LandsMaps (`landsmaps.dol.go.th`) — separate source; needs its own investigation.

---

## 7. Access restrictions & terms observed

| Item | Finding |
|---|---|
| Authentication | None for search/listing/detail/report/open data. Login only for bidding. |
| Verification code | Main criteria search (`default.asp`) requires a "รหัสยืนยัน". Other search paths (by date/office, by case number, results report) did not. |
| Rate limits | None observed at our low volume. No `Retry-After`/429. Unknown thresholds. |
| robots.txt | `Allow: /` on both hosts. |
| Website copyright notice | Data is "สมบัติของกรมบังคับคดี"; use / reproduction / modification **without permission is prohibited**. |
| Open data license | CC BY-NC (non-commercial) for all LED datasets checked. |
| PDPA | LED website policy cites PDPA §4(5) exemption for LED's *own* enforcement processing; that exemption does **not** automatically extend to third parties re-processing names of debtors/owners. |
| Retention | Announcements removed after final round; results kept ~6 months. |

---

## 8. Open questions for follow-up

1. Meaning of `assetprice1`, `assetprice2`, `assetprice6`–`9`, and `issale` code `10`.
2. Is there an official bulk export / MOU / paid data service from LED (contact: `itsupport@led.mail.go.th`, ศูนย์บริการข้อมูลข่าวสาร)?
3. Exact history window of `/report/report.asp` (test with a known sale date >6 months ago per office).
4. Whether `provinces`/`get_amphur` codes equal DOPA/DOL administrative codes.
5. Whether `auc_asset_gen` is stable across re-announcements (re-seizure / re-listing).
6. Whether commercial use of LED data is permitted under any agreement (legal review).
