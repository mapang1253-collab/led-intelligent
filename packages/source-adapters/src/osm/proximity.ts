import { type FetchJsonOptions, type FetchJsonResult, fetchJson } from "../http.js";

/**
 * Straight-line distance from a reader-placed pin to the nearest feature of a few kinds
 * (docs/adr/0006).
 *
 * This is context, not evidence. It produces no `Observation` and no `EvidenceLink`, it cannot
 * move a validation status or an output scope, and it is labelled on screen as OpenStreetMap
 * data. ADR 0006 records why that distinction lets it ship without an evidence-activation gate,
 * and that the gate applies in full the day a distance is allowed to inform a rule.
 *
 * Two measurement decisions matter more than they look.
 *
 * Distance is computed against a way's actual geometry, segment by segment, not against the
 * centroid Overpass returns with `out center`. A road is a line: its centroid can sit a long way
 * from the part of it that runs past this pin, and "ถนนสุขุมวิท 800 ม." when it is 40 m away is
 * a precise-looking number that is simply wrong.
 *
 * And it is straight-line distance, said so on screen. A school 150 m away across a motorway is
 * not 150 m away on foot, and this product does not have routing to tell the difference.
 */

/** Overpass mirrors vary; this is the main endpoint, and the only host this adapter calls. */
export const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export const PROXIMITY_SOURCE_ID = "osm.proximity";

/** What a reader standing on a plot actually asks about. Kept short on purpose. */
export type ProximityCategory =
  | "MAIN_ROAD"
  | "SCHOOL"
  | "HOSPITAL"
  | "CONVENIENCE"
  | "RAIL_STATION";

export interface ProximityFeature {
  readonly category: ProximityCategory;
  /** Straight-line metres from the pin, rounded to the metre. */
  readonly metres: number;
  /** As OSM records it. Null when the feature carries no name, which is common and not an error. */
  readonly name: string | null;
}

export type ProximityResult =
  | {
      readonly outcome: "SUCCESS";
      readonly features: readonly ProximityFeature[];
      /**
       * How far out the query looked, so "nothing found" reads as "none within this" rather than
       * as "none anywhere". Reported separately because roads are searched closer than the rest,
       * and one combined figure would overstate how far the road search actually went.
       */
      readonly road_radius_metres: number;
      readonly poi_radius_metres: number;
      readonly attribution_th: string;
    }
  | { readonly outcome: "FAILED"; readonly reason: string; readonly retryable: boolean };

/** ODbL requires attribution wherever the data appears. */
export const OSM_ATTRIBUTION_TH = "ข้อมูลจาก OpenStreetMap เผยแพร่ภายใต้สัญญาอนุญาต ODbL";

/**
 * Two radii, because roads and destinations are different questions — and because one radius made
 * the query too expensive to answer.
 *
 * Roads are dense and are lines, so they need full geometry; asking for it across two kilometres
 * returned every vertex of every road in the neighbourhood and drew repeated HTTP 504s from
 * Overpass with quota to spare. Six hundred metres is past any distance at which "the nearest main
 * road" is still an interesting answer. Destinations are sparse, so they can be searched further
 * out, and they are compact enough that a centroid is honest for them in a way it is not for a
 * road.
 */
export const ROAD_RADIUS_METRES = 600;
export const POI_RADIUS_METRES = 1_500;

/**
 * One request, in two parts. Overpass is the least reliable thing this product talks to
 * (ADR 0004 recorded repeated 504s), so the design asks it for as little as it can.
 *
 * `out geom` for roads, `out center` for the rest. A road's centroid can sit hundreds of metres
 * from the stretch running past the pin — on the แสนสุข fixture, 134 m against 17 m — so roads are
 * measured segment by segment. A school or a market is small enough that its centre is within a
 * few metres of its edge, and asking for the outline of every building would put the cost straight
 * back.
 */
export function buildQuery(
  lat: number,
  lon: number,
  roadRadius = ROAD_RADIUS_METRES,
  poiRadius = POI_RADIUS_METRES,
): string {
  const near = `${poiRadius},${lat},${lon}`;
  return [
    "[out:json][timeout:25];",
    `way(around:${roadRadius},${lat},${lon})[highway~"^(motorway|trunk|primary|secondary|tertiary)$"];`,
    "out geom tags 40;",
    "(",
    `node(around:${near})[amenity=school];`,
    `way(around:${near})[amenity=school];`,
    `node(around:${near})[amenity~"^(hospital|clinic)$"];`,
    `way(around:${near})[amenity~"^(hospital|clinic)$"];`,
    `node(around:${near})[shop~"^(convenience|supermarket)$"];`,
    `node(around:${near})[amenity=marketplace];`,
    `node(around:${near})[railway=station];`,
    ");",
    "out center tags 120;",
  ].join("");
}

