# DOPA registered population — `stat.bora.dopa.go.th`

Source-activation dossier for `dopa-registered-population`, assessed against the ten gate items in
[`docs/implementation-plan.md`](../implementation-plan.md) §4 and
[`docs/data-architecture.md`](../data-architecture.md) §8.

Evidence verified live on **2026-09-16** (Asia/Bangkok). Dated evidence record, not a standing
permission.

## Summary

| | |
|---|---|
| Owner | กรมการปกครอง (Department of Provincial Administration), Ministry of Interior |
| Product | สถิติจำนวนประชากรตามทะเบียนราษฎร — annual December snapshot, one text file per province |
| Index | `https://stat.bora.dopa.go.th/new_stat/webPage/statByProvince.php?year=68` |
| File pattern | `/new_stat/file/6812/6812cc{NN}.txt` — Buddhist-era YYMM, then a zero-padded province code |
| Licence | Creative Commons Attributions, as declared by กรมการปกครอง for the same dataset on data.go.th (`statbyyear`) — see the limitation below |
| Coverage | 77 provinces, 2,462 local-authority blocks, 7,287 distinct subdistrict names; December พ.ศ. 2568 |
| Measures | `registered_population` — persons, cohorts รวมทั้งสิ้น / ชาย / หญิง |
| Approved role | demand scale, at province level (OBSERVED) and subdistrict level (DERIVED) |

## The structural trap this source sets

An `อำเภอ` row is **not** the district's population. It is the district's *non-municipal remainder*;
municipalities (`เทศบาลตำบล/เมือง/นคร`, `เมืองพัทยา`) are separate sibling blocks. In Chon Buri the
`อำเภอเมืองชลบุรี` row reads 47,686 against a district population several times that.

Consequently a subdistrict can appear in several blocks — once per local authority covering part of
it — and **1,418 of 7,287 subdistricts nationwide are split this way**. Its population is the sum of
its rows. Reading a single row as the subdistrict total would understate one subdistrict in five.

Both facts are re-verified arithmetically on every parse, not trusted: across all 77 files, 2,462 of
2,462 blocks reconcile with their children and every province's subdistrict rows sum exactly to its
published total (national total 65,809,011). A file that stops reconciling is refused, not ingested.

## Gate

- owner_and_locator_verified: the files are published by กรมการปกครอง on its own registration-statistics site (stat.bora.dopa.go.th); the year index at statByProvince.php?year=68 links to exactly the 77 provincial files this adapter reads, each returning HTTP 200 on 2026-09-16.
- access_authorized_and_reproducible: public pages and files, no key, no account, no access control bypassed; all 77 files were retrieved at ≤1 request/second and re-parsed identically, and the adapter sends an identifying User-Agent.
- field_semantics_units_time_verified: rows are pipe-delimited with a name and 220 numeric columns, of which only the last three — male, female, total persons — are read; the province row's male+female=total identity holds in all 77 files; an อำเภอ/เขต row is the non-municipal remainder and เทศบาล*/เมืองพัทยา rows are sibling local authorities, with ตำบล/แขวง children summing to their block header in 2,462 of 2,462 blocks; the file code 6812 is Buddhist-era YYMM for December พ.ศ. 2568, confirmed by the site's own year index linking to 6912 files that do not exist yet because that December has not occurred.
- coverage_and_resolution_documented: 77 provinces at province and subdistrict resolution; 7,149 subdistricts resolve unambiguously to the reference table, 135 are ambiguous by name within their province and are skipped, and 3 published names have no reference counterpart; district-level population is deliberately not derived, because the published district row does not mean it.
- licence_permits_acquire_store_transform_display: กรมการปกครอง declares Creative Commons Attributions for this dataset on data.go.th (package `statbyyear`, organization กรมการปกครอง), which permits acquisition, storage, transformation and display with attribution; attribution is stored on the product and rendered with every figure. See the limitation below before accepting this item.
- privacy_minimization_reviewed: the files contain only aggregate counts per area and sex; no individuals, addresses, house numbers or identifiers appear in them, and nothing from a user's intake is ever sent to the source.
- update_revision_behavior_handled: an annual December snapshot per year, with monthly files published separately; re-ingestion compares each figure against the standing one and appends a superseding version only when it changes — a re-run over the same snapshot was verified to write nothing but provenance (21,678 unchanged).
- adapter_fixtures_pass: 12 parser tests cover the block structure, the split-subdistrict sum, Bangkok's เขต/แขวง naming, whitespace normalisation, and refusal on every way the arithmetic can fail; the adapter additionally parsed all 77 live files with zero failures.
- operational_limits_configured: bulk acquisition runs off the interactive path with a 60s per-file timeout, the shared 32MB response ceiling and ≤1 request/second pacing; failures classify as retryable or not and stop the run rather than writing a partial corpus, since all writes share one transaction.
- analytical_fitness_approved: approved as demand-scale context only — province figures as OBSERVED, subdistrict figures as DERIVED sums over the published partition; it must never become the number of people present in an area, a count of households, or an input to purchasing power.

## Limits recorded against the product

`must_not_become_th`, shown with every figure:

> เป็นจำนวนผู้มีชื่อในทะเบียนบ้านเท่านั้น ห้ามใช้แทนจำนวนคนที่อาศัยอยู่จริงหรือกำลังซื้อในพื้นที่
> พื้นที่ท่องเที่ยวและอุตสาหกรรมมักมีประชากรแฝงที่ไม่ถูกนับ และห้ามใช้ตัวเลขระดับตำบลแทนจำนวนครัวเรือน

This matters most in exactly the places this project cares about: Pattaya, Si Racha and Laem Chabang
carry large unregistered populations, so a registered count understates demand there specifically.

## Known limitations

- **Licence is inferred across sites.** The CC-BY declaration is attached to กรมการปกครอง's dataset on
  data.go.th; the statistics site we acquire from states no licence of its own. The publisher is the
  same and the content is the same statistics, but this is an inference, not a licence notice on the
  file. Reviewers should accept or reject gate item 5 with that in mind.
- **Subdistrict figures are DERIVED**, not published. They are exact sums over a partition the parser
  verifies, but the source printed the parts, not the total, and every disclosure says so.
- **135 subdistricts get no observation** because their name occurs in more than one district of the
  same province and the published row identifies a local authority, not a district. They are named in
  the ingestion log rather than guessed at.
- **3 published names have no reference counterpart**: `นครราชสีมา/ธงชัยเหนือ` (the reference table
  spells it `ธงชัยหนือ`, which appears to be a typo in the reference data rather than in DOPA),
  `ร้อยเอ็ด/ปอภาร (ปอพาน)` (the reference carries only `ปอภาร`), and `ประจวบคีรีขันธ์/--`, a
  placeholder row in the published file. None is fuzzy-matched.
- **Age columns are not ingested.** The 216 body columns do not reconcile with the male/female totals
  and their layout is undocumented, so their meaning is unverified and they cannot pass gate item 3.
- **District-level population is not available** from this file, by the structure described above.

## Review status

Academic review under RD-4. `ACADEMIC_REVIEWED` is a lifecycle state — not a professional or
statistical certification of the data, and never to be described as one.

The decision in force lives in `source.activation_record`: run `pnpm source:activate --list`.
