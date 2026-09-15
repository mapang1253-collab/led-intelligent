import { createDb, listDistricts, listProvinces, listSubdistricts } from "@reis/data-access";
import { Hono } from "hono";

/**
 * Public HTTP API (docs/api-contracts.md §3, docs/technology-stack.md §7). Static SPA assets are
 * served without invoking this Worker (see `assets` in wrangler.jsonc); everything here is
 * `/api/v1/*` plus operational endpoints outside that namespace.
 */
export type Env = {
  HYPERDRIVE: Hyperdrive;
  GEMINI_API_KEY: string;
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

// TODO(Day 7-8): POST /api/v1/analysis-runs, GET /api/v1/analysis-runs/:run_id,
//                POST /api/v1/analysis-runs/:run_id/cancel — see docs/api-contracts.md §3.

export default app;
