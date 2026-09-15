/**
 * @reis/ai-gateway — the ONLY package that calls Gemini (docs/technology-stack.md §4/§10,
 * docs/ai-architecture.md). Normal run: 1 concept-proposal call; at most 1 repair call;
 * AI_MAX_CALLS_PER_RUN = 2. Never called from apps/web/src/client directly.
 *
 * Built last in the current increment (Day 9, after the deterministic backbone — evidence engine,
 * analysis engine, DB — is stable and testable on its own; see round 3 of the design discussion,
 * 2026-09-15).
 */
export const PRIMARY_MODEL = "gemini-3.1-flash-lite" as const;
export const AI_MAX_CALLS_PER_RUN = 2 as const;
