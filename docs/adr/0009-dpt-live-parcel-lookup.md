# ADR 0009 — Parcel lookup for 57 more provinces, live from DPT

- **Status:** Accepted
- **Date:** 2026-10-07
- **Approved by:** อรณภา and สุรัตนาพร (project owners), who chose this from a list of candidate
  features and asked for "ค้นแปลงที่ดินได้ 55 จังหวัด (จากเดิม 1 จังหวัด)"

## Context

`docs/adr/0007` built the lookup the owners had asked for most often: type a ระวาง and a เลขที่ดิน,
get the parcel's place, size and a pin. It covers **one province**. The Land Department publishes
the shapefiles openly for five, and one province's parcels fill about a third of the free Supabase
tier, so four were loaded and dropped again. A reader in เชียงใหม่ holding a real deed typed correct
numbers and was told their province is not covered.

`docs/adr/0008` had meanwhile connected กรมโยธาธิการและผังเมือง's ArcGIS for the city plan. While
reading those services for the zoning work, the parcel outlines turned out to be sitting in the same
`PLLU<code>` MapServer as a layer named `PARCEL<code>` — the same cadastre, republished by a second
department, queryable one parcel at a time.

## Decision

Answer the lookup from the database where we hold the parcels, and **live from DPT** where we do
not. Store nothing from the live path.

Order matters and is not about speed. Where DOL publishes the parcel openly we hold their own row,
with the area and the centre they computed and the reference ids already joined; DPT republishes the
same cadastre, so asking DPT for a parcel we already hold would swap a first-hand figure for a
second-hand one. A ระวาง addresses one place in the country, so the two paths can never disagree
about different land.

## What the services turned out to contain

Read before deciding, across all 87 possible province codes on 2026-10-07:

- **62 provinces publish a `PARCEL<code>` layer.** The other 15 publish none at all — including
  กรุงเทพมหานคร, ชลบุรี and, as it happens, ปทุมธานี, the one province we already hold.
- **Five of those 62** (ร้อยเอ็ด, นครพนม, อุตรดิตถ์, แพร่, พิจิตร) carry the polygons without `UTMMAP`
  columns. A ระวาง cannot address them, so they are left out rather than offered and then failing
  every lookup. **57 provinces are searchable**, 58 counting the stored one.
- Layer counts range from 6,564 parcels (ระนอง) to 626,507 (อุดรธานี).
- **The services do not agree on a schema**, and three differences each produce a failure that
  looks like "no such parcel":
  - the parcel layer is numbered **0** in ภูเก็ต and **26** in พิษณุโลก;
  - นครนายก spells the column **`land_no`**, everyone else **`LAND_NO`**;
  - ปัตตานี stores เลขที่ดิน as an **integer**, and a quoted integer returns HTTP 200 with
    "Failed to execute query" rather than an empty result.
- `อำเภอ` is spelled **`APM_NME`** in DPT's own schema — not `AMP_NME`. Asking for the spelling that
  reads correctly returns HTTP 400.
- Four provinces publish **no name columns at all** (ยโสธร, อุดรธานี, พัทลุง, ปัตตานี), and two
  (นครราชสีมา, เชียงใหม่) fill every row with the import placeholders
  `"เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน"` and `"ไม่มีจังหวัด"`.
- ปัตตานี publishes no `AREA`.
- `resultRecordCount` is rejected: "Pagination is not supported".
- One ระวาง and one เลขที่ดิน can match **more than one polygon** — เชียงใหม่ returned two for a
  single key.

## Consequences

- **The schema is read, not assumed.** `describeParcelLayer` finds the layer and reports how each
  column is stored and quoted; the profile is cached at the edge for a month, because it is
  published metadata about a province, identical for every reader, carrying nothing about anybody's
  land. Cold costs three requests, warm one.
- **The lookup itself is never cached.** It is keyed by a reader's own ระวาง and เลขที่ดิน, and those
  do not belong in a cache that outlives the request.
- **The database does not grow.** No migration, no ingestion, no rows.
- **The reader picks the province first.** The data is held per province and there are 57 services;
  choosing is also what lets the screen say "nobody publishes this province" instead of letting an
  empty result imply the deed number is wrong.
- **Placeholders are dropped, not displayed.** A ตำบล of
  "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน" printed under ที่ตั้ง reads as an answer. Where the
  layer publishes no province either, the province is named from the reference table — it is the one
  whose service answered — and the two narrower levels stay empty.
- **Several matches are reported, not hidden.** Showing the first of three polygons as the holding
  would under-report the area silently.
- **A pin outside Thailand is refused.** A ring in an unexpected spatial reference lands in the Gulf
  of Guinea, and offering that pin is worse than offering none.
- **Four states stay distinct on screen**: this province is not published · the number is not in a
  province that is · the service did not answer (retryable) · found.
- **Nothing becomes evidence.** Like zoning in `docs/adr/0008`, a located parcel is intake help with
  a citation: it fills the area, the size and the pin, all of which the reader confirms. It is not an
  Observation, it carries no epistemic status into the pipeline, and it is still not a statement
  about ownership or about which parcel the reader is standing on.

## What this still is not

Not a deed-number search. `LAND_NO` is เลขที่ดิน; เลขที่โฉนด is a different number and is in neither
source. Not ownership. Not the parcel drawn — the outline is fetched to compute a centre and then
discarded. And not nationwide: `docs/data-sources/dpt-parcel.md` records which provinces answer and
which do not, and LandsMaps remains the route out for the rest.
