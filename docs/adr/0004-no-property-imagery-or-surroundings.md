# ADR 0004 — No property imagery, and no surroundings evidence, in this increment

- **Status:** Accepted
- **Date:** 2026-09-16
- **Context:** owner asked for a screen showing properties in the selected area, with photographs

## Decision

The application shows no property listings, no property photographs and no
surroundings ("what is near this site") evidence. The reasons differ per source and are
recorded below, because each closes a different door.

## Why not property listings with photographs

**LED (กรมบังคับคดี)** is the only Thai government source researched that publishes
per-property records with photographs: property photo, sketch map and plaintiff's map,
alongside address to subdistrict, size in rai/ngan/wa, appraisal prices and the realized
sale price. Three independent blocks stop it, any one of which is sufficient:

1. **Rights.** The site footer states the data is LED property and that use, reproduction
   or modification without permission is prohibited and subject to legal action. That
   fails gate item 5 in `docs/implementation-plan.md` §4 outright. Its CC-BY-NC open data
   is monthly national aggregates only — no per-property records and no photographs.
2. **Personal data.** Auction records name defendants, owners and plaintiffs. LED's own
   processing is exempt under PDPA §4(5); our re-processing is not automatically covered.
   That fails gate item 6.
3. **Anti-automation.** The multi-criteria search requires a displayed verification code.
   This project does not bypass access controls, and `docs/data-sources/led.md` already
   recommended against automating it.

Commercial portals (DDproperty, Baania and similar) reserve their listings and imagery,
so they fail the same rights gate. **There is no free, lawful source of Thai property
listings with photographs.** This is a rights conclusion, not a scheduling one.

## Why not OSM surroundings evidence

Probed live on 2026-09-16 and rejected on a factual finding, not on effort:

- OSM carries Thai administrative boundaries at **province (admin_level 4)** and
  **district (admin_level 6)**. A direct query for `ตำบลบางปลาสร้อย` at admin_level 8
  returned nothing, while `อำเภอเมืองชลบุรี` and `จังหวัดชลบุรี` both resolved.
  **Subdistrict boundaries are not available.**
- The reference data in use (`geothai`) carries codes, names and postal codes — **no
  coordinates**. The system therefore holds no location for a target beyond its
  subdistrict name.
- The public Overpass endpoint returned repeated HTTP 504s under light use, consistent
  with `docs/data-sources/osm.md`, which records the Geofabrik Thailand extract as the
  only appropriate basis for systematic use.

Together these mean a "within 500 m of the site" figure **cannot be computed**: there is
no site location to measure from. What could be computed is a district-level count, and
Mueang Chon Buri district has roughly two hundred thousand residents — a figure at that
scale says almost nothing about one subdistrict, and would join the household-income data
as further context-only evidence rather than answering anything new.

## Consequences

- The result screen stays text and figures. `docs/technology-stack.md` already fixes that
  the first release has no interactive map; this ADR records that the data to justify one
  does not exist either.
- Point-level analysis stays blocked pending a location for the target: a user-confirmed
  map pin, DOL cadastral data, or an authoritative Thai geocoder — as
  `docs/data-sources/osm.md` §10 already set out. A map pin needs the interactive map the
  frozen stack excludes, so this is a genuine dependency chain, not an oversight.
- Satellite imagery (Sentinel-2, Copernicus open licence) remains open: it is free,
  nationwide, needs no permission, and can be framed by the district boundary OSM does
  provide. It was not built in this increment; it shows the land, not the buildings, and
  carries no analytical weight on its own.

## What was rejected

Shipping district-level surroundings counts labelled as if they described the target
subdistrict. The counts would be real and the label would be true, but the screen would
imply a locality the evidence does not describe — the failure mode this whole system is
built to avoid.
