/**
 * AnalysisWorkflow — Cloudflare Workflow orchestrating one analysis run (docs/technology-stack.md
 * §3, docs/system-design.md §4). Run ID is the deterministic Workflow instance identity; each step
 * is idempotent, versioned and independently retried/classified.
 *
 * Not wired yet — the deterministic evidence/AI pipeline (Day 4-9) needs to exist before there is
 * anything for a Workflow step to orchestrate. Until then apps/web/src/worker/index.ts may call
 * pipeline code directly for local iteration.
 */
export {};
