# ADR 0010 — What the reader intends to build decides which rules reach them, never whether a rule is met

- **Status:** Accepted
- **Date:** 2026-10-09
- **Approved by:** อรณภา and สุรัตนาพร (project owners). Asked to choose between letting
  reader-stated figures settle legal outcomes and leaving the screen as it is, they answered
  "เอาตามที่คุณแนะนำ เราไม่รู้ว่าจะตัดสินใจยังไงดี" — so the recommendation below is the decision,
  and it was chosen to be the option that cannot overclaim.

## Context

The external review of 2026-09-17 named this the most important problem in the product: nearly
every legal outcome is `UNKNOWN`, and a reader gets nothing they can act on.

The cause is a mismatch of questions. `th.cba.mr55` is a pack of **building** rules — it asks how
far a building stands from the road centreline, how much open space it leaves, how tall it is. The
product is handed a **plot of land with no building on it**, so those facts do not exist, and the
validator correctly reports that it cannot tell. It is behaving exactly as
`docs/validation-architecture.md` requires; it is simply being asked a question the input cannot
answer.

The review proposed, as its first and smallest step, passing the plot's area into the validator.
**We checked the pack before implementing it, and it would have changed nothing.** No rule in
`th.cba.mr55` takes a land area as an input. The two clauses about open space are ratios whose
denominator is `largest_floor_plate_area` — a measurement off an architectural drawing, not the
size of the plot:

| Clause | Predicate | Denominator |
|---|---|---|
| mr55.c33.1 | `open_space_area / largest_floor_plate_area ≥ 0.30` | the building |
| mr55.c33.2 | `open_space_area / largest_floor_plate_area ≥ 0.10` | the building |
| mr55.c41.2.2 | `setback_from_road_boundary / road_width ≥ 0.10` | the road (already supplied) |
| mr55.c44 | `building_height / distance_to_opposite_road_boundary ≤ 2` | the road (not supplied) |

What the pack *does* read, and nobody supplies, is the **scale of the intended building**:
`storey_count` and `building_height` appear in the `any_of` of mr55.c41.2.1, .2.2 and .2.3. Each of
those clauses carries the pack's own note: *"เมื่อยังไม่ทราบความสูงหรือจำนวนชั้น จะยังตัดข้อนี้ออกไม่ได้"*.
Without them, three setback clauses sit permanently at `UNRESOLVED` applicability — the screen can
neither rule them in nor rule them out.

## Decision

Accept the reader's **intended** building scale, optionally, at intake, and use it in exactly one
place: deciding **which rules reach this concept**. It may never take part in deciding whether a
rule is satisfied.

Concretely, `ConceptUnderTest` gains a second map beside `inputs`:

- `inputs` — measured facts. Unchanged in meaning. Only these reach `evaluatePredicate` and
  `requirementFor`, so only a measurement can produce `PASS` or `FAIL`.
- `intended` — what the reader says they are thinking of building. Merged with `inputs` for
  applicability only.

So a reader who says "สามชั้น สูงราว 11 เมตร" is told *which* setback clause governs a building that
size on their road, and what distance it demands. They are not told they comply with it, because
nobody has drawn the building, let alone measured it.

## Why this and not the alternatives

**Letting stated figures settle outcomes** would convert `UNKNOWN` into `PASS`/`FAIL` from numbers
the reader guessed. `docs/project-overview.md` and `docs/validation-architecture.md` both forbid
exactly that conversion, and the practical harm is plain: a reader told "ผ่าน" on the strength of a
height they estimated may spend money on it, and the survey afterwards is where they find out.

**Leaving it alone** keeps the product honest but leaves three clauses unanswerable forever for the
sake of a fact the reader already knows and we never asked for.

**A standard assumed design per building type** (option C in the review) was rejected for the
reason the review itself gives: a reader cannot tell a verdict about an invented building from a
verdict about theirs.

## Consequences

- Output scope is unchanged. These are statements about which law applies, not findings about the
  plot, so a run stays at `AREA` and no result is promoted to `PRELIMINARY_PROPERTY`.
- Both fields are optional, as every other detail at intake is. A reader who does not know, or has
  not decided, sees exactly what they see today.
- Where a stated figure settled an applicability, the screen says so, naming the figure and that
  the reader gave it. A reader who changes their mind about the height gets a different answer, and
  must be able to see why.
- The validator version is unchanged at `legal-validator@1.0.0`: no rule's meaning, threshold or
  verdict changes, and no pack is edited. What changes is which facts the applicability test is
  allowed to read.
- Still out of scope, and unaffected: every clause needing a drawing stays `UNKNOWN` and keeps
  saying which drawing. The checklist added on 2026-10-09 continues to group them by where the
  reader would have to go.
