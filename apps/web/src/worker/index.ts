import type { LegalRulePack } from "@reis/contracts";
import {
  aiStatus,
  areaComparison,
  areasByIds,
  createDb,
  findParcel,
  forgetParcelLayer,
  listDistricts,
  listProvinces,
  listSubdistricts,
  loadParcelLayer,
  loadZoneReferences,
  parcelCoverage,
  purgeExpiredRuns,
  resolveAreaIdsByName,
  saveParcelLayer,
  saveZoneReference,
  searchAreas,
  sourceStatuses,
  wellDocumentedAreas,
} from "@reis/data-access";
import {
  DPT_PARCEL_ATTRIBUTION_TH,
  DPT_PARCEL_PROVINCE_CODES,
  DPT_PARCEL_PUBLISHER_URL,
  type DptParcelLayerResult,
  ZONING_ATTRIBUTION_TH,
  ZONING_PUBLISHER_URL,
  describeParcelLayer,
  fetchProximity,
  fetchZoning,
  findDptParcel,
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

/**
 * How long a zoning lookup may spend before the screen is told it failed.
 *
 * DPT answers in well under a second when it answers at all, so this is never the cost of a
 * success — it is the ceiling on a reader's wait when the service is in one of its refusing
 * spells, and it buys roughly two attempts.
 */
const ZONING_BUDGET_MS = 25_000;

/**
 * How long one request to DPT may take before it is abandoned.
 *
 * Measured, twice, and the second measurement overturned the first. From a Cloudflare colo near
 * Bangkok the department answers in about 0.6 seconds, which is where the original five- and
 * eight-second ceilings came from. On 2026-10-08 the owners' own browser was routed through
 * Singapore instead, and from there every DPT request took over seven seconds — so every ceiling
 * cut every request off, and the city plan and the parcel lookup failed for that reader every
 * time while answering instantly from a terminal on the same desk.
 *
 * Slow, not refused: one metadata read did finish, at just over seven seconds. So the ceiling has
 * to clear a slow route rather than a fast one, and the number that matters is the budget around
 * it, not this.
 */
const DPT_REQUEST_TIMEOUT_MS = 12_000;

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
  /**
   * One pass, not a loop.
   *
   * The adapter walks three Overpass hosts inside a single call now, so what used to be "retry
   * three times" became nine requests and 36 seconds of spinner. Trying the same exhausted list
   * again immediately buys nothing a reader would not get faster by pressing the retry button the
   * screen already offers, and a success is cached at the edge for a week.
   */
  const result = await fetchProximity(lat, lon);

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
  /**
   * The shape version is part of the key.
   *
   * These answers are kept for a month, so a deployment that adds a field to the response meets
   * entries written before it existed. Adding `legend` and reading its length cost a blank page
   * until the client was taught to tolerate its absence — the client is now defensive, and this
   * makes sure nobody has to wait out a month-old cache to see a new field at all. Bump it
   * whenever this response grows or loses a field.
   */
  const cacheKey = new Request(
    `https://zoning.invalid/v3/${provinceCode}/${lat.toFixed(4)},${lon.toFixed(4)}`,
  );
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  /**
   * Retried here, not in the adapter, which leaves the decision to its caller (see `http.ts`).
   *
   * Both numbers were measured against the deployed Worker on 2026-09-26, and both are about the
   * reader's wait rather than about DPT. When DPT answers at all it answers in well under a
   * second, from Bangkok and from Cloudflare alike; when it refuses it refuses a short burst of
   * requests and then serves normally again. So a long timeout buys nothing — it only decides how
   * long someone stares at a spinner before the screen admits the lookup failed. The first
   * version used the 20-second default across three attempts, and a เชียงใหม่ pin sat loading for
   * a minute before showing its retry button.
   *
   * Seven seconds, three attempts. Two was not enough: during one of those busy spells the same
   * pin failed five times running in the browser while the retry button was pressed, and a traced
   * request showed why — the first attempt returned nothing at all for its full seven seconds and
   * the second answered in four and a half. The failures are silence, not slowness, so another
   * attempt buys more than a longer one would.
   *
   * Worst case is about twenty-two seconds of spinner on a panel that blocks nothing: the form can
   * still be submitted while it resolves. Against that, an unnecessary error the reader has to
   * click through is worse, and a success is cached at the edge for a month, so a coordinate that
   * has been answered once is answered instantly from then on — measured at 0.2s against 11.7s.
   */
  /**
   * What is already known about a zone, so DPT only has to answer it once (migration 0013).
   *
   * Four of the five requests a lookup makes ask the same question every time — what zone 4400 of
   * plan 1300000 is called, its colour, its ข้อกำหนด and its ข้อห้าม — and that is published
   * reference data, the same for every reader. Keeping it is what stops a busy department from
   * taking the city plan away from somebody. The coordinate is never stored: the point-to-zone
   * step still goes out on every lookup, so nothing here belongs to a reader or a run.
   *
   * The edge cache in front of this is still worth having — it answers in milliseconds — but it is
   * per colo, so a reader in another province starts cold and this is what they land on.
   */
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  const store = {
    load: (keys: readonly { planId: string; zoneCode: string }[]) => loadZoneReferences(db, keys),
    save: (planId: string, zoneCode: string, zone: Parameters<typeof saveZoneReference>[3]) =>
      saveZoneReference(db, planId, zoneCode, zone),
  };

  const startedAt = Date.now();
  const attempt = () =>
    fetchZoning(provinceCode, lat, lon, { timeoutMs: DPT_REQUEST_TIMEOUT_MS, store });
  let result = await attempt();
  // A whole-operation budget, not a per-request one. One lookup is two waves of requests — the
  // identify, then the colour and the regulation text for each plan it hit — so three attempts at
  // a seven-second timeout was never the twenty-two seconds that number suggests. Measured from
  // the browser against a refusing DPT: 43 seconds before the screen admitted anything. The
  // reader waits for a panel that blocks nothing and has a retry button under it, so the budget
  // is what matters and the attempt count follows from it.
  while (
    result.outcome === "FAILED" &&
    result.retryable &&
    Date.now() - startedAt < ZONING_BUDGET_MS
  ) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    result = await attempt();
  }
  c.executionCtx.waitUntil(db.destroy());

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
    // What every colour on the overlay means, for the plans this point fell in.
    legend: result.outcome === "SUCCESS" ? result.legend : [],
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
  // Cached for the same reason, and for a day: which provinces can be searched changes when
  // parcels are ingested or the adapter's list changes, both of which ship in a deployment.
  const cache = caches.default;
  const cacheKey = new Request("https://parcel-coverage.invalid/v2");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const [stored, provinces] = await Promise.all([parcelCoverage(db), listProvinces(db)]);
    /**
     * The provinces answerable live, named from the reference table rather than from a list here.
     *
     * The adapter knows 57 two-digit codes and nothing else about them; the names and the ids the
     * area picker selects by are already in the database, so they come from there. A code with no
     * matching province — which would mean the reference table and the adapter disagree — is left
     * out rather than shown as a blank option.
     */
    const live = DPT_PARCEL_PROVINCE_CODES.map((code) => {
      const province = provinces.find((row) => String(row.code).padStart(2, "0") === code);
      return province
        ? { province_code: code, province_name_th: province.name_th, province_id: province.id }
        : null;
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    const response = c.json({
      schema_version: SCHEMA_VERSION,
      // `data` keeps its meaning: the provinces held in the database, with their row counts.
      data: stored,
      live,
      live_publisher: DPT_PARCEL_ATTRIBUTION_TH,
    });
    response.headers.set("Cache-Control", "public, max-age=86400");
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } finally {
    await db.destroy();
  }
});

