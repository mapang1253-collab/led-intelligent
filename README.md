# Real Estate Investment Intelligence System

This repository contains the completed research, architecture, system design and implementation specification for a browser-based, Thailand-wide, property-centred Highest and Best Use web application created as a university project. Chon Buri/EEC is used only for research and validation fixtures. It contains no application implementation yet; it is the handoff baseline for the implementation phase.

**Architecture Freeze v1.0 was declared by the project owner on 2026-09-15.** Start with the [freeze record](ARCHITECTURE-FREEZE.md), then read [docs/project-overview.md](docs/project-overview.md), which contains the owner-approved product principles and LOCKED decisions. Implementation technology and setup are fixed in [docs/technology-stack.md](docs/technology-stack.md). The package begins at [docs/architecture-review.md](docs/architecture-review.md); the independent final result is [docs/final-architecture-review.md](docs/final-architecture-review.md). Do not execute a source adapter, legal rule pack, validation method, economic component or parameter set in the academic demonstration until its gate in [docs/implementation-plan.md](docs/implementation-plan.md) has passed.

The system accepts a normalized province, district and subdistrict as its minimum input. More precise evidence may strengthen the result, but the output scope must remain honest: area input can produce an area potential analysis; a property-specific recommendation requires sufficient property evidence. The three valid final outcomes are CLEAR_RECOMMENDATION, INCONCLUSIVE and INSUFFICIENT_EVIDENCE.

Final-review corrections and all owner decisions are recorded in Architecture Freeze v1.0. Research/source/method activation evidence remains an implementation and demonstration gate and does not reopen the frozen architecture when completed within its contracts.

The locked implementation profile uses TypeScript, React/Vite and a Hono API on Cloudflare Workers; Cloudflare Workflows/R2/Hyperdrive; Supabase PostgreSQL/PostGIS; and Gemini 3.1 Flash-Lite. End-user output is Thai and appears only on the protected web result page; the MVP has no result download/export feature. The implementer needs Cloudflare, Supabase and Google AI Studio projects; local development and deployment do not require Docker.

## Implementation handoff

Share the complete repository folder, not selected documents. The implementer should open the repository root so that `CLAUDE.md` is available, then explicitly authorize application implementation. That authorization starts the next phase; it does not reopen the recorded architecture decisions.

A suitable kickoff instruction is:

```text
Implement the Thailand-wide Thai web application described by this repository.
Read CLAUDE.md and the documents in its required order, treat the LOCKED decisions
and docs/technology-stack.md as authoritative, and execute the dependency-ordered
work packages in docs/implementation-plan.md. Keep every source, rule, method,
component and parameter set inactive until its documented activation gate passes.
Do not redesign the architecture or add excluded features.
```

Cloudflare, Supabase and Google AI Studio credentials are supplied by the implementer through local/deployment secret configuration and are never added to the repository. Visual layout and non-user-facing polish remain implementation work within the required Thai, responsive and accessible user flow.
