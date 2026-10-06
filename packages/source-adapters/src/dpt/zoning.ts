import { type FetchJsonOptions, fetchJson, fetchText } from "../http.js";

/**
 * The city plan (ผังเมืองรวม) covering a point: which land-use zone it falls in, the colour that
 * zone is drawn in, and the regulation's own words on what may and may not be built there
 * (docs/adr/0008).
 *
 * Published by กรมโยธาธิการและผังเมือง through two services that answer different halves of the
 * question and must both be asked:
 *
 * - `dptgis.dpt.go.th` (ArcGIS, one MapServer per province) holds the zone polygons. A point
 *   query returns the zone code, its Thai name, and the บริเวณ number the ministerial regulation
 *   refers to — `พ.-4`, `ม.-32`. The layer's renderer carries the official colour, so the swatch
 *   on screen is the publisher's, not a palette we invented to look like one.
 * - `plludds.dpt.go.th` holds the ข้อกำหนด and ข้อห้าม text, keyed by plan and zone code.
 *
 * **This is context with a citation, not a validation result.** It produces no `Observation`, no
 * `EvidenceLink`, and it cannot move a legal status or an output scope — the same standing ADR
 * 0006 gave OSM proximity, and for a sharper reason. A zone permitting พาณิชยกรรม does not make a
 * shop lawful on a given plot: the plan is one instrument among several, บัญชีท้ายกฎกระทรวง
 * qualifies it, and the parcel's own frontage and servitudes decide the rest. Presenting a zone
 * lookup as "ทำได้" would be exactly the area-evidence-to-property-evidence promotion the product
 * is built to refuse. So the screen shows the zone and quotes the regulation, and the verification
 * action asking the reader to confirm with the local office stays where it is.
 *
 * Every plan covering the point is returned, never one chosen for the reader. Most provinces
 * publish a province-wide plan and separate town plans, and where they overlap, which governs is a
 * legal question this system has not been given the rules to answer. Showing both, each named, is
 * the honest rendering of that; picking one silently would be a legal opinion in disguise.
 */

/** The two hosts this adapter calls, and the only ones. Neither takes a user-supplied URL. */
const ARCGIS_ROOT = "https://dptgis.dpt.go.th/arcgis/rest/services/dds2";
const CONDITIONS_ROOT = "https://plludds.dpt.go.th/landuse/maps/script";

export const ZONING_SOURCE_ID = "dpt.zoning";

export const ZONING_ATTRIBUTION_TH = "ข้อมูลผังเมืองรวมจากกรมโยธาธิการและผังเมือง (ระบบ DDS Explorer)";

/** Where a reader goes to see the same answer on the publisher's own site. */
export const ZONING_PUBLISHER_URL = "https://plludds.dpt.go.th/landuse/";

export interface ZoningPlan {
  /** The plan's code in DPT's data — `2099000` is ผังเมืองรวมจังหวัดชลบุรี. */
  readonly plan_id: string;
  /** Zone code: `2100` is ศูนย์กลางพาณิชยกรรม. Kept because it keys the regulation text. */
  readonly zone_code: string;
  /** The zone's own name, as the plan writes it. */
  readonly zone_name_th: string;
  /** The บริเวณ number the regulation cites, e.g. `พ.-4`. Null where the plan carries none. */
  readonly block_th: string | null;
  /** `#RRGGBB` from the publisher's renderer. Null when the zone is drawn unfilled. */
  readonly colour: string | null;
  /** ข้อกำหนด — what the plan permits. Null when DPT publishes none for this zone. */
  readonly permitted_th: string | null;
  /** ข้อห้าม, one entry per numbered clause. Empty when DPT publishes none. */
  readonly prohibited_th: readonly string[];
}

/** What a zone is, independently of who looked it up or where they pinned. */
export interface ZoneReference {
  readonly zone_name_th: string;
  readonly colour: string | null;
  readonly permitted_th: string | null;
  readonly prohibited_th: readonly string[];
}

/**
 * Somewhere to keep what DPT says about a zone, supplied by the caller.
 *
 * The adapter does not know what a database is and must not (docs/technology-stack.md §4), so the
 * store arrives as two functions. Without one it behaves exactly as before: every lookup asks DPT
 * for everything. With one, four of the five requests disappear on the second reader to land on
 * the same zone — which is most readers, since `ชุมชน` is zone 4400 of every province plan.
 */
export interface ZoneStore {
  readonly load: (
    keys: readonly { planId: string; zoneCode: string }[],
  ) => Promise<Map<string, ZoneReference>>;
  readonly save: (planId: string, zoneCode: string, zone: ZoneReference) => Promise<void>;
}

