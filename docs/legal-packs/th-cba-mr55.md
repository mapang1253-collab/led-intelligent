# Legal pack — กฎกระทรวง ฉบับที่ 55 (พ.ศ. 2543): ที่ว่าง แนวอาคารและระยะร่น

Review dossier for pack `th.cba.mr55` v1.1.0
(`database/reviewed-packs/th-cba-mr55-v1.json`), assessed against
[`docs/validation-architecture.md`](../validation-architecture.md) §4 and §9.

Clause text transcribed **2026-09-16** from the consolidated text published by
สมาคมสถาปนิกสยาม ในพระราชูปถัมภ์ (ASA) at
`https://download.asa.or.th/03media/04law/cba/mr/mr43-55r-bm.pdf`.

## Why this instrument first

It is the rare piece of Thai development control that is genuinely nationwide and uniform: one
ministerial regulation under พ.ร.บ.ควบคุมอาคาร พ.ศ. 2522, applying in every area where that Act is in
force, with no per-province variation to curate. Comprehensive plans (ผังเมืองรวม) and local
ordinances vary by locality and are **not** in this pack.

## What is encoded

15 rules across three families:

| Family | Rules | Clauses |
|---|---|---|
| `DEVELOPMENT_INTENSITY` | 3 | ข้อ 33 (1), ข้อ 33 (2), ข้อ 44 วรรคหนึ่ง |
| `SETBACK_ACCESS` | 9 | ข้อ 34 วรรคสอง, ข้อ 36, ข้อ 37, ข้อ 40, ข้อ 41 วรรคหนึ่ง และวรรคสอง (1)–(3) |
| `ENVIRONMENTAL_OVERLAY` | 3 | ข้อ 42 วรรคหนึ่ง และวรรคสอง |

`declared_critical_families` is `DEVELOPMENT_INTENSITY` and `SETBACK_ACCESS`. The engine therefore
cannot return PASS unless both are actually screened — see §3 of the validation architecture.

ข้อ 40 (building over public land) is encoded as `APPROVAL_REQUIRED`: it is a permission to obtain,
never a test that has been passed.

## Evidence basis and its weakness

The ASA text is a **professional-association consolidation**, not the Royal Gazette original. It was
chosen after checking the alternatives:

- The DPT link for this instrument returned an HTML error page, not a PDF.
- A widely-circulated HTML copy (ryt9) is OCR-damaged — it prints "พระราชบัญญัติควบคุมอาหาร" for
  "ควบคุมอาคาร", "วัสดุทนไป" for "ทนไฟ", and cites มาตรา 49 where the ASA text has มาตรา 29 — and it
  stops at ข้อ 40, roughly four-fifths of the way through.
- The other ASA variants embed subsetted CID fonts with no ToUnicode map and no `cmap` table, so
  their text cannot be extracted at all.

The chosen file extracts cleanly and reads coherently across all 50 clauses. **It has not been
checked against the Royal Gazette original.** Reviewers should weigh that before accepting the pack.

Amendments referenced in the consolidated text: กฎกระทรวง ฉบับที่ 58 (พ.ศ. 2546) and ฉบับที่ 61
(พ.ศ. 2550). Whether later amendments exist has **not** been established.

## Effective-date handling

Every rule carries `effective_from` 2000-08-07 and no repeal date. The engine refuses to apply a rule
outside its effective window, and a screen is always run against an explicit date.

## Boundary cases tested

The ranges of ข้อ 41 วรรคสอง are the part most easily mis-encoded, so they are tested at every
boundary: at 5, 9.99, 10, 20, 20.01 and 30 metres of road width, **exactly one** band applies. The
bands neither overlap nor leave a gap. ข้อ 33 is tested to confirm that the 30 % residential rule and
the 10 % non-residential rule never both fire on one building type.

## Limitations

- **Scope.** Only ที่ว่าง, แนวอาคาร and ระยะร่น from this one regulation. No zoning, no land-use
  permission, no FAR/OSR, no local ordinance, no fire/structural/accessibility code, no EIA.
  A PASS from this pack means only that these clauses were satisfied.
- **Inputs are design facts, not site facts.** Open space, floor plate, building height and setbacks
  describe a building that does not exist yet. Until a design states them the honest answer is
  UNKNOWN, and the engine returns exactly that with the missing facts named.
- **Road and water-body dimensions are not held by this system.** They must be measured or obtained
  from the local authority; no evidence source currently supplies them.
- ~~**ข้อ 41 วรรคสอง applicability is encoded by building type only.**~~ **Closed in v1.1.0.** The
  clause reaches a building either by its type or by its size, and both limbs are now encoded: over
  two storeys, or over 8 metres, or one of the listed types. Because a concept states no height, the
  rule now reports UNRESOLVED for an unlisted type rather than dropping out — the requirement stays
  in play until someone states the height.
- **Not professional advice.** `ACADEMIC_REVIEWED` is a lifecycle state. Confirmation of any real
  project's compliance rests with the competent local authority and a licensed practitioner.

## Version history

- **1.1.0** (2026-09-16) — encoded the size limb of ข้อ 41 วรรคสอง (over two storeys or over 8 m),
  which v1.0.0 omitted. Editing the rules invalidated the v1.0.0 signature, as designed; the pack
  needs signing again before it executes.
- **1.0.0** (2026-09-16) — first encoding, 15 rules.

## Review status

Unreviewed as shipped: `lifecycle_state` is `DRAFT` and `review` is `null`, so the pack does not
execute. Recording a review binds it to a SHA-256 of the rules, and any later edit to a threshold or
a clause invalidates the record automatically.

```bash
pnpm pack:review --pack database/reviewed-packs/th-cba-mr55-v1.json --check
```
