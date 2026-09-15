# Data Source: Legal Execution Department (LED / กรมบังคับคดี)

> **Authority note:** dated source research only. Any systematic adapter activation and current architecture are governed by docs/data-architecture.md and docs/implementation-plan.md. This university project remains Thailand-wide; regional examples are fixtures only.

- **Owner:** กรมบังคับคดี กระทรวงยุติธรรม (Legal Execution Department, Ministry of Justice)
- **Last researched:** 2026-09-14
- **Status:** Research only — this file does not activate an integration; current source roles and activation gates are defined by the active architecture documents.
- **Evidence & raw findings:** [`research/led/api-investigation.md`](../../research/led/api-investigation.md)

> Labels used below: **[Verified]** = observed directly on 2026-09-14. **[Documented]** = stated by LED in metadata or on its pages. **[Assumption]** / **[Uncertain]** = not confirmed.
>
> Historical context: at the time of the original investigation, the other source and architecture files were empty. They are populated now. Integration notes below remain dated assumptions and cannot override the active architecture documents.

---

## 1. What LED provides

LED enforces civil and bankruptcy judgments. Seized property — including land, land with buildings, condominium units, buildings and leasehold rights — is sold by **public auction (ขายทอดตลาด)**. LED publishes:

1. **Auction announcements (per property)** — what is being sold, where, appraisal prices, auction round dates, status. [Verified]
2. **Auction results (per sale item)** — sold / no bidder / suspended, and the **realized sale price or highest bid**. [Verified]
3. **Open-data statistics** — monthly national counts and values of auction announcements and assets exiting enforcement, by asset type. [Verified]

## 2. Public accessibility

| Channel | Public? | Format | Official API? |
|---|---|---|---|
| Open data (`opendata.led.go.th`, mirrored on `data.go.th`) | Yes, no key | CSV + CKAN JSON API | **Yes — documented** (CKAN v3) |
| Auction search `asset.led.go.th/newbidreg/` | Yes, no login | HTML | **No** — public web forms only |
| Auction results `asset.led.go.th/report/` | Yes, no login | HTML | **No** — public web forms only |
| Bidding / e-auction registration | Login required | — | Not accessed |

**There is no documented per-property API.** All per-property data is obtained from HTML pages of a classic ASP web application. [Verified]

## 3. Official URLs

- Main site: https://www.led.go.th/
- Auction search: https://asset.led.go.th/newbidreg/
- Auction results report: https://asset.led.go.th/report/
- Auction live stream: https://live.led.go.th/
- LED open-data portal: https://opendata.led.go.th/ (CKAN API: `/api/3/action/...`)
- Government open-data catalog: https://data.go.th/ (organization `led`, id `14005000`)
- Website policy: https://www.led.go.th/th/policy/website.asp

## 4. Auction property data & fields

Per sale item, the announcement record contains [Verified]:

| Group | Fields |
|---|---|
| Case | court, red case number + BE year, plaintiff, defendant, LED office, responsible officers |
| Sale item | lot–sub-item number (`13 - 1`), asset type code/name, encumbrance status (ปลอดการจำนอง / ปลอดภาระผูกพัน …), occupant label, remarks |
| Title | title-document type (โฉนดเลขที่ …, free text), **deed number(s)** |
| Location | house number, tambon, amphoe, province of property; tambon/amphoe/province **as on the deed** |
| Size | rai / ngan / square wa (condo: m² in the same field [Uncertain]) |
| Price | enforcement officer appraisal; LED appraisal officer price; price set by the pricing committee; expert appraisal (often "ไม่มี"); bidder deposit |
| Schedule | up to 8 auction round dates, per-round status (pending / sold / no bidder / …), sale venue & time, date posted to web |
| Media | property photo, sketch map, plaintiff's map (JPEG) |

Auction results record [Verified]: lot, court, red case number, deed number(s), plaintiff, asset type, appraisal price, result (ขายได้ / งดขายไม่มีผู้สู้ราคา / …), **sale price or highest bid**.

## 5. Property identifiers & matchability

| Identifier | Present | Quality | Useful for matching to |
|---|---|---|---|
| Deed number (`deedno`) | Yes, for land/condo | Free text; may contain several numbers, ranges, "(เดิม …)"; `-` for buildings-only | DOL parcels, Treasury appraisal (by parcel) [Assumption] |
| Deed tambon/amphoe/province | Yes | Thai names, inconsistent prefixes ("ตำบล…" vs bare), some obsolete names (กิ่งอำเภอ…) | Admin boundaries; needed to make deed no. unique |
| Red case no. + year + court | Yes | Good | Linking LED announcement ↔ LED results ↔ re-listings |
| Lot–sub-item | Yes | Good within a case | Same as above |
| `auc_asset_gen` (internal ID) | Only for some offices; empty for bankruptcy divisions sampled | Unreliable | Not suitable as a primary key |
| Coordinates | **No** | — | — |
| Postcode | Only as a search parameter, not in records | — | — |

