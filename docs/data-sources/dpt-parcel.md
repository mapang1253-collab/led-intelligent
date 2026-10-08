# กรมโยธาธิการและผังเมือง — parcel outlines (`PARCEL<code>`)

**Status: in use for intake help only, never as evidence.** Read this with
[`../adr/0009-dpt-live-parcel-lookup.md`](../adr/0009-dpt-live-parcel-lookup.md), which is the
decision; this file is the dated record of what was read and when.

**Checked:** 2026-10-07, every one of the 77 province codes, from this machine and from the
deployed Worker.

## What it is

The same service that carries the city plan (`docs/data-sources/dpt-zoning.md`) also carries a
cadastral layer named `PARCEL<code>`, inside
`https://dptgis.dpt.go.th/arcgis/rest/services/dds2/PLLU<code>/MapServer`. It is a republished copy
of the Land Department's parcel polygons: `UTMMAP1`–`UTMMAP4` (ระวาง), `LAND_NO` (เลขที่ดิน),
`AREA`, and usually the จังหวัด/อำเภอ/ตำบล names.

Queried one parcel at a time with `where` — no bulk download, and nothing of a reader's stored. The
product sends one `MapServer` request to find the layer and one to read its columns, then one query
per lookup. The first two are kept per province, at the edge and in `reference.dpt_parcel_layer`,
so every lookup after the first in a province costs one request.

**Latency depends on which Cloudflare colo answers, by a lot.** Measured 2026-10-08: about 0.6
seconds per request from a colo near Bangkok, over seven seconds from Singapore. That is why the
per-request ceiling is twelve seconds and why the layer metadata is kept in the database rather
than only at the per-colo edge cache — three slow requests do not fit in a wait anyone will sit
through, and one does.

## Access

Open ArcGIS REST, no key, no registration, no stated rate limit. The same publisher and the same
service family as the zoning lookup already in use, so this adds no new host to the operator's
allow-list. Attribution is shown on screen: “ค้นสดจากชั้นข้อมูลรูปแปลงที่ดิน กรมโยธาธิการและผังเมือง
(DDS Explorer)”.

No licence is published alongside the service. The product therefore treats it the way it treats the
zoning layer: displayed with its citation and a link to the publisher, never ingested, never
redistributed, never turned into an Observation.

## Coverage, as read on 2026-10-07

**57 provinces answer a ระวาง lookup.** Layer ids differ per province and are discovered, not
assumed — the ids below are what was observed, recorded so a future change is visible as a change.

