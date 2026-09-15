# Treasury API Investigation: Chon Buri Valuation to Parcel Geometry

> **HISTORICAL SOURCE RESEARCH.** Chon Buri is the research fixture in this file, not the product boundary. Current nationwide scope, source roles and activation rules are governed by [`docs/project-overview.md`](../../docs/project-overview.md), [`docs/data-architecture.md`](../../docs/data-architecture.md) and [`docs/implementation-plan.md`](../../docs/implementation-plan.md).
>
> **Provenance of this file (added 2026-09-15):** Sections 1–7 below are the original Treasury research, imported **unchanged in substance** from a prior research workspace. The handoff copy is self-contained and does not depend on that external workspace. Section 8 records the live re-verification of 2026-09-15; full evidence is in [`research/data-requirements-source-investigation/00-treasury-verification.md`](../data-requirements-source-investigation/00-treasury-verification.md).

**Research status:** Verified pathway; not yet an implementation contract

## 1. Question

How can a Chon Buri Treasury CKAN land-valuation record be connected to Treasury parcel geometry and represented as WGS84 latitude/longitude without guessing a location from identifiers?

## 2. Verified findings (original research)

1. The Chon Buri Treasury CKAN valuation data contains the following identifiers and value: `UTMMAP1`, `UTMMAP2`, `UTMMAP3`, `UTMMAP4`, `UTMSCALE`, `LAND_NO`, and `EVAPRICE`.
2. A public DS_TRANSIT endpoint provides the investigated access path to parcel data.
3. `GIS5_Q_PARCEL` is the relevant parcel-data element in that path and provides `SHAPE` geometry.
4. Parcel lookup must account for `RAWANG`; otherwise similarly represented map/parcel values can be ambiguous.
5. Geometry is associated with SRID 24047 or 24048, as applicable to the result. It is not yet WGS84 latitude/longitude.
6. Reprojection from the returned SRID to WGS84 is the required coordinate-conversion step before producing latitude/longitude.
7. The resulting candidate must be validated against the CKAN `EVAPRICE`; successful retrieval of geometry alone is insufficient evidence of a correct match.
8. The known direct ArcGIS `MapServer` endpoint is token-gated. It should not be called as the application integration route and no bypass should be attempted.

## 3. Reproducible investigation sequence

The exact request URLs, parameter names, and test records should be retained from the verified investigator run before implementation. This document intentionally does not fabricate them.

```text
1. Select a Chon Buri CKAN record with all available map identifiers, LAND_NO, and EVAPRICE.
2. Query the public DS_TRANSIT pathway for the corresponding parcel candidates.
3. Use RAWANG and the source identifiers to eliminate ambiguous candidates.
4. Confirm a GIS5_Q_PARCEL result contains SHAPE and inspect the declared SRID.
5. Reproject the geometry from SRID 24047 or 24048 to WGS84.
6. Validate returned parcel/value information against the CKAN record's EVAPRICE.
7. Record request parameters, response metadata, transformation, match reasoning, and timestamps.
```

## 4. Non-findings and rejected approaches

| Approach | Outcome / reason |
| --- | --- |
| Derive coordinates from `LAND_NO` or `UTMMAP*` | Rejected. No verified evidence that these identifiers are coordinates. |
| Use direct Treasury ArcGIS `MapServer` | Rejected for integration. It is token-gated. |
| Bypass authentication or reuse private session material | Prohibited. |
| Treat any geometry response as exact match | Rejected. RAWANG disambiguation and EVAPRICE validation are required. |

## 5. Operational concerns discovered

- The integration must paginate responses and behave safely under rate limits.
- Cache validated responses; this reduces source load and makes repeat analysis reproducible.
- Cache policy, rate-limit values, retry/backoff rules, availability expectations, and refresh frequency were not established by this historical investigation and remain subject to the current source-activation gate.
- Preserve the source coordinate reference and explicit reprojection evidence. Do not store only a derived latitude/longitude without lineage.

## 6. Evidence classification

| Claim | Classification |
| --- | --- |
| CKAN Chon Buri valuation fields listed above | Verified |
| DS_TRANSIT + GIS5_Q_PARCEL provides the public geometry pathway | Verified |
| RAWANG is required for disambiguation | Verified |
| SRID 24047/24048 then WGS84 reprojection | Verified |
| EVAPRICE comparison validates the candidate | Verified design validation step |
| Production endpoint contract and operating limits | Pending research |
| Automated ingestion design | Not established in this historical research; governed by the current technical design and source-activation gate |

## 7. Next research actions (original)

1. Capture the authoritative DS_TRANSIT endpoint contract, representative sanitized request/response, pagination behavior, and documented access limits.
2. Record a successful Chon Buri end-to-end example with its matching rationale and coordinate-validation checks.
3. Confirm licensing, attribution, update cadence, and acceptable-use requirements.
4. Define mismatch and no-match outcomes for the future evidence layer.

---

## 8. Re-verification — 2026-09-15

| Original claim | Re-verification result |
| --- | --- |
| §2.1 CKAN valuation fields | **Confirmed live.** `land-valuation` dataset, Open Data Common, 4-yearly; **77 provincial CSVs (national)**; Chon Buri 984,881 rows. No deed number, admin names, area or coordinates in the file. data.go.th datastore API strips leading zeros from identifiers |
| §2.2 "public DS_TRANSIT endpoint" | **Qualified.** Web-app JavaScript shows DS_TRANSIT requests carry a session `CSRF_TOKEN` and `guestId`; no published API or terms found. Not called. Treated as **not an approved path** under project rules pending Treasury confirmation |
| §2.3 `GIS5_Q_PARCEL` | Query name present in the web-app code [code inspection]; not called |
| §2.4 `RAWANG` | Field present in web-app result handling [code inspection]; disambiguation role not re-tested |
| §2.5–2.6 SRID/reprojection | Not re-tested. Note: a GISTDA-hosted EEC parcel raster layer also declares SRID 24047 |
| §2.8 token-gated MapServer | Consistent with observations (`npvc.treasury.go.th/arcgis/rest/services/...` referenced in code); not called |
| §3 exact URLs not retained | Land-valuation CSV and datastore URLs now recorded in the verification file; DS_TRANSIT request contract still not captured |
| New | `building-valuation` dataset: assessed building value per m² by 69 types × province (Open Data Common) |