**A deed number is not globally unique.** It is unique only within a land office jurisdiction, so it must be combined with at least province + amphoe (and ideally tambon). [Assumption — standard DOL practice; not verified against DOL in this research]

## 6. Location information

- Province / amphoe / tambon: **yes** (property address and deed location). [Verified]
- House/address number: sometimes (`33/11`, `4/1 ม.7`, or `-`). [Verified]
- Land/deed number: yes for land and condos. Parcel (ระวาง/เลขที่ดิน/หน้าสำรวจ) numbers: **not observed** in structured fields. [Verified]
- Coordinates: **none**. Map buttons open scanned JPEGs; "ดูแผนที่จากกรมที่ดิน" only opens the LandsMaps homepage without parcel parameters. [Verified]

## 7. Historical data

- Announcements are **removed after the final auction round**. [Documented on detail page]
- Results report covers **~6 months back**. [Documented; probe consistent but not conclusive]
- Open-data statistics: monthly from FY 2565/2566 to present, **aggregate only**. [Verified]
- ⇒ A per-property history longer than ~6 months would exist only if **we** retain snapshots over time. [Inference]

## 8. Update frequency

- Announcements: posted roughly two months before round 1 (e.g. posted 20-02-2569, first round 20/04/2569); auction rounds typically ~3 weeks apart; per-round status updated after each sale day. [Verified from samples]
- Results report: per sale date. [Verified]
- Open data: monthly (`update_frequency_unit: เดือน`). [Documented]

## 9. Geographic coverage

Nationwide: all provinces via provincial/branch LED offices, plus Bangkok civil (แพ่งกรุงเทพมหานคร 1–7) and bankruptcy divisions (ล้มละลาย 1–6, etc.). Bangkok divisions sell property located anywhere in the country (e.g. ล้มละลาย 5 sells land in Lampang and Chiang Mai). **Selling office ≠ property location.** [Verified]

## 10. Access restrictions, rate limits, terms

- No authentication for public search, detail, results, or open data. [Verified]
- The main multi-criteria search requires a displayed verification code (anti-automation). Search by date/office, by case number, and the results report did not. [Verified] We did not automate the verification code and recommend not doing so.
- No rate limits observed at low volume; thresholds unknown. [Verified / Uncertain]
- `robots.txt`: `Allow: /`. [Verified]
- **Website footer: data is LED property; use, reproduction, or modification without permission is prohibited and subject to legal action.** [Verified]
- **Open data license: Creative Commons Attribution Non-Commercial.** [Documented]
- Records contain **personal data** (names of defendants, owners, plaintiffs who are individuals, officers). LED's own processing is PDPA-exempt under §4(5); re-processing by us is not automatically covered. [Documented / legal interpretation needed]

## 11. Data quality & completeness

| Issue | Example |
|---|---|
| Free-text deed field | `20686,80392-80398`, `27200 (เดิม 68748)`, `-` |
| Inconsistent admin naming | `ตำบลแม่เล่ย์` vs `หนองจอก`; `อำเภอกิ่งอำเภอแม่วงก์` (obsolete) |
| Missing IDs | `auc_asset_gen` empty for bankruptcy divisions |
| Area ambiguity | buildings with 0-0-0; condo m² stored in "wa" field |
| Multiple price definitions | 4 appraisal lines; starting price derived by rule (committee → LED appraiser → enforcement officer) |
| Sold items lose detail | detail page hides prices once sold |
| Unknown codes | status `10`; `assetprice1/2/6–9` |
| Buddhist-era dates | `25690420`, `20/04/2569` |
| Open data numeric issues | `1.15067E+11` (precision lost), trailing empty columns |
| Appraisal ≠ market value | sold 250,000 vs appraisal 25,000; sold 27,000 vs appraisal 24,000 |
| HTML-only | no schema, no versioning; layout can change without notice |

## 12. Integration with other planned sources

| Source | Possible join | Confidence |
|---|---|---|
| **Treasury (กรมธนารักษ์)** appraised land/condo prices | Deed no. + tambon + amphoe + province → Treasury per-parcel/per-unit assessed price; or fall back to tambon/amphoe-level price zones | [Assumption] — depends on what Treasury actually exposes (not yet documented in this repo) |
| **OSM** | No coordinates in LED. Only via (a) geocoding tambon/amphoe/province to admin-boundary centroid/polygon, (b) geocoding house address (low success expected), or (c) obtaining a parcel coordinate from another source (e.g. DOL) | Admin-level join: [Assumption — likely feasible]; point-level: [Uncertain] |
| **REIC** | Admin area (province/amphoe) and asset type for market context | [Assumption] |
| **DOL LandsMaps** (not planned yet) | Deed no. + location → parcel geometry/coordinates | [Assumption — requires separate research and terms check] |
| **LED open data** | National/monthly trend context only | [Verified] |

