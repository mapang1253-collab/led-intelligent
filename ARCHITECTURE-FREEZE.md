# Architecture Freeze Record

**Version:** v1.0  
**Status:** DECLARED  
**Declared by:** Project owner  
**Declaration date:** 2026-09-15 (Asia/Bangkok)

## Frozen baseline

Architecture Freeze v1.0 accepts the owner decisions RD-1 through RD-10 and the final-reviewed implementation architecture for the Thailand-wide Thai web application. Chon Buri/EEC remains research, integration-test and validation coverage only.

The normative frozen documents are:

1. `docs/project-overview.md` for product and analytical behavior;
2. `docs/technology-stack.md` for runtime, framework, providers, repository structure, AI operating profile and Thai presentation;
3. `docs/output-policy.md` for user-visible result policy;
4. `docs/architecture.md`, `docs/data-architecture.md`, `docs/data-persistence-and-lifecycle.md`, `docs/analysis-architecture.md`, `docs/validation-architecture.md`, `docs/economic-component-registry.md`, `docs/scenario-engine.md`, `docs/ai-architecture.md`, `docs/database-design.md`, `docs/api-contracts.md`, `docs/system-design.md`, `docs/performance-and-reliability.md` and `docs/security-privacy-compliance.md` for specialized design;
5. `docs/implementation-plan.md` for dependency order, activation gates, acceptance tests and implementation choices; and
6. `docs/architecture-review.md`, `docs/final-architecture-review.md` and `docs/architecture-verification.md` for reconciliation, findings and verification evidence.

`README.md` and `CLAUDE.md` provide human and implementation-agent entry points. Files under `docs/data-sources/` and `research/` remain dated evidence. They do not override the normative frozen documents or activate a source, rule, method, component or parameter set.

## Effect of the freeze

Implementation may now proceed from this baseline. The implementation team may make only the choices explicitly classified as `IMPLEMENTATION CHOICE` and must keep every activation gate fail-closed.

Changing product scope, analytical semantics, final states, evidence rules, technology/provider boundaries, AI authority, Thai-only presentation, retention, result-only delivery or security boundaries requires an explicit owner-approved architecture decision and a new architecture version. Routine code structure, exact dependency patch/minor versions, measured index tuning, bounded concurrency values, source-specific retry values and visual polish may be selected during implementation within the frozen constraints.

Completing an existing source/rule/method/component/parameter/provider/benchmark activation gate does not change the architecture version when it stays inside the frozen contracts. It records an activation version and its evidence instead.

## Handoff state

This freeze accepts the architecture and implementation specification. It does not claim that the web application has been implemented or that all nationwide evidence sources and analytical packs are active. Those tasks remain in the implementation and academic-demonstration acceptance plan.