export interface ZoningOptions extends FetchJsonOptions {
  readonly store?: ZoneStore;
}

/** The key both sides of a `ZoneStore` agree on. */
export const zoneKey = (planId: string, zoneCode: string) => `${planId}\u0000${zoneCode}`;

/** One row of the map's key: a colour on the overlay and what the plan calls it. */
export interface ZoningLegendEntry {
  readonly zone_code: string;
  readonly zone_name_th: string;
  /** Null where the plan draws the zone unfilled, which the screen renders as an outline. */
  readonly colour: string | null;
}

export type ZoningResult =
  | {
      readonly outcome: "SUCCESS";
      readonly plans: readonly ZoningPlan[];
      /** What every colour on the overlay means, for the plans covering this point. */
      readonly legend: readonly ZoningLegendEntry[];
      readonly attribution_th: string;
    }
  /** The province publishes no plan service. Distinct from "found nothing at this point". */
  | { readonly outcome: "OUTSIDE_COVERAGE" }
  | { readonly outcome: "FAILED"; readonly reason: string; readonly retryable: boolean };

/**
 * Turns one of DPT's HTML fragments into the text it was carrying.
 *
 * The condition endpoints render a styled table rather than returning data, so the content sits in
 * the last `<div>` with the inline margin their template uses. Anchoring on that is narrow enough
 * to break loudly if the template changes, which is the behaviour we want: silently returning a
 * stylesheet as if it were a regulation would be worse than returning nothing.
 */