interface OverpassPoint {
  readonly lat: number;
  readonly lon: number;
}

interface OverpassElement {
  readonly type?: string;
  readonly lat?: number;
  readonly lon?: number;
  readonly geometry?: readonly OverpassPoint[];
  readonly center?: OverpassPoint;
  readonly tags?: Record<string, string>;
}

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/**
 * Metres per degree at this latitude, for a local flat-earth projection.
 *
 * Over a two-kilometre radius the curvature error is far below the metre this rounds to, and a
 * planar projection is what makes point-to-segment distance tractable at all.
 */
function projector(lat: number) {
  const metresPerDegLat = EARTH_RADIUS_M * DEG;
  const metresPerDegLon = metresPerDegLat * Math.cos(lat * DEG);
  return (point: OverpassPoint) => ({
    x: (point.lon - 0) * metresPerDegLon,
    y: (point.lat - 0) * metresPerDegLat,
  });
}

/** Shortest distance from p to the segment ab, in the projected plane. */
function pointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  // How far along ab the closest point lies, clamped so it stays on the segment.
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The nearest point of an element to the pin: its own point, or the nearest part of its line. */
function distanceMetres(element: OverpassElement, lat: number, lon: number): number | null {
  const project = projector(lat);
  const pin = project({ lat, lon });

  const geometry = element.geometry;
  if (geometry && geometry.length > 0) {
    if (geometry.length === 1) {
      const only = geometry[0];
      return only ? Math.hypot(...offset(project(only), pin)) : null;
    }
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < geometry.length - 1; i += 1) {
      const a = geometry[i];
      const b = geometry[i + 1];
      if (!a || !b) continue;
      nearest = Math.min(nearest, pointToSegment(pin, project(a), project(b)));
    }
    return Number.isFinite(nearest) ? nearest : null;
  }

  const point =
    element.lat !== undefined && element.lon !== undefined
      ? { lat: element.lat, lon: element.lon }
      : element.center;
  return point ? Math.hypot(...offset(project(point), pin)) : null;
}

function offset(a: { x: number; y: number }, b: { x: number; y: number }): [number, number] {
  return [a.x - b.x, a.y - b.y];
}

/** Which of the asked-about kinds this element is, or null if it is none of them. */
export function categorise(tags: Record<string, string>): ProximityCategory | null {
  if (tags.amenity === "school") return "SCHOOL";
  if (tags.amenity === "hospital" || tags.amenity === "clinic") return "HOSPITAL";
  if (tags.railway === "station") return "RAIL_STATION";
  if (tags.shop === "convenience" || tags.shop === "supermarket") return "CONVENIENCE";
  if (tags.amenity === "marketplace") return "CONVENIENCE";
  if (tags.highway) return "MAIN_ROAD";
  return null;
}

/** The nearest of each kind, from a raw Overpass payload. Exported so tests can skip the network. */
export function nearestByCategory(
  payload: unknown,
  lat: number,
  lon: number,
): readonly ProximityFeature[] {
  const elements = (payload as { elements?: readonly OverpassElement[] } | null)?.elements ?? [];
  const best = new Map<ProximityCategory, ProximityFeature>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const category = categorise(tags);
    if (!category) continue;
    const metres = distanceMetres(element, lat, lon);
    if (metres === null || !Number.isFinite(metres)) continue;

    const current = best.get(category);
    if (current && current.metres <= metres) continue;
    best.set(category, {
      category,
      metres: Math.round(metres),
      // An unnamed feature is still a real feature; only its name is missing.
      name: tags["name:th"] ?? tags.name ?? null,
    });
  }

  return [...best.values()].sort((a, b) => a.metres - b.metres);
}

export async function fetchProximity(
  lat: number,
  lon: number,
  options: FetchJsonOptions = {},
): Promise<ProximityResult> {
  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(buildQuery(lat, lon))}`;
  const response: FetchJsonResult = await fetchJson(url, { timeoutMs: 30_000, ...options });

  if (response.outcome !== "SUCCESS") {
    // Surfaced, never swallowed and never estimated around: ADR 0006 makes a failed lookup a
    // first-class outcome precisely because this endpoint is known to be unreliable.
    return { outcome: "FAILED", reason: response.reason, retryable: response.retryable };
  }

  return {
    outcome: "SUCCESS",
    features: nearestByCategory(response.payload, lat, lon),
    road_radius_metres: ROAD_RADIUS_METRES,
    poi_radius_metres: POI_RADIUS_METRES,
    attribution_th: OSM_ATTRIBUTION_TH,
  };
}
