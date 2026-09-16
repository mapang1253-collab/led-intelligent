import { createDb, listDistricts, listProvinces, listSubdistricts } from "@reis/data-access";
import { Hono } from "hono";
import { analysisRuns } from "./routes/analysis-runs.js";

/**
 * Public HTTP API (docs/api-contracts.md §3, docs/technology-stack.md §7). Static SPA assets are
 * served without invoking this Worker (see `assets` in wrangler.jsonc); everything here is
 * `/api/v1/*` plus operational endpoints outside that namespace.
 */
export type Env = {
  HYPERDRIVE: Hyperdrive;
  GEMINI_API_KEY: string;
  /**
   * LIVE_AI | RECORDED_AI | AI_DISABLED (docs/ai-architecture.md §5). Absent means AI_DISABLED:
   * calling a provider is something a deployment opts into, never a default.
   */
  AI_MODE?: string;
  /** Recorded from the project's Google AI Studio rate-limit page (docs/ai-architecture.md §5). */
  GEMINI_RPM_LIMIT?: string;
  GEMINI_TPM_LIMIT?: string;
  GEMINI_RPD_LIMIT?: string;
  AI_DAILY_RESERVE_PERCENT?: string;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

// Operational only — not a public contract route. Confirms `pnpm dev`/`wrangler dev` are wired up.
app.get("/healthz", (c) => c.json({ status: "ok" }));

const SCHEMA_VERSION = "1.0.0";

app.get("/api/v1/administrative-areas/provinces", async (c) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await listProvinces(db);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

app.get("/api/v1/administrative-areas/districts", async (c) => {
  const provinceId = c.req.query("province_id");
  if (!provinceId) {
    return c.json({ error: "MISSING_PROVINCE_ID" }, 400);
  }
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await listDistricts(db, provinceId);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

app.get("/api/v1/administrative-areas/subdistricts", async (c) => {
  const districtId = c.req.query("district_id");
  if (!districtId) {
    return c.json({ error: "MISSING_DISTRICT_ID" }, 400);
  }
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await listSubdistricts(db, districtId);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

app.route("/api/v1/analysis-runs", analysisRuns);

/**
 * Anything that is not an API route belongs to the SPA: hand it back to the assets layer so
 * client-side routes resolve to index.html instead of a Worker 404. API routes that genuinely do
 * not exist still need to fail as API calls, not as HTML.
 */
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "NOT_FOUND" }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
