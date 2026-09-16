# กรมธนารักษ์ — ราคาประเมินสิ่งปลูกสร้าง

Source-activation dossier for `treasury-building-valuation`, assessed against the ten gate items in
[`docs/implementation-plan.md`](../implementation-plan.md) §4.

Evidence verified live on **2026-09-16** (Asia/Bangkok).

## Summary

| | |
|---|---|
| Owner | กรมธนารักษ์ กระทรวงการคลัง |
| Product | ราคาประเมินสิ่งปลูกสร้าง — `construct_all_20240805.csv` |
| Catalogue | `https://data.go.th/dataset/building-valuation` |
| Licence | Open Data Common; `accessible_condition` = ไม่มีการจำกัดการเข้าถึงข้อมูล |
| Coverage | 77 provinces × 69 building types = 5,313 rows, province level only |
| Measure | `assessed_construction_value_per_sqm` — บาทต่อตารางเมตร, `official_assessment` |
| Approved role | a comparative reference point only |

## What this figure is, and is not

It is the value the state assesses for taxation under พ.ร.บ.ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562.

It is **not** a market price and **not** what a building costs to build. Both are typically well
above it. A number denominated in baht per square metre invites exactly the reading it cannot
support, so the caveat is attached to every observation and repeated on the product record, and it
appears on screen beside each figure.

## Gate

- owner_and_locator_verified: the data.go.th package record names กรมธนารักษ์ as organization and links a single CSV resource on the department's own catalogue at catalog.treasury.go.th; the file returned HTTP 200 and 519,788 bytes on 2026-09-16.
- access_authorized_and_reproducible: no key or account; `accessible_condition` is "ไม่มีการจำกัดการเข้าถึงข้อมูล"; the resource URL is fixed in the published dataset and is never taken from user input.
- field_semantics_units_time_verified: columns are ID_CONSTR, NAME_CONSTR, CHANGWAT_CODE, CHANGWAT_NAME, PRICE_CONSTR; the price is baht per square metre of the named building type in the named province; the file name carries the publication date 2024-08-05, recorded as the vintage; all 5,313 prices parse as numbers with no blanks and no zeroes.
- coverage_and_resolution_documented: exactly 77 provinces and 69 building types with no gaps; province level only, with no district or subdistrict breakdown; all 77 province codes matched reference.administrative_area on the DOPA code, verified by code rather than by name.
- licence_permits_acquire_store_transform_display: Open Data Common on the national open-data portal, permitting acquisition, storage, transformation and display; attribution is stored on the product and rendered with every figure.
- privacy_minimization_reviewed: the file contains only administrative codes, building-type names and prices; no individuals, parcels, addresses or identifiers appear in it, and nothing from a user's intake reaches the source.
- update_revision_behavior_handled: published annually against a four-year assessment cycle; re-ingestion compares each price to the standing one and appends a superseding version only when it changes.
- adapter_fixtures_pass: 9 parser tests, including the quoted-comma case below and refusal on column drift, an unusable province code, a non-numeric price and a missing building type.
- operational_limits_configured: one CSV of roughly half a megabyte fetched off the interactive path with a 120s timeout under the shared 32MB ceiling; failures classify as retryable or not and stop the ingest rather than writing a partial corpus.
- analytical_fitness_approved: approved as a comparative reference point only, recorded as `official_assessment`, never as `appraisal` and never as a market figure.

## The parsing trap

154 rows name a building type containing a comma — `ตลาด พื้นที่ไม่เกิน 1,000 ตารางเมตร`. Split
naively on commas, every later column shifts one place: the province code receives part of a
building name and the price lands outside the row. A first pass at matching provinces found "78
provinces", the extra one being a fragment of a building name. The adapter parses quoted fields
properly and a test pins that exact row.

## Limitations

- **Province granularity only.** The same building type carries one price for a whole province.
- **Assessment, not market.** See above; this is the limitation that matters most.
- **No mapping to the concept vocabulary.** The Treasury's 69 types are far more granular than the
  ten building types กฎกระทรวง 55 names, and a substring match is wrong — "อาคารอยู่อาศัย" matches
  "อาคารอยู่อาศัยรวม", which is a different building. The published table is presented as it stands
  rather than mapped by an unreviewed rule.
- **Vintage is 2024-08-05.** A newer assessment cycle would need re-ingestion; the system does not
  detect publication of a new file on its own.

## Review status

Academic review under RD-4. `ACADEMIC_REVIEWED` is a lifecycle state, not a professional valuation
certification, and must never be described as one.

Run `pnpm source:activate --list` for the state in force.
