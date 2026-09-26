import type { LegalRulePack } from "@reis/contracts";
import {
  aiStatus,
  areaComparison,
  areasByIds,
  createDb,
  findParcel,
  listDistricts,
  listProvinces,
  listSubdistricts,
  parcelCoverage,
  purgeExpiredRuns,
  searchAreas,
  sourceStatuses,
  wellDocumentedAreas,
} from "@reis/data-access";
import {
  ZONING_ATTRIBUTION_TH,
  ZONING_PUBLISHER_URL,
  fetchProximity,
  fetchZoning,
  geocodeArea,
  searchPlaces,
  zoningTileTemplate,
} from "@reis/source-adapters";
import { Hono } from "hono";
import mr55Pack from "../../../../database/reviewed-packs/th-cba-mr55-v1.json" with {
  type: "json",
};
import valuationMethod from "../../../../database/reviewed-packs/th-valuation-assessed-v1.json" with {
  type: "json",
};
import { analysisRuns } from "./routes/analysis-runs.js";
import { readBudgetLimits } from "./stages/budgeted-client.js";

const LEGAL_PACK = mr55Pack as unknown as LegalRulePack;
const VALUATION_METHOD = valuationMethod as unknown as {
  method_id: string;
  version: string;
  title_th: string;
  lifecycle_state: string;
  review: { reviewers: string[]; reviewed_on: string } | null;
};

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

/**
 * Area lookup by name, with what is known about each result.
 *
 * The counts travel with the choice so a reader is not asked to pick blind and discover afterwards
 * that the system has nothing to say about where they picked. They count published figures and
 * nothing else — an area with more of them is better documented, not better to invest in.
 */
