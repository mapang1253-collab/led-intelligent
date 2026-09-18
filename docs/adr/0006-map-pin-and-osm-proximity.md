# ADR 0006 — A user-placed map pin, and OSM proximity as context

- **Status:** Accepted
- **Date:** 2026-09-18
- **Approved by:** อรณภา and สุรัตนาพร (project owners), in session, on being shown why a
  distance cannot be computed from a subdistrict name
- **Supersedes:** the "no surroundings evidence" conclusion of
  [ADR 0004](0004-no-property-imagery-or-surroundings.md), on the condition ADR 0004 itself set

## Context

The owners asked for distances to nearby features — "ห่างจากถนน 300 เมตร, ห่างจากโรงเรียน
500 เมตร". ADR 0004 had already refused this, and refused it on a fact rather than on effort:
the system holds no location for a target beyond its subdistrict name, so there is nothing to
measure from. Three plots in one tambon sit at three different distances from the same road.

ADR 0004 did not close the question. It named the dependency chain exactly:

> Point-level analysis stays blocked pending a location for the target: a user-confirmed map
> pin, DOL cadastral data, or an authoritative Thai geocoder. A map pin needs the interactive
> map the frozen stack excludes, so this is a genuine dependency chain, not an oversight.

Of the three, DOL cadastral data remains unavailable (no public API; LandsMaps sits behind bot
protection, and working around that is neither permitted nor attempted). No authoritative Thai
geocoder is open to us. The remaining route is the map pin, and the frozen stack excluded it
only because no owner had decided otherwise. One now has.

## Decision

Add an interactive map on which the reader places a pin for their land, and compute distances
from that pin. Three OpenStreetMap services are brought into the stack, all ODbL, all
attributed on screen:

| Use | Service | Why this one |
|---|---|---|
| Map tiles | OSM standard raster tiles, via Leaflet | Raster needs no vector pipeline; Leaflet is small and does one job |
| Initial map centre | Nominatim, one lookup per area | Saves the reader panning across Thailand |
| Distances | Overpass API | The only open query interface for arbitrary OSM features |

**Proximity is context, not evidence.** It does not enter the analysis pipeline, is not an
`Observation`, produces no `EvidenceLink`, and cannot change a validation status, an output
scope or a final status. It is displayed in its own panel, labelled as OpenStreetMap-derived
context. This is why no evidence-source activation gate
(`docs/implementation-plan.md` §4) is triggered: the gates govern sources that feed analysis.
Should a later increment let a distance inform a rule, a demand method or a component, the gate
applies in full at that point, and this ADR does not pre-authorise it.

**The pin is `USER_ASSERTED`,** exactly like road width. The reader states where their land is;
the system does not verify it and must never present the pin as a confirmed parcel location. It
therefore does not raise the output scope: `permitted_scope` stays `AREA` until property-level
*evidence* exists, and a pin is an assertion, not evidence.

## Verified before deciding, on 2026-09-18

ADR 0004's findings were re-probed rather than assumed, because two of them had changed:

- **Nominatim resolves districts reliably, subdistricts unreliably.** `อำเภอเมืองชลบุรี`
  returned its administrative area; `ตำบลลำปางหลวง` did too, but `ตำบลแสนสุข` returned a
  health centre rather than the tambon. This matches `docs/data-sources/osm.md` recording
  tambon coverage at roughly 12%. Centring therefore searches subdistrict → district → province
  and *prefers* an administrative match, but accepts an ordinary place match rather than give up:
  `อำเภอเมืองชลบุรี ชลบุรี` returns the town of ชลบุรี as `class=place`, which is exactly where a
  reader wants the map to open. Requiring a boundary returned nothing for Chon Buri at all.
  Centring is a convenience throughout: a wrong centre costs the reader a pan, never a wrong
  answer, because every distance is measured from the pin the reader places.
- **Overpass answered.** ADR 0004 recorded repeated HTTP 504s under light use. A query around
  13.2828932, 100.9367915 returned 40 elements and yielded ถนนสุขุมวิท at 134 m and
  Lan Le Saksa School at 152 m. The unreliability is real and unfixed, so the design treats a
  failed lookup as a first-class outcome: the panel says the lookup failed and offers a retry.
  A run never fails because of it, and no distance is ever estimated, cached stale, or inferred.
- **`geothai` still carries no coordinates** — codes, names and postal codes only. This is why
  Nominatim is needed for centring at all.

## Consequences

- `propertyIntakeSchema` gains optional `latitude`/`longitude`. Omitting them is not an error
  and changes nothing about the analysis, in keeping with every other optional intake field.
- Distances are computed from way geometry (`out geom`), not from a way's centroid. A road's
  centroid can sit hundreds of metres from its nearest point, and a number that looks precise
  and is not is worse than no number.
- Straight-line distance only, and labelled as such. It is not travel distance, and the screen
  says so: a school 150 m away across a motorway is not 150 m away on foot.
- Usage policies are respected rather than tested. Nominatim results are cached per area so one
  subdistrict is asked about once; both services receive an identifying User-Agent; no bulk
  download is performed; tiles are fetched by the reader's own browser at reading pace.
- OSM attribution appears wherever OSM data appears, as ODbL requires.

## What was rejected

Placing the pin automatically from the subdistrict name. It would centre the map in the right
tambon and produce distances that look like answers about the reader's land while describing an
arbitrary point in it — the precise failure ADR 0004 refused, and no less wrong for being
automatic.

Storing the pin beyond the run. It is location data about a person's property; it lives and
expires with the run's 24 hours like every other intake field, and reaches no third party
except as the coordinates in an Overpass query.