| จังหวัด | code | layer | parcels | note |
|---|---|---|---|---|
| ลพบุรี | `16` | 14 | 14,470 | — |
| สิงห์บุรี | `17` | 4 | 15,405 | — |
| ชัยนาท | `18` | 10 | 31,454 | — |
| สระบุรี | `19` | 10 | 45,184 | — |
| จันทบุรี | `22` | 6 | 84,323 | — |
| ตราด | `23` | 4 | 8,184 | — |
| ฉะเชิงเทรา | `24` | 0 | 10,788 | — |
| ปราจีนบุรี | `25` | 4 | 45,628 | — |
| นครนายก | `26` | 2 | 23,010 | — |
| สระแก้ว | `27` | 6 | 13,149 | — |
| นครราชสีมา | `30` | 8 | 139,396 | names are import placeholders |
| บุรีรัมย์ | `31` | 0 | 76,080 | — |
| สุรินทร์ | `32` | 0 | 157,069 | — |
| ศรีสะเกษ | `33` | 2 | 41,384 | — |
| อุบลราชธานี | `34` | 2 | 97,463 | — |
| ยโสธร | `35` | 0 | 140,892 | no จังหวัด/อำเภอ/ตำบล columns |
| ชัยภูมิ | `36` | 10 | 55,872 | — |
| บึงกาฬ | `38` | 0 | 30,344 | column spelled `land_no` |
| หนองบัวลำภู | `39` | 2 | 39,101 | — |
| ขอนแก่น | `40` | 4 | 85,706 | — |
| อุดรธานี | `41` | 4 | 626,507 | no จังหวัด/อำเภอ/ตำบล columns |
| เลย | `42` | 2 | 20,025 | — |
| หนองคาย | `43` | 2 | 8,225 | — |
| มหาสารคาม | `44` | 6 | 168,835 | — |
| กาฬสินธุ์ | `46` | 2 | 489,306 | — |
| สกลนคร | `47` | 2 | 56,444 | — |
| เชียงใหม่ | `50` | 8 | 18,022 | names are import placeholders |
| ลำพูน | `51` | 10 | 150,822 | — |
| ลำปาง | `52` | 6 | 208,160 | — |
| น่าน | `55` | 10 | 103,214 | — |
| พะเยา | `56` | 22 | 131,093 | — |
| เชียงราย | `57` | 8 | 272,661 | — |
| อุทัยธานี | `61` | 12 | 15,112 | — |
| กำแพงเพชร | `62` | 14 | 37,283 | — |
| ตาก | `63` | 2 | 69,522 | — |
| สุโขทัย | `64` | 12 | 44,673 | — |
| พิษณุโลก | `65` | 26 | 13,950 | — |
| เพชรบูรณ์ | `67` | 2 | 125,322 | — |
| กาญจนบุรี | `71` | 8 | 69,492 | — |
| สุพรรณบุรี | `72` | 8 | 80,014 | — |
| นครปฐม | `73` | 8 | 75,844 | — |
| เพชรบุรี | `76` | 6 | 38,495 | — |
| ประจวบคีรีขันธ์ | `77` | 20 | 133,762 | — |
| นครศรีธรรมราช | `80` | 8 | 252,078 | — |
| กระบี่ | `81` | 4 | 139,511 | — |
| พังงา | `82` | 10 | 46,979 | — |
| ภูเก็ต | `83` | 0 | 219,732 | — |
| สุราษฎร์ธานี | `84` | 10 | 166,132 | — |
| ระนอง | `85` | 2 | 6,564 | — |
| ชุมพร | `86` | 6 | 111,316 | — |
| สงขลา | `90` | 8 | 266,741 | — |
| สตูล | `91` | 6 | 39,880 | — |
| ตรัง | `92` | 8 | 42,164 | — |
| พัทลุง | `93` | 0 | 505,271 | no จังหวัด/อำเภอ/ตำบล columns |
| ปัตตานี | `94` | 4 | 487,203 | no จังหวัด/อำเภอ/ตำบล columns (`PROV_NAME`/`APDOL_NAME`/`TBDOL_NAME` hold other values), `LAND_NO` is an integer, no `AREA` |
| ยะลา | `95` | 4 | 19,937 | — |
| นราธิวาส | `96` | 6 | 128,380 | — |

**5 provinces publish parcels with no `UTMMAP` columns**, so a ระวาง cannot address them and they
are not offered: ร้อยเอ็ด · นครพนม · อุตรดิตถ์ · แพร่ · พิจิตร.

**15 provinces publish no parcel layer at all**: กรุงเทพมหานคร · สมุทรปราการ · นนทบุรี · ปทุมธานี · พระนครศรีอยุธยา · อ่างทอง · ชลบุรี · ระยอง · อำนาจเจริญ · มุกดาหาร · แม่ฮ่องสอน · นครสวรรค์ · ราชบุรี · สมุทรสาคร · สมุทรสงคราม.

ปทุมธานี is in that last group and is the one province the database already holds in full, from the
Land Department's own open shapefiles (`dol-parcel.md`). The two sources do not overlap anywhere.

## Traps, each found by hitting it

- **`APM_NME`, not `AMP_NME`.** DPT's schema spells อำเภอ that way. The spelling that reads
  correctly returns HTTP 400 "Failed to execute query".
- **`LAND_NO` is an integer in ปัตตานี.** A quoted integer returns HTTP 200 with the same
  "Failed to execute query", which is indistinguishable from a real failure unless the column type
  is read first.
- **`land_no` is lower case in นครนายก.**
- **Layer numbering is not stable across provinces** — 0 in ภูเก็ต, 26 in พิษณุโลก.
- **`resultRecordCount` is rejected**: "Pagination is not supported".
- **Import placeholders are stored as names.** นครราชสีมา and เชียงใหม่ fill every row's ตำบล
  with "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน" and จังหวัด with "ไม่มีจังหวัด". The adapter drops both.
- **Blank `LAND_NO` rows exist** — roads, water and reserved strips sit in the same layer. A query
  for a blank number matches hundreds of them, which is why the product refuses anything that is not
  digits before it builds a query at all.
- **One key can match several polygons.** เชียงใหม่ returned two for one ระวาง and เลขที่ดิน.

## What this is not

Not เลขที่โฉนด — that number is in neither this layer nor DOL's open data. Not ownership, which is
in neither either. Not a drawing of the parcel: the outline is fetched to compute a centre and then
discarded. And not an activation of anything — per `docs/implementation-plan.md` §4, nothing here
feeds the analysis, and no gate has been passed.
