# NSO Household Socio-Economic Survey — income (`SFD_SPB0802_66`)

Source-activation dossier for `nso-ses-SFD_SPB0802_66`, assessed against the ten gate items in
[`docs/implementation-plan.md`](../implementation-plan.md) §4 and
[`docs/data-architecture.md`](../data-architecture.md) §8.

Evidence below was verified live on **2026-09-16** (Asia/Bangkok) unless stated otherwise. This is a
**dated evidence record**, not a standing permission: if the publication changes, the record is
re-checked before the source keeps running.

## Summary

| | |
|---|---|
| Owner | สำนักงานสถิติแห่งชาติ (National Statistical Office) |
| Product | `SFD_SPB0802_66` — รายได้เฉลี่ยต่อเดือนของครัวเรือน |
| Catalogue | `https://data.go.th/dataset/os_08_00007` (package `os_08_00007`) |
| Endpoint | `https://catalogapi.nso.go.th/api/index?table=SFD_SPB0802_66&format=json` |
| Licence | Creative Commons Attributions (`license_title` on the package record) |
| Coverage | 77 provinces; **province level only**; publication years พ.ศ. 2566 and 2568 |
| Measure | `household_income_monthly_mean` — mean monthly household income, บาทต่อเดือน, by socio-economic class |
| Approved role | province-level **demand context only** |

## Gate

- owner_and_locator_verified: data.go.th package `os_08_00007` names สำนักงานสถิติแห่งชาติ as organization with maintainer กลุ่มสถิติรายได้รายจ่าย กองสถิติสังคม (esesnso@nso.go.th); the operator-configured endpoint on catalogapi.nso.go.th returned HTTP 200 on 2026-09-16.
- access_authorized_and_reproducible: no key or account required; `accessible_condition` on the package record is "ไม่มีการจำกัดการเข้าถึงข้อมูล"; the endpoint sits behind a WAF that rejects some generic tool User-Agents (curl's default gets HTTP 418, re-confirmed 2026-09-16), while the adapter's identifying `reis-academic/0.1 (Thailand HBU university project)` is accepted; two independent fetches on 2026-09-16 returned byte-identical payloads (sha256 c621b818e87b4bf1…, 9,779,240 bytes).
- field_semantics_units_time_verified: keys are year/province/source_income1-3/soc_eco_class1-2/value/unit/attribute/source; `year` is Buddhist-era and is converted to CE at ingestion with a range guard; `unit` is read from the row and never assumed; grand-total rows are the ones marked รายได้ทั้งสิ้นต่อเดือน at all three source_income levels; the pair of soc_eco_class fields defines the cohort each figure describes; `attribute` carries the survey footnote (e.g. a sampled zero) and is kept verbatim.
- coverage_and_resolution_documented: 15,400 rows, of which 1,540 are grand-total rows covering all 77 provinces for exactly two publication years (พ.ศ. 2566 and 2568); the table has no district or subdistrict breakdown, and the province names match reference.administrative_area exactly (77/77, verified by name comparison on 2026-09-16).
- licence_permits_acquire_store_transform_display: the package record declares Creative Commons Attributions, which permits acquisition, storage, transformation and display subject to attribution; attribution is stored on the source product and rendered with every figure, and the rights flags may_acquire/may_store/may_transform/may_display are recorded per action and re-checked at read time.
- privacy_minimization_reviewed: the publication contains only aggregate survey statistics by province and socio-economic class; there are no individuals, households, addresses or identifiers in it, so there is no personal data to minimise; nothing from a user's intake is ever sent to the source.
- update_revision_behavior_handled: the source publishes annually; re-ingestion compares the published figure against the standing one and, when it differs, appends a new observation version superseding the old rather than overwriting it; a re-run over an unchanged publication was verified to write no new versions (1,540 unchanged).
- adapter_fixtures_pass: 27 tests pass in `packages/source-adapters` — 12 covering this parser (grand-total selection, cohort requirement, Buddhist-era conversion and its rejection cases, unit and value validation, footnote retention, no-record outcomes) and 15 covering the shared HTTP layer's outcome and retry classification.
- operational_limits_configured: bulk acquisition runs off the interactive path in tools/ingestion/ with a 180s timeout, a 32MB response ceiling and a streaming bounded reader; failures are classified as retryable or not and surface to the operator instead of retrying blindly; an analysis run never calls this source, it reads the ingested corpus.
- analytical_fitness_approved: approved only as province-level demand context, expressed in the link policy as purpose_fitness CONTEXT_ONLY, role CONTEXTUAL and decision_impact CONTEXT with a recorded substitution reason; it must never become a subdistrict income figure, a buyer's purchasing power, a property value input, or an all-households provincial average.

## Limits recorded against the product

`must_not_become_th` stored on the source product, and shown with every figure:

> ห้ามใช้แทนรายได้ของครัวเรือนในตำบลหรืออำเภอใดโดยเฉพาะ ห้ามใช้เป็นกำลังซื้อของผู้ซื้อทรัพย์สิน
> และห้ามนำค่าของแต่ละกลุ่มมาเฉลี่ยรวมเป็นค่าเฉลี่ยทั้งจังหวัด

The third clause is the one this table specifically invites someone to break: it publishes ten
socio-economic classes and **no all-households total**, so an "average household income for the
province" can only be manufactured, never read. See
[`docs/adr/0002-no-fabricated-provincial-averages.md`](../adr/0002-no-fabricated-provincial-averages.md).

## Known limitations

- Province granularity only. For a subdistrict target this is always evidence about a containing
  area, and the link records it as such.
- Sample survey, not a census. Figures carry sampling error the publication does not quantify per
  cell; footnoted zeros mean "the sample measured zero", not "the value is zero".
- Only two publication years are exposed by this table, so trend reasoning over it would rest on two
  points and is not attempted.

## Review status

Academic review under RD-4. `ACADEMIC_REVIEWED` is a lifecycle state — it is **not** a professional
or statistical certification of the data, and must never be described as one.

The decision itself lives in `source.activation_record`, not in this file: run
`pnpm source:activate --list` to see the state actually in force.