app.get("/api/v1/administrative-areas/search", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (query.length < 2) {
    // Refused rather than answered with the whole country: a one-character search is not a search.
    return c.json({ schema_version: SCHEMA_VERSION, data: [] });
  }
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await searchAreas(db, query, 20);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

/**
 * Figures for a named handful of areas, for the front page's starting list.
 *
 * The ids come from the client because which places are worth offering is a product decision, and
 * the familiar name each is known by lives there with them. A cap and a shape check keep a public
 * endpoint from being turned into an arbitrary bulk reader of the area table.
 */
app.get("/api/v1/administrative-areas/by-ids", async (c) => {
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d{1,8}$/.test(id))
    .slice(0, 12);
  if (ids.length === 0) {
    return c.json({ schema_version: SCHEMA_VERSION, data: [] });
  }
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await areasByIds(db, ids);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

/**
 * The same handful of areas, with the figures a reader is choosing between rather than counts.
 *
 * Separate from `by-ids` because it is a different question and a heavier query: the picker wants
 * "does this place have anything", the shortlist wants "how do these places differ". Same cap and
 * same shape check.
 */
app.get("/api/v1/administrative-areas/compare", async (c) => {
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d{1,8}$/.test(id))
    .slice(0, 12);
  if (ids.length === 0) {
    return c.json({ schema_version: SCHEMA_VERSION, data: [] });
  }
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await areaComparison(db, ids);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

/**
 * Straight-line distances from a reader-placed pin (docs/adr/0006).
 *
 * The client never reaches OpenStreetMap itself: UI may not call providers, and `source-adapters`
 * is the only package allowed to (docs/technology-stack.md §4). What crosses the wire from the
 * browser is two numbers, bounded to Thailand here as well as in the schema, so a user-supplied
 * value can never become a user-supplied URL.
 *
 * Outside the run entirely — no run id, nothing stored, nothing in the envelope. Proximity is
 * context for display, so it hangs off its own endpoint rather than the analysis pipeline, which
 * is the same distinction that keeps it out of the evidence-activation gates.
 */
app.get("/api/v1/proximity", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  const inThailand =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 5.5 &&
    lat <= 20.5 &&
    lon >= 97 &&
    lon <= 106;
  if (!inThailand) {
    return c.json({ error: "COORDINATES_OUT_OF_RANGE" }, 400);
  }

  // Rounded to about 11 m so small differences in where a reader clicked share one cache entry.
  const cache = caches.default;
  const cacheKey = new Request(`https://proximity.invalid/${lat.toFixed(4)},${lon.toFixed(4)}`, {
    method: "GET",
  });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  /**
   * Retried here rather than in the adapter, because `source-adapters` deliberately leaves the
   * retry decision to its caller (see `http.ts`).
   *
   * Measured on 2026-09-19: three identical queries to the public Overpass endpoint returned
   * 504, 200, 504 — the successful one in two seconds with 39KB, the failures after ten seconds
   * of gateway timeout. The instance is simply overloaded some of the time, with quota to spare,
   * so one attempt makes a working feature look broken two times in three. Three attempts turn
   * that around without pressing on a free shared service: only a retryable failure is retried,
   * and a short gap separates them.
   */
  let result = await fetchProximity(lat, lon);
  for (let attempt = 1; attempt < 3 && result.outcome === "FAILED" && result.retryable; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    result = await fetchProximity(lat, lon);
  }
  if (result.outcome === "FAILED") {
    // 502, not 500: the upstream did not answer. The client tells the reader it can retry.
    return c.json({ error: "PROXIMITY_LOOKUP_FAILED", retryable: result.retryable }, 502);
  }
  const response = c.json({
    schema_version: SCHEMA_VERSION,
    data: result.features,
    road_radius_metres: result.road_radius_metres,
    poi_radius_metres: result.poi_radius_metres,
    attribution_th: result.attribution_th,
  });
  // Overpass answers intermittently even with quota to spare, so an answer that did arrive is
  // kept: a pin that worked once keeps working. Only successes are cached — a 502 is never
  // stored, or a bad minute would outlive itself.
  response.headers.set("Cache-Control", "public, max-age=604800");
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

/**
 * The city plan covering the pin (docs/adr/0008).
 *
 * Same standing as proximity above, and for the same reasons: the client never reaches DPT itself,
 * nothing is stored, no run id is involved, and the answer is context for display rather than an
 * input to any rule. The province code comes from the area the reader already chose, shape-checked
 * here so a text box can never become a path segment.
 *
 * Cached hard. A ministerial regulation does not change between two readers looking at the same
 * neighbourhood, and DPT's ArcGIS is a government service that should not be asked the same
 * question repeatedly.
 */
app.get("/api/v1/zoning", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  const provinceCode = (c.req.query("province_code") ?? "").trim();
  const inThailand =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 5.5 &&
    lat <= 20.5 &&
    lon >= 97 &&
    lon <= 106;
  if (!inThailand) {
    return c.json({ error: "COORDINATES_OUT_OF_RANGE" }, 400);
  }
  if (!/^\d{2}$/.test(provinceCode)) {
    return c.json({ error: "MISSING_PROVINCE_CODE" }, 400);
  }

  const cache = caches.default;
  const cacheKey = new Request(
    `https://zoning.invalid/${provinceCode}/${lat.toFixed(4)},${lon.toFixed(4)}`,
  );
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await fetchZoning(provinceCode, lat, lon);
  if (result.outcome === "FAILED") {
    // 502 rather than 500: the upstream did not answer, and the screen offers a retry.
    return c.json({ error: "ZONING_LOOKUP_FAILED", retryable: result.retryable }, 502);
  }

  const response = c.json({
    schema_version: SCHEMA_VERSION,
    // Distinguished on screen: a province that publishes no plan is a different sentence from a
    // point that falls outside every plan in a province that does.
    covered: result.outcome === "SUCCESS",
    data: result.outcome === "SUCCESS" ? result.plans : [],
    tile_template: zoningTileTemplate(provinceCode),
    attribution_th: ZONING_ATTRIBUTION_TH,
    publisher_url: ZONING_PUBLISHER_URL,
  });
  response.headers.set("Cache-Control", "public, max-age=2592000");
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

/**
 * Where to open the map for a chosen area (docs/adr/0006).
 *
 * Cached hard, and that is a courtesy rather than an optimisation: Nominatim's usage policy asks
 * that a public instance not be hammered, and an administrative area's centre does not move. One
 * lookup per area serves every reader who picks it afterwards.
 */
app.get("/api/v1/area-centre", async (c) => {
  const subdistrictId = c.req.query("subdistrict_id");
  if (!subdistrictId || !/^\d{1,8}$/.test(subdistrictId)) {
    return c.json({ error: "MISSING_SUBDISTRICT_ID" }, 400);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL(c.req.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  let names: Awaited<ReturnType<typeof areasByIds>>[number] | undefined;
  try {
    names = (await areasByIds(db, [subdistrictId]))[0];
  } finally {
    await db.destroy();
  }
  if (!names) {
    return c.json({ error: "AREA_NOT_FOUND" }, 404);
  }

  const centre = await geocodeArea({
    subdistrict_th: names.subdistrict_name_th,
    district_th: names.district_name_th,
    province_th: names.province_name_th,
  });
  if (!centre) {
    // Not an error the reader needs to see: the map simply opens on the whole country.
    return c.json({ schema_version: SCHEMA_VERSION, data: null }, 200);
  }

  const response = c.json({ schema_version: SCHEMA_VERSION, data: centre });
  response.headers.set("Cache-Control", "public, max-age=2592000");
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

/**
 * Free-text place lookup, so the map can be searched instead of panned (docs/adr/0006).
 *
 * The first pin map had no search at all. It opened on the whole country unless an area had been
 * chosen, and even then left the reader zooming around a district hunting for their own land,
 * which is why the owners judged it useless — a fair verdict on what was built.
 *
 * Nominatim asks that a public instance not be hammered, so the client debounces, the query is
 * bounded to Thailand, and an answer is cached at the edge for a month: a place name does not
 * move.
 */
app.get("/api/v1/place-search", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (query.length < 3) {
    // Two characters match half the country, and ranking that is not a search.
    return c.json({ schema_version: SCHEMA_VERSION, data: [] });
  }

  const cache = caches.default;
  const cacheKey = new Request(`https://place-search.invalid/${encodeURIComponent(query)}`);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = c.json({ schema_version: SCHEMA_VERSION, data: await searchPlaces(query) });
  response.headers.set("Cache-Control", "public, max-age=2592000");
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

/**
 * Parcel lookup by ระวาง and เลขที่ดิน (docs/adr/0007).
 *
 * The question readers kept asking the area picker to answer, now answerable — for the five
 * provinces the Land Department publishes openly, and only those. Coverage is returned alongside
 * every miss so the screen can tell "that parcel number is not in this sheet" from "we hold no
 * data for your province at all", which are opposite messages to a reader holding a real deed.
 *
 * Not a deed-number search. `LAND_NO` is เลขที่ดิน; เลขที่โฉนด is a different number and is not in
 * this data, which docs/data-sources/dol-parcel.md records along with what it would take.
 */
app.get("/api/v1/parcels/coverage", async (c) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    return c.json({ schema_version: SCHEMA_VERSION, data: await parcelCoverage(db) });
  } finally {
    await db.destroy();
  }
});

app.get("/api/v1/parcels/search", async (c) => {
  const mapSheet = (c.req.query("map_sheet") ?? "").trim();
  const landNo = (c.req.query("land_no") ?? "").trim();
  if (!mapSheet || !landNo) {
    return c.json({ error: "MISSING_PARCEL_KEY" }, 400);
  }
  if (!/^[0-9IViv\s\-/]{6,40}$/.test(mapSheet) || !/^[0-9]{1,12}$/.test(landNo)) {
    // Shape-checked before it reaches a query: these two strings come straight from a text box.
    return c.json({ error: "PARCEL_KEY_NOT_RECOGNISED" }, 400);
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const parcel = await findParcel(db, mapSheet, landNo);
    return c.json({ schema_version: SCHEMA_VERSION, data: parcel });
  } finally {
    await db.destroy();
  }
});

app.get("/api/v1/administrative-areas/well-documented", async (c) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await wellDocumentedAreas(db, 6);
    return c.json({ schema_version: SCHEMA_VERSION, data });
  } finally {
    await db.destroy();
  }
});

/**
 * System status: what this deployment can currently do, and on whose authority.
 *
 * It exists because every "there is no data here" answer the app gives should be checkable.
 * Sources appear whether or not they are switched on, with the names of the people who reviewed
 * them, and the rule pack and valuation method report their lifecycle state and version. Nothing
 * here is secret — counts, states, versions and reviewer names are exactly what an academic
 * reviewer needs to see — and nothing about any run is included.
 */
app.get("/api/v1/system-status", async (c) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const [sources, ai] = await Promise.all([sourceStatuses(db), aiStatus(db)]);
    const limits = readBudgetLimits(c.env);
    const reserve = limits ? limits.rpd * (limits.dailyReservePercent / 100) : 0;
    return c.json({
      schema_version: SCHEMA_VERSION,
      sources,
      legal_pack: {
        pack_id: LEGAL_PACK.pack_id,
        version: LEGAL_PACK.version,
        title_th: LEGAL_PACK.title_th,
        lifecycle_state: LEGAL_PACK.lifecycle_state,
        rule_count: LEGAL_PACK.rules.length,
        reviewers: LEGAL_PACK.review?.reviewers ?? null,
        reviewed_on: LEGAL_PACK.review?.reviewed_on ?? null,
      },
      valuation_method: {
        method_id: VALUATION_METHOD.method_id,
        version: VALUATION_METHOD.version,
        title_th: VALUATION_METHOD.title_th,
        lifecycle_state: VALUATION_METHOD.lifecycle_state,
        reviewers: VALUATION_METHOD.review?.reviewers ?? null,
        reviewed_on: VALUATION_METHOD.review?.reviewed_on ?? null,
      },
      ai: {
        mode: c.env.AI_MODE ?? "AI_DISABLED",
        model: "gemini-3.1-flash-lite",
        calls_today: ai.calls_today,
        outcomes: ai.outcomes,
        // Null when no budget is recorded, which is itself the thing worth reporting.
        daily_limit: limits?.rpd ?? null,
        usable_today: limits ? Math.floor(limits.rpd - reserve) : null,
      },
    });
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

/**
 * Scheduled expiry purge (docs/data-persistence-and-lifecycle.md §3: "At expiry, revoke access and
 * automatically purge run-scoped intake, assertions, AI exchanges, analyses, outputs and temporary
 * objects").
 *
 * Access is already revoked the moment a run expires — every read checks `expires_at` — so this
 * sweep is about the data no longer existing, not about locking it. It is bounded per run and
 * records what it did, so a failure leaves a trace for the next sweep rather than looking like a
 * clean slate.
 */
async function scheduledPurge(env: Env): Promise<void> {
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const outcome = await purgeExpiredRuns(db, { source: "CRON" });
    if (outcome.failure_reason) {
      console.warn(`[purge] failed: ${outcome.failure_reason}`);
    } else if (outcome.runs_deleted > 0) {
      console.log(`[purge] deleted ${outcome.runs_deleted} expired run(s)`);
    }
  } finally {
    await db.destroy();
  }
}

export default {
  fetch: app.fetch,
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(scheduledPurge(env));
  },
};