export function extractConditionText(html: string): string[] {
  const withoutStyle = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  const blocks = [
    ...withoutStyle.matchAll(/<div[^>]*margin-left:\s*20px[^>]*>([\s\S]*?)<\/div>/gi),
  ];
  const last = blocks.at(-1);
  if (!last) {
    return [];
  }
  return (last[1] ?? "")
    .split(/<br\s*\/?>/i)
    .map((part) =>
      part
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((part) => part.length > 0);
}

/** ArcGIS reports colours as `[r, g, b, a]`; a zero alpha means the zone is drawn unfilled. */
export function toHexColour(colour: unknown): string | null {
  if (!Array.isArray(colour) || colour.length < 3) {
    return null;
  }
  if (colour[3] === 0) {
    return null;
  }
  const channels = colour.slice(0, 3);
  if (!channels.every((value) => typeof value === "number" && value >= 0 && value <= 255)) {
    return null;
  }
  return `#${(channels as number[]).map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

interface IdentifyResult {
  readonly layerId: number;
  readonly attributes: Record<string, string>;
}

function readIdentify(payload: unknown): IdentifyResult[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    return [];
  }
  return results.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }
    const record = entry as { layerId?: unknown; layerName?: unknown; attributes?: unknown };
    // PLLU_* are the land-use layers. The same service also carries PLRC_* (planned roads) and
    // LAW* (a legal overlay), which answer other questions and are not this feature's subject.
    if (typeof record.layerName !== "string" || !record.layerName.startsWith("PLLU_")) {
      return [];
    }
    if (typeof record.layerId !== "number" || typeof record.attributes !== "object") {
      return [];
    }
    return [{ layerId: record.layerId, attributes: record.attributes as Record<string, string> }];
  });
}

/**
 * Every zone code this layer draws, with the colour it draws it in.
 *
 * The whole renderer rather than one lookup, because the same request answers two questions: what
 * colour this plot's zone is, and what all the other colours on the map mean. The owners asked for
 * the second — "ช่วยใส่อธิบายสีผังเมืองแต่ละสีได้มั้ย" — after turning the overlay on and seeing
 * pink beside green beside red with nothing to say which was which.
 */
async function layerColours(
  provinceCode: string,
  layerId: number,
  options: FetchJsonOptions,
): Promise<Map<string, string | null>> {
  const colours = new Map<string, string | null>();
  const result = await fetchJson(
    `${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer/${layerId}?f=json`,
    options,
  );
  if (result.outcome !== "SUCCESS") {
    return colours;
  }
  const infos = (result.payload as { drawingInfo?: { renderer?: { uniqueValueInfos?: unknown } } })
    .drawingInfo?.renderer?.uniqueValueInfos;
  if (!Array.isArray(infos)) {
    return colours;
  }
  for (const info of infos) {
    const entry = info as { value?: unknown; symbol?: { color?: unknown } };
    if (entry.value !== undefined && entry.value !== null) {
      colours.set(String(entry.value), toHexColour(entry.symbol?.color));
    }
  }
  return colours;
}

/**
 * Zone code to Thai name, from the plan's own legend.
 *
 * Needed because DPT's older plans carry no `PL_DESC`: สระบุรี's town plans return `PL_USE` 6300
 * and nothing else, so a reader would have been shown a number where the zone's name belongs — or,
 * before this, nothing at all, which read as "your land is in no plan" when it is in one. The
 * legend page lists every zone in the plan with the code as its swatch filename, which is the
 * publisher's own pairing rather than a table we maintain and let drift.
 */
async function legendNames(
  planId: string,
  options: FetchJsonOptions,
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const result = await fetchText(
    `${CONDITIONS_ROOT}/get_legend_pllu.php?cbid=${encodeURIComponent(planId)}`,
    options,
  );
  if (result.outcome !== "SUCCESS") {
    return names;
  }
  for (const row of result.text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const code = /Usecode\/(\d+)\.png/i.exec(row[1] ?? "")?.[1];
    if (!code) {
      continue;
    }
    const cells = [...(row[1] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) =>
        (cell[1] ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((text) => text.length > 0);
    // Columns are swatch, name, block range. The swatch cell holds only the image, so the first
    // cell with text is the name.
    const name = cells[0];
    if (name) {
      names.set(code, name);
    }
  }
  return names;
}

async function conditions(
  script: string,
  planId: string,
  zoneCode: string,
  options: FetchJsonOptions,
): Promise<string[]> {
  const result = await fetchText(
    `${CONDITIONS_ROOT}/${script}?cbid=${encodeURIComponent(planId)}&usecode=${encodeURIComponent(zoneCode)}`,
    options,
  );
  return result.outcome === "SUCCESS" ? extractConditionText(result.text) : [];
}

/**
 * The plans covering one point.
 *
 * `identify` rather than a query per layer: one request returns every layer's hit, which matters
 * because a province can publish seven plans and this runs while a reader waits. The map extent
 * and display size are required by the operation and, with a one-pixel tolerance, have no effect
 * on which polygon contains the point.
 */
export async function fetchZoning(
  provinceCode: string,
  latitude: number,
  longitude: number,
  options: ZoningOptions = {},
): Promise<ZoningResult> {
  if (!/^\d{2}$/.test(provinceCode)) {
    return { outcome: "FAILED", reason: "province code must be two digits", retryable: false };
  }

  const identify = new URL(`${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer/identify`);
  for (const [key, value] of Object.entries({
    geometry: JSON.stringify({ x: longitude, y: latitude }),
    geometryType: "esriGeometryPoint",
    sr: "4326",
    layers: "all",
    // Zero, not a pixel: a pixel at this extent is about eighteen metres on the ground, and it
    // returned the neighbouring zone alongside the one the pin is actually in (สระบุรี, 2026-09-26).
    tolerance: "0",
    mapExtent: `${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}`,
    imageDisplay: "600,600,96",
    returnGeometry: "false",
    f: "json",
  })) {
    identify.searchParams.set(key, value);
  }

  const response = await fetchJson(identify.toString(), options);
  if (response.outcome !== "SUCCESS") {
    // A province with no published plan service answers 404, which is coverage, not a fault.
    if (response.outcome === "NO_RECORD") {
      return { outcome: "OUTSIDE_COVERAGE" };
    }
    return { outcome: "FAILED", reason: response.reason, retryable: response.retryable };
  }

  const error = (response.payload as { error?: { message?: string } }).error;
  if (error) {
    // ArcGIS reports a missing service as HTTP 200 with an error body.
    // Two wordings for the same thing: a province whose plan is not published has no service
    // behind it, and that is coverage, not a fault this deployment can fix.
    return /not found|could not find service|service may be stopped/i.test(error.message ?? "")
      ? { outcome: "OUTSIDE_COVERAGE" }
      : { outcome: "FAILED", reason: error.message ?? "identify failed", retryable: false };
  }

  const hits = readIdentify(response.payload).flatMap((hit) => {
    const planId = hit.attributes.CB_ID?.trim();
    const zoneCode = hit.attributes.PL_USE?.trim();
    // A polygon with no zone code cannot be explained or coloured, and a blank row on screen reads
    // as an answer. DPT's data does contain a few (ชลบุรี has one).
    if (!planId || !zoneCode) {
      return [];
    }
    return [
      {
        layerId: hit.layerId,
        planId,
        zoneCode,
        descriptionTh: hit.attributes.PL_DESC?.trim() ?? "",
        blockTh: hit.attributes.PL_BLOCK?.trim() ?? "",
      },
    ];
  });

  // What is already known, asked once for every zone the point fell in.
  const known = options.store
    ? await options.store.load(hits.map((hit) => ({ planId: hit.planId, zoneCode: hit.zoneCode })))
    : new Map<string, ZoneReference>();

  // One legend per plan, and one renderer per layer, each fetched once and shared: several hits in
  // the same plan must not ask for the same page twice.
  const legends = new Map<string, Promise<Map<string, string>>>();
  const legendFor = (planId: string) => {
    const pending = legends.get(planId) ?? legendNames(planId, options);
    legends.set(planId, pending);
    return pending;
  };
  const renderers = new Map<number, Promise<Map<string, string | null>>>();
  const coloursFor = (layerId: number) => {
    const pending = renderers.get(layerId) ?? layerColours(provinceCode, layerId, options);
    renderers.set(layerId, pending);
    return pending;
  };

  const plans = await Promise.all(
    hits.map(async (hit): Promise<ZoningPlan | null> => {
      const { planId, zoneCode } = hit;
      const block = hit.blockTh;

      // The stored answer, when there is one. This is the whole point of the store: on a hit the
      // four requests below never happen, so a busy DPT cannot take the zone away from a reader.
      const stored = known.get(zoneKey(planId, zoneCode));
      if (stored) {
        return {
          plan_id: planId,
          zone_code: zoneCode,
          zone_name_th: stored.zone_name_th,
          block_th: block ? block : null,
          colour: stored.colour,
          permitted_th: stored.permitted_th,
          prohibited_th: stored.prohibited_th,
        };
      }

      const zoneName = hit.descriptionTh || (await legendFor(planId)).get(zoneCode) || null;
      if (!zoneName) {
        return null;
      }
      const [colours, permitted, prohibited] = await Promise.all([
        coloursFor(hit.layerId),
        conditions("querydb_landuse.php", planId, zoneCode, options),
        conditions("querydb_landuse_prohibition.php", planId, zoneCode, options),
      ]);
      const colour = colours.get(zoneCode) ?? null;
      const zone: ZoneReference = {
        zone_name_th: zoneName,
        colour,
        permitted_th: permitted.length > 0 ? permitted.join(" ") : null,
        prohibited_th: prohibited,
      };
      // Kept only when it is worth keeping. A row with no regulation text behind it would be a
      // bad answer made permanent, and the next reader deserves another attempt at DPT.
      if (options.store && zone.permitted_th) {
        await options.store.save(planId, zoneCode, zone);
      }
      return {
        plan_id: planId,
        zone_code: zoneCode,
        zone_name_th: zone.zone_name_th,
        block_th: block ? block : null,
        colour: zone.colour,
        permitted_th: zone.permitted_th,
        prohibited_th: zone.prohibited_th,
      };
    }),
  );

  /**
   * The key to the overlay, for the layers this point actually fell in.
   *
   * Built from what has already been fetched wherever possible — the renderer carries every
   * colour, the legend page carries every Thai name — so a point in a known zone costs nothing
   * extra, and a point in a stored zone costs one renderer request. Entries the plan has a colour
   * for but no name are dropped: a swatch with a bare code beside it explains nothing.
   */
  const legend: ZoningLegendEntry[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const [colours, names] = await Promise.all([coloursFor(hit.layerId), legendFor(hit.planId)]);
    for (const [zoneCode, colour] of colours) {
      const name = names.get(zoneCode) ?? (zoneCode === hit.zoneCode ? hit.descriptionTh : "");
      if (!name || seen.has(zoneCode)) {
        continue;
      }
      seen.add(zoneCode);
      legend.push({ zone_code: zoneCode, zone_name_th: name, colour });
    }
  }

  return {
    outcome: "SUCCESS",
    plans: plans.filter((plan): plan is ZoningPlan => plan !== null),
    legend,
    attribution_th: ZONING_ATTRIBUTION_TH,
  };
}

/**
 * The publisher's own coloured rendering, as map tiles.
 *
 * Returned as a URL template for the browser rather than proxied: it is a public image service,
 * and passing hundreds of kilobytes of PNG through the Worker to change nothing about it would
 * spend the free plan's budget on a round trip. The colours are DPT's, so what the reader sees
 * beside the swatch is the same drawing the regulation was published with.
 */
export function zoningTileTemplate(provinceCode: string): string | null {
  if (!/^\d{2}$/.test(provinceCode)) {
    return null;
  }
  return `${ARCGIS_ROOT}/PLLU${provinceCode}/MapServer/export?bbox={bbox}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`;
}