> **Correction note (2026-09-15):** The Treasury row above was written while Treasury documentation was empty in this repo and is an assumption. Live verification shows the Treasury land-valuation files are keyed by **map sheet (`UTMMAP1–4`, `UTMSCALE`) + land number (`LAND_NO`)**, with **no deed number and no tambon/amphoe/province names**. LED records carry deed numbers and admin names but not map sheet or land number, so **no direct LED → Treasury join exists** with verified fields; it would need map sheet + land number from another source (e.g., the deed copy). No tambon/amphoe-level Treasury "price zones" were found in the land-valuation dataset. See [`docs/data-sources/treasury.md`](treasury.md) and [`research/data-requirements-source-investigation/00-treasury-verification.md`](../../research/data-requirements-source-investigation/00-treasury-verification.md). The original row is kept for traceability.

## 13. LED data as evidence

| Dimension | What LED can support | Caveats |
|---|---|---|
| **Valuation** | Official appraisal prices (3–4 kinds); **realized auction prices** and "no bidder" outcomes; price vs. appraisal ratios; starting-price discounts across rounds | Forced-sale context; appraisal methodology differs from Treasury & market; results only ~6 months |
| **Location** | Province / amphoe / tambon; deed location; sometimes house number | No coordinates; admin names need normalization |
| **Business potential** | Asset type (land, land+building, condo, commercial leasehold `006`, state-property leasehold `013`); land size; encumbrance status; occupancy label | No zoning, frontage, road access, or building use info |
| **Investment analysis** | Deal-flow (what is available now, entry price, deposit, auction dates); liquidity signal (rounds without bidders); legal-risk flags (sold subject to mortgage, occupant, leasehold) | Buyers bear condition/title risk ("ผู้ซื้อได้ทราบถึงสภาพทรัพย์นั้น"); legal due diligence still required |

## 14. Possible matching hierarchy (options, not a decision)

From most to least precise. Which levels to use, and confidence thresholds, are **architectural decisions still open**.

1. **Deed number + deed tambon + deed amphoe + deed province** (+ title-document type) — parcel-level. Requires deed-string normalization and splitting multi-deed items.
2. **Condo:** unit/title number + building/project name [Uncertain — project name not seen in structured fields] + tambon/amphoe/province.
3. **House number + tambon + amphoe + province** — address-level; weak (many `-`, village-style `ม.7` numbers).
4. **Tambon + amphoe + province** — admin-area level (reliable with name normalization).
5. **Amphoe + province**.
6. **Province** — always available.

Internal LED linking (announcement ↔ result ↔ re-listing): **court + red case no./year + lot–sub-item + deed no.** [Verified on one example]

## 15. Limitations & risks

1. **Legal/licensing:** website prohibits reuse without permission; open data is non-commercial. Any production use likely needs LED permission or legal review.
2. **Personal data** embedded in records (PDPA exposure if stored/displayed).
3. **No official API** for per-property data; HTML parsing is brittle and undocumented.
4. **Anti-automation control** on the main search; other paths may be restricted in future.
5. **Short retention** (announcements vanish after last round; results ~6 months).
6. **No coordinates**; spatial joins with OSM are coarse unless another geocoding source is added.
7. **Deed numbers not globally unique** and stored as free text.
8. **Auction prices are forced-sale prices** — biased as market-value evidence.
9. **Selection bias:** LED inventory skews toward distressed/NPL property and certain locations.
10. Undocumented codes and price fields; semantics may change.
11. Heavy scraping could burden a government system; rate limits unknown.

---

## Recommended role in the system (for discussion)

LED is best positioned as a **deal-flow and distressed-price evidence source**: it tells the system *which properties are purchasable at auction now*, at *what official appraisal and starting prices*, and — via results — *what similar properties actually fetched*. It is **not** a good primary source for market value, spatial context, or long-run history. Treasury (official assessed values), OSM (spatial/amenity context) and REIC (market indices) would be complementary. [Recommendation, not a decision]

## Open questions requiring a human decision

1. Is the project **commercial**? (Determines whether CC BY-NC and the website notice block use.) Should we request permission / a data agreement from LED?
2. Is HTML extraction from public LED pages acceptable to the project, or only documented APIs/open data?
3. Will the system **store personal names** from LED records, or drop them at ingestion?
4. Should the system **retain snapshots** to build history beyond LED's ~6-month window?
5. Which **matching levels** (§14) are acceptable for valuation evidence vs. location context, and what confidence rules apply?
6. Which LED price should represent "LED valuation" (committee / LED appraiser / enforcement officer / realized price)?
7. Is a parcel-geometry source (e.g. DOL LandsMaps) in scope, given LED has no coordinates?
8. Which asset types are in scope (include leasehold rights? condos? buildings-only)?
