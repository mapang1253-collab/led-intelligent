# Data Source: กรมที่ดิน — parcel shapes and the deed-number lookup

> **Authority note:** dated source research only. It activates nothing. Activation is governed by
> `docs/implementation-plan.md` §4 and the active architecture documents.

- **Maintainer:** กรมที่ดิน (Department of Lands, DOL)
- **Researched:** 2026-09-19, live against the data.go.th CKAN API
- **Status:** Research only. No route below is activated, and one of them cannot be.

## Why this file exists

Every parcel-level limitation this product reports traces to one fact: it cannot turn a deed
number into a location, a shape, or an area. `docs/adr/0004` recorded that as settled and
`docs/adr/0006` reaffirmed it. Both said, in as many words, that the Land Department publishes no
public API.

That was wrong, and the app repeated it to users. An API exists. It is gated behind permission
this project has not requested, which is a different limitation with a different remedy.

## Route 1 — the LandsMaps API (`mapland-parcel`)

Nationwide, and the only route that answers "what is at this deed number".

DOL's own published access procedure, quoted from the dataset record:

> 1. ทำหนังสือขออนุญาตใช้ข้อมูล
> 2. พัฒนา Application ในการเรียกใช้ข้อมูล
> 3. ยืนยันตัวตน (Verify Identify) ด้วย Consumer-Key และ Consumer Secret ซึ่งเป็นชุดรหัสที่กรมที่ดินออกให้
> 4. สามารถดึงข้อมูลได้ 100,000 requests/วัน/หน่วยงาน

- **Licence:** "License not specified" — so terms of use come with the permission, not from the
  catalogue, and must be read before anything is built on it.
- **Quota:** 100,000 requests per day per organisation, which is far beyond anything this product
  would need.
- **Blocker:** the written request. A university project can make one; it takes weeks, not days.

## Route 2 — downloadable parcel shapes (`landparcel-*`)

Open, immediate, and narrow. **CC-BY**, downloadable now, no permission required — and five
provinces out of seventy-seven:

| Dataset | Province |
|---|---|
| `landparcel-nonthaburi` | นนทบุรี |
| `landparcel-pathumthani` | ปทุมธานี |
| `landparcel-samutprakan` | สมุทรปราการ |
| `landparcel-samutsongkhram` | สมุทรสงคราม |
| `landparcel-samutsakhon` | สมุทรสาคร |

Published per land office as ZIP/RAR. Contents were not opened during this research, so the
attribute schema — whether a deed number is carried alongside the geometry — is **unverified** and
must be checked before any estimate is given.

Partial coverage is not by itself disqualifying: this architecture already carries evidence with a
geographic scope and already says where it holds nothing. A five-province source would mean
parcel-level answers in five provinces and the present behaviour everywhere else. What it must
never become is a reason to narrow the product to those provinces, which
`docs/adr/0001` settles and CLAUDE.md restates.

## Route 3 — reading the LandsMaps site directly

Not available, and not a scheduling matter. `https://landsmaps.dol.go.th/` sits behind Imperva bot
protection — verified 2026-09-18, which returned an Incapsula challenge page rather than the
application. This project does not work around bot protection, exactly as it does not work around
LED's verification code (`docs/adr/0004`). Linking a reader to the site so they can look their own
parcel up is unaffected and is what the intake form does.

## What follows from this

- The user-facing copy was corrected on 2026-09-19. It now says permission has not been requested,
  rather than that no API exists.
- Neither route is activated. Route 1 needs a permission this project does not hold; Route 2 needs
  its schema verified, an adapter, a PostGIS ingest and the acceptance gate in
  `docs/implementation-plan.md` §4.
- The honest summary for a reader of this project is that parcel-level analysis is reachable and
  the path is known and written down here, not that it is impossible.