app.get("/api/v1/parcels/search", async (c) => {
  const mapSheet = (c.req.query("map_sheet") ?? "").trim();
  const landNo = (c.req.query("land_no") ?? "").trim();
  const provinceCode = (c.req.query("province_code") ?? "").trim();
  if (!mapSheet || !landNo) {
    return c.json({ error: "MISSING_PARCEL_KEY" }, 400);
  }
  if (!/^[0-9IViv\s\-/]{6,40}$/.test(mapSheet) || !/^[0-9]{1,12}$/.test(landNo)) {
    // Shape-checked before it reaches a query: these two strings come straight from a text box.
    return c.json({ error: "PARCEL_KEY_NOT_RECOGNISED" }, 400);
  }
  if (provinceCode !== "" && !/^\d{2}$/.test(provinceCode)) {
    return c.json({ error: "PARCEL_PROVINCE_NOT_RECOGNISED" }, 400);
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    /**
     * The stored parcels answer first, then the department's service (docs/adr/0009).
     *
     * Order is on purpose rather than for speed. Where the Land Department publishes the parcel
     * openly we hold their own row, with the area and the centre they computed and the reference
     * ids already joined; DPT republishes the same cadastre, so asking them for a parcel we already
     * hold would swap a first-hand figure for a second-hand one. A ระวาง addresses one place in the
     * country, so the two can never both be right about different land.
     */
    const stored = await findParcel(db, mapSheet, landNo);
    if (stored) {
      return c.json({ schema_version: SCHEMA_VERSION, data: stored, source: "DOL_STORED" });
    }

    if (!DPT_PARCEL_PROVINCE_CODES.includes(provinceCode)) {
      /**
       * Two different misses, told apart before the screen says anything.
       *
       * A province held in the database that simply has no such เลขที่ดิน is "check your numbers".
       * A province nobody publishes is "we cannot search here at all". Answering the first with the
       * second tells a reader in ปทุมธานี, whose parcels we hold in full, that their province is not
       * covered — which is both wrong and the one thing this panel exists to get right.
       */
      const held = (await parcelCoverage(db)).some(
        (province) => province.province_code === provinceCode && province.parcels > 0,
      );
      return c.json({
        schema_version: SCHEMA_VERSION,
        data: null,
        source: held ? "DOL_STORED" : null,
        covered: held,
      });
    }

    const profile = await parcelLayerProfile(db, provinceCode);
    if (profile.outcome === "FAILED") {
      /**
       * Not "your province is not published".
       *
       * This is the department failing to answer a question about itself, and saying it with the
       * sentence reserved for a province nobody publishes sent a reader in เชียงใหม่ away
       * believing the feature does not cover them — on a first lookup that was only slow.
       */
      return c.json({ error: "PARCEL_LOOKUP_FAILED", retryable: profile.retryable }, 502);
    }
    if (profile.outcome === "UNSEARCHABLE") {
      return c.json({ schema_version: SCHEMA_VERSION, data: null, source: null, covered: false });
    }

    const layer = profile.layer;
    let found = await findDptParcel(provinceCode, mapSheet, landNo, layer, {
      timeoutMs: DPT_REQUEST_TIMEOUT_MS,
    });

    /**
     * A rejected query against a remembered layer means what we remembered is wrong.
     *
     * The stored profile says which layer holds the parcels and what its columns are called. If
     * the department renumbers a layer or renames a column, every lookup in that province comes
     * back rejected — and rejected reads on screen as "we could not search", for everyone, for as
     * long as the row stands. `DO NOTHING` on write means it would never correct itself either.
     *
     * So that one failure, and only that one, throws the row away and asks the department again.
     * A transport failure is left alone: retrying those is what the budget above is for, and
     * forgetting a good profile because the network blinked would cost every later reader the
     * three slow requests this table exists to avoid.
     */
    if (found.outcome === "FAILED" && !found.retryable && profile.remembered) {
      await forgetParcelLayer(db, provinceCode);
      const fresh = await describeParcelLayer(provinceCode, { timeoutMs: DPT_REQUEST_TIMEOUT_MS });
      if (fresh.outcome === "SEARCHABLE") {
        await saveParcelLayer(db, provinceCode, fresh.layer);
        found = await findDptParcel(provinceCode, mapSheet, landNo, fresh.layer, {
          timeoutMs: DPT_REQUEST_TIMEOUT_MS,
        });
      }
    }

    if (found.outcome === "FAILED") {
      // 502 rather than 500, and retryable: the upstream did not answer, and the screen offers it.
      return c.json({ error: "PARCEL_LOOKUP_FAILED", retryable: found.retryable }, 502);
    }
    if (found.outcome === "OUTSIDE_COVERAGE") {
      return c.json({ schema_version: SCHEMA_VERSION, data: null, source: null, covered: false });
    }
    if (found.outcome === "NOT_FOUND") {
      return c.json({
        schema_version: SCHEMA_VERSION,
        data: null,
        source: "DPT_LIVE",
        covered: true,
      });
    }

    /**
     * Shaped like a stored parcel, so one screen renders either.
     *
     * The ids are resolved here rather than left out, because the whole point of a lookup is that
     * the form stops asking where the land is. DPT hands back names; the picker selects by id.
     */
    const parcel = found.parcel;
    const ids = await resolveAreaIdsByName(
      db,
      provinceCode,
      parcel.district_name_th,
      parcel.subdistrict_name_th,
    );
    return c.json({
      schema_version: SCHEMA_VERSION,
      source: "DPT_LIVE",
      covered: true,
      attribution_th: DPT_PARCEL_ATTRIBUTION_TH,
      publisher_url: DPT_PARCEL_PUBLISHER_URL,
      data: {
        land_no: parcel.land_no,
        map_sheet: parcel.map_sheet,
        // Several provinces publish the outline with no name columns at all. The province is still
        // known — it is the one whose service answered — so it is named from the reference table
        // rather than left blank, which on screen reads as "we could not tell where this is".
        province_name_th: parcel.province_name_th ?? ids.province_name_th,
        district_name_th: parcel.district_name_th,
        subdistrict_name_th: parcel.subdistrict_name_th,
        area_sqm: parcel.area_sqm === null ? null : String(parcel.area_sqm),
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        // Spelled out rather than spread: `ids` also carries the province's name, and spreading it
        // here would quietly replace the publisher's own name for the parcel with ours.
        province_id: ids.province_id,
        district_id: ids.district_id,
        subdistrict_id: ids.subdistrict_id,
        // One ระวาง and one เลขที่ดิน can address more than one polygon in the department's data.
        match_count: parcel.match_count,
      },
    });
  } finally {
    c.executionCtx.waitUntil(db.destroy());
  }
});

