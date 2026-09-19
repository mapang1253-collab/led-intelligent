# ADR 0007 — Parcel lookup from the Land Department's open shapefiles

- **Status:** Accepted
- **Date:** 2026-09-19
- **Approved by:** อรณภา and สุรัตนาพร (project owners), on being shown that the data exists

## Context

"ใส่เลขที่ดิน ดูเลขโฉนด เลขระวาง และวิเคราะห์เชิงลึก" is the thing the owners asked for more times
than anything else in this project, and the answer each time was that it could not be done. That
answer rested on `docs/adr/0004`, which recorded that no parcel data was reachable.

It was wrong, and finding out how wrong took one query against data.go.th. The Land Department
publishes parcel shapefiles for five provinces under the **DGA Open Government License**, no
permission required. `docs/data-sources/dol-parcel.md` records the search; this ADR records
building on it.

## What the data turned out to contain

Downloaded and opened before deciding, not assumed:

- The files published as `.shp` inside each dataset zip are **RAR archives with the wrong
  extension**. `bsdtar` reads them.
- Each holds a real shapefile set, and the `.dbf` carries **`LAND_NO` (เลขที่ดิน)** and
  **`UTMMAP1`–`UTMMAP4` (ระวาง)**, with `AREA`, `ORIGIN_X`/`ORIGIN_Y` and the
  province/อำเภอ/ตำบล names.
- `ORIGIN_X`/`ORIGIN_Y` are **UTM zone 47N**, not degrees, so PostGIS transforms them on the way
  in rather than arithmetic doing it here.
- Thai text is **TIS-620**, not UTF-8. Decoding it as UTF-8 produces ตำบล names that still parse
  and are silently wrong, which a migration would then carry forever.
- The source repeats a `(ระวาง, เลขที่ดิน)` pair within a single file, so the ingest deduplicates
  per batch. Pathum Thani: 751,355 rows read, 742,338 distinct parcels stored.

## Decision

Ingest parcel **identity** — ระวาง, เลขที่ดิน, area, centre point, administrative names — into
`reference.land_parcel`, and offer a lookup on the intake form. A hit fills the land area and
offers to place the map pin.

**Polygons are not stored.** One land office expands to half a gigabyte, five provinces would not
fit the database this project runs on, and nothing on screen draws a parcel outline. DOL already
publishes a centre point, which is what a lookup needs, at sixteen bytes instead of a polygon.

**Coverage is a table, not an inference.** `reference.land_parcel_coverage` lists the five
provinces, and the API returns it beside every miss. Without that, a reader in ชลบุรี typing a
correct deed number would be told their parcel was not found, when the truth is that this product
holds nothing for their province. Telling someone their deed is wrong is the precise failure this
system exists to avoid.

**A hit locates a parcel; it does not identify the reader's.** Ownership is not in this data at
all. The screen says so under every result, the area it fills stays an editable intake field, and
the pin stays a suggestion the reader confirms — so `permitted_scope` is untouched and stays
`AREA` until property-level *evidence* exists. A parcel record is reference data about a parcel,
not evidence that this reader's land is that parcel.

**Still not a deed-number search.** `LAND_NO` is เลขที่ดิน. เลขที่โฉนด is a different number,
printed beside it on the same document, and is only reachable through the permissioned API in
`docs/data-sources/dol-parcel.md`. The form labels the field เลขที่ดิน and says which is which,
because the two are confused constantly.

## Why no activation gate

`docs/implementation-plan.md` §4 gates sources that feed the analysis. This one does not: it
produces no `Observation`, no `EvidenceLink`, and cannot move a validation status, an output scope
or a final status. It fills two intake fields the reader can edit and overwrite. The day a parcel
area is allowed to *be* evidence rather than to prefill an assertion, the gate applies in full and
this ADR does not pre-authorise it.

## Consequences

- Five provinces of seventy-seven, and only ปทุมธานี ingested so far (742,338 parcels). The other
  four are one command each: `pnpm ingest:dol-parcels <province>`.
- Ingest is offline, like every other source here, because it needs a filesystem and an archive
  tool a Worker has neither of.
- ADR 0004's "no parcel data is reachable" is superseded for these five provinces. Its reasoning
  about LED, commercial portals and the LandsMaps site is untouched and still holds.
