# Source adapters emit one observation per source cohort, never a fabricated aggregate

**Status:** accepted (2026-09-15)

## Context

The NSO Socio-Economic Survey income table (`SFD_SPB0802_66`), verified live on 2026-09-15, publishes
household income broken down by socio-economic class — ten class combinations per province per year —
and **contains no all-households total row**. The obvious-looking "average household income for
province X" that downstream demand analysis would like does not exist in the source.

Producing one anyway would require either summing the ten class figures (meaningless — they are
means, not additive amounts) or averaging them (wrong — it would weight a tiny agricultural cohort
equally with the largest employee cohort, and the table carries no household counts to weight by).
The same table also encodes survey zeros as `value: 0` with an explanatory `attribute` string, which
is neither "no data" nor a measured income of zero baht.

## Decision

Source adapters emit one `Observation` per cohort the source actually published, carrying that
cohort in a required `population` field, and never synthesise a cross-cohort aggregate. Source-stated
caveats travel with the observation in `source_note`. Any later aggregation is a separate, reviewed,
versioned method with its own weighting evidence — not something an adapter does implicitly.

## Consequences

Callers cannot ask for "the income of province X" and get a single number; they get ten cohort
figures and must state which cohort their reasoning uses. That is the intended cost: it keeps
`docs/data-architecture.md`'s rules enforceable at the boundary where data enters the system —
"every value must retain its meaning", missing is never zero, and derived values are never presented
as observed ones. It also means a demand method that needs a provincial average is blocked until a
reviewed weighting method exists, rather than silently shipping an indefensible number.