/**
 * Where a province keeps its parcels and how it spells the columns.
 *
 * Discovered rather than listed, because the 57 services do not agree: the layer is numbered 0 in
 * ภูเก็ต and 26 in พิษณุโลก, นครนายก spells the column `land_no`, and ปัตตานี stores เลขที่ดิน as an
 * integer. Reading it costs two of the three requests a cold lookup makes, so the answer is kept
 * in `reference.dpt_parcel_layer` (migration 0014).
 *
 * Kept in the database and nowhere else, deliberately. It sat in `caches.default` first, and that
 * is per colo: the colo near Bangkok, where the department answers in half a second, held the
 * answer and never wrote it down, while the colo in Singapore — where each request takes over
 * seven seconds and three of them cannot finish — started cold every time and failed. The cache
 * helped exactly the readers who did not need help. One indexed read from a connection this route
 * has already opened costs milliseconds and helps everyone.
 *
 * Nothing here is a reader's. This is published metadata about a province's own service; the
 * ระวาง and the เลขที่ดิน they typed are never written anywhere, and the parcel query itself still
 * goes out live on every lookup.
 */
type ParcelLayerProfile = DptParcelLayerResult & { readonly remembered?: boolean };

async function parcelLayerProfile(
  db: ReturnType<typeof createDb>,
  provinceCode: string,
): Promise<ParcelLayerProfile> {
  const held = await loadParcelLayer(db, provinceCode);
  if (held) {
    return { outcome: "SEARCHABLE", layer: held, remembered: true };
  }

  /**
   * Two tries within a budget, as the zoning lookup does for the same service.
   *
   * This is the first reader of a province anywhere, and only them: everyone after reads the row.
   * So the budget is generous — it buys a province nobody has looked up yet, from a colo the
   * department answers slowly.
   */
  const startedAt = Date.now();
  let result = await describeParcelLayer(provinceCode, { timeoutMs: DPT_REQUEST_TIMEOUT_MS });
  while (result.outcome === "FAILED" && result.retryable && Date.now() - startedAt < 15_000) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    result = await describeParcelLayer(provinceCode, { timeoutMs: DPT_REQUEST_TIMEOUT_MS });
  }
  if (result.outcome !== "SEARCHABLE") {
    // Neither outcome is kept. "Unsearchable" is cheap to re-derive and remembering it would
    // outlast a department that started publishing; a failure must never be remembered.
    return result;
  }

  // Awaited, not deferred: the route closes its pool in a `finally`, and a write still in flight
  // when that happens is a write that may not land.
  await saveParcelLayer(db, provinceCode, result.layer);
  return result;
}

