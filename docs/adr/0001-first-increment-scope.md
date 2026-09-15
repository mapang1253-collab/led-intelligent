# First implementation increment excludes legal/physical/financial validation

**Status:** accepted (agreed with project authors อรณภา and สุรัตนาพร, 2026-09-15)

## Context

The submission deadline is 2026-09-27 — 12 days from Architecture Freeze v1.0. The frozen architecture
(`docs/project-overview.md`, `docs/implementation-plan.md`) specifies ten dependency-ordered work packages,
including legal/physical/demand validation, a controlled economic component registry, and AI-driven scenario
comparison. Building and activating all of it (with `ACADEMIC_REVIEWED` review evidence for every pack) is not
achievable in the time available.

Two ways to spend the limited time were considered:

- **(A) Breadth first** — implement the full Thailand-wide pipeline for intake, admin resolution, evidence
  acquisition from free/open nationwide sources, and AI-proposed concepts, leaving legal/physical/demand
  validation and the economic registry inactive (`UNKNOWN`/`UNSUPPORTED_MODEL`, exactly as the architecture
  already specifies for unactivated packs).
- **(B) Depth first** — activate a minimal legal validation pack scoped to Chon Buri/EEC (using the zoning and
  Royal Gazette data already gathered in `research/`), to demonstrate at least one real `PASS`/`FAIL` legal
  outcome, before broadening evidence coverage to other provinces.

## Decision

Take **(A) breadth first**, then **(B)** only if time remains before 2026-09-27. The first working increment is:
property intake → administrative-area resolution → evidence acquisition from free/open nationwide sources
(Treasury assessed land value, OSM extract, DOPA population, NSO income, MOTS tourism, GISTDA historical flood) →
AI-proposed `PotentialUseConcept`s (added only after the deterministic backbone is stable) → deterministic Thai
result presentation per `docs/output-policy.md`. Legal, physical and demand validation, and the economic
component registry, stay unactivated in this increment.

## Consequences

The app genuinely accepts and analyzes any of the 77 provinces from day one — there is no Chon Buri-only code
path. Evidence completeness varies honestly by province (nationwide free sources apply everywhere; EEC-specific
zoning/demographic layers only improve results inside Chon Buri/Rayong/Chachoengsao), which the architecture
already requires (`docs/data-architecture.md` §10). Every result in this increment reports legal/physical/demand
requirements as `UNKNOWN` and financial models as unsupported — this is the correct, spec-compliant behavior for
an unactivated pack, not a defect. `RD-4` academic review responsibility for any pack activated later (starting
with a Chon Buri/EEC legal pack, if time permits) is held jointly by อรณภา and สุรัตนาพร.
