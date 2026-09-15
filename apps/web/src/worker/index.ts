import { Hono } from "hono";

/**
 * Public HTTP API (docs/api-contracts.md §3, docs/technology-stack.md §7). Static SPA assets are
 * served without invoking this Worker (see `assets` in wrangler.jsonc); everything here is
 * `/api/v1/*` plus operational endpoints outside that namespace.
 *
 * Bindings (Hyperdrive, R2, ...) are typed via `wrangler types` once configured — see
 * apps/web/wrangler.jsonc and .dev.vars.example.
 */
export type Env = {
  // HYPERDRIVE: Hyperdrive;
  // RAW_OBJECTS: R2Bucket;
  GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// Operational only — not a public contract route. Confirms `pnpm dev`/`wrangler dev` are wired up.
app.get("/healthz", (c) => c.json({ status: "ok" }));

// TODO(Day 2-3): GET /api/v1/administrative-areas/{provinces,districts,subdistricts}
// TODO(Day 7-8): POST /api/v1/analysis-runs, GET /api/v1/analysis-runs/:run_id,
//                POST /api/v1/analysis-runs/:run_id/cancel — see docs/api-contracts.md §3.

export default app;