/**
 * The best-documented areas, cached for a day.
 *
 * The front page shows these to every visitor, and they change only when a source is ingested —
 * which is a deliberate act, not something that happens while someone is reading. Caching is the
 * second half of a fix: the query behind this ranked every subdistrict with three correlated
 * counts and took sixty seconds, and is now one grouped pass, but a landing page should not reach
 * the database at all for a figure that was true this morning.
 */
app.get("/api/v1/administrative-areas/well-documented", async (c) => {
  const cache = caches.default;
  const cacheKey = new Request("https://well-documented.invalid/v1");
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const data = await wellDocumentedAreas(db, 6);
    const response = c.json({ schema_version: SCHEMA_VERSION, data });
    response.headers.set("Cache-Control", "public, max-age=86400");
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
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
    const [registered, ai] = await Promise.all([sourceStatuses(db), aiStatus(db)]);
    /*
     * The review date is published; the reviewers' names are not.
     *
     * A reviewed artefact may only execute because a named review record exists, and that record
     * stays in database/reviewed-packs and in the source registry unchanged. What the owners asked
     * for is that their names not appear in the product, and hiding them in the page while the
     * endpoint still served them would have been a gesture rather than a change.
     */
    const sources = registered.map(({ reviewers: _reviewers, ...source }) => source);
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
        reviewed_on: LEGAL_PACK.review?.reviewed_on ?? null,
      },
      valuation_method: {
        method_id: VALUATION_METHOD.method_id,
        version: VALUATION_METHOD.version,
        title_th: VALUATION_METHOD.title_th,
        lifecycle_state: VALUATION_METHOD.lifecycle_state,
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
