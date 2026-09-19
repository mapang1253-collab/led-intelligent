import { describe, expect, it } from "vitest";
import { buildQuery, categorise, fetchProximity, nearestByCategory } from "./proximity.js";

/**
 * The measurement, tested without the network.
 *
 * The case that shaped this file is a long road. Overpass's `out center` would put ถนนสุขุมวิท at
 * the middle of whatever stretch came back, which can be a kilometre from the part running past
 * the pin. Measuring against the geometry is the difference between a number and a wrong number.
 */

const PIN = { lat: 13.2828932, lon: 100.9367915 };

/** One degree of latitude is ~111.2 km; 0.001° is ~111 m. Used to build known distances. */
const DEG_PER_100M = 0.000899;

describe("nearestByCategory", () => {
  it("measures a road at its nearest segment, not at its midpoint", () => {
    // A north-south road passing ~100 m east of the pin, running far away in both directions.
    // Its midpoint is at the pin's latitude; its endpoints are kilometres off.
    const payload = {
      elements: [
        {
          type: "way",
          tags: { highway: "primary", name: "ถนนสุขุมวิท" },
          geometry: [
            { lat: PIN.lat - 0.02, lon: PIN.lon + DEG_PER_100M },
            { lat: PIN.lat + 0.02, lon: PIN.lon + DEG_PER_100M },
          ],
        },
      ],
    };
    const [road] = nearestByCategory(payload, PIN.lat, PIN.lon);
    expect(road?.name).toBe("ถนนสุขุมวิท");
    // ~100 m, not the ~2.2 km an endpoint would give.
    expect(road?.metres).toBeGreaterThan(90);
    expect(road?.metres).toBeLessThan(110);
  });

  it("keeps only the nearest feature of each kind", () => {
    const school = (lonOffset: number, name: string) => ({
      type: "node",
      lat: PIN.lat,
      lon: PIN.lon + lonOffset,
      tags: { amenity: "school", name },
    });
    const features = nearestByCategory(
      { elements: [school(DEG_PER_100M * 5, "ไกล"), school(DEG_PER_100M, "ใกล้")] },
      PIN.lat,
      PIN.lon,
    );
    expect(features).toHaveLength(1);
    expect(features[0]?.name).toBe("ใกล้");
  });

  it("returns the kinds sorted by distance", () => {
    const at = (lonOffset: number, tags: Record<string, string>) => ({
      type: "node",
      lat: PIN.lat,
      lon: PIN.lon + lonOffset,
      tags,
    });
    const features = nearestByCategory(
      {
        elements: [
          at(DEG_PER_100M * 9, { amenity: "hospital" }),
          at(DEG_PER_100M * 2, { shop: "convenience" }),
          at(DEG_PER_100M * 5, { amenity: "school" }),
        ],
      },
      PIN.lat,
      PIN.lon,
    );
    expect(features.map((f) => f.category)).toEqual(["CONVENIENCE", "SCHOOL", "HOSPITAL"]);
  });

  it("prefers the Thai name and keeps an unnamed feature", () => {
    const payload = {
      elements: [
        {
          type: "node",
          lat: PIN.lat,
          lon: PIN.lon + DEG_PER_100M,
          tags: { amenity: "school", name: "Lan Le Saksa School", "name:th": "โรงเรียนลานเลศักษา" },
        },
        { type: "node", lat: PIN.lat, lon: PIN.lon + DEG_PER_100M, tags: { railway: "station" } },
      ],
    };
    const features = nearestByCategory(payload, PIN.lat, PIN.lon);
    expect(features.find((f) => f.category === "SCHOOL")?.name).toBe("โรงเรียนลานเลศักษา");
    // Null, not "(ไม่มีชื่อ)": naming is the display layer's job, and an absent name is a fact.
    expect(features.find((f) => f.category === "RAIL_STATION")?.name).toBeNull();
  });

  it("ignores elements it was not asked about, and ones with no position", () => {
    const payload = {
      elements: [
        { type: "node", lat: PIN.lat, lon: PIN.lon, tags: { amenity: "bench" } },
        { type: "way", tags: { amenity: "school", name: "ไม่มีพิกัด" } },
      ],
    };
    expect(nearestByCategory(payload, PIN.lat, PIN.lon)).toEqual([]);
  });

  it("survives an empty or malformed payload rather than throwing", () => {
    expect(nearestByCategory({ elements: [] }, PIN.lat, PIN.lon)).toEqual([]);
    expect(nearestByCategory(null, PIN.lat, PIN.lon)).toEqual([]);
    expect(nearestByCategory({}, PIN.lat, PIN.lon)).toEqual([]);
  });
});

describe("categorise", () => {
  it("reads a marketplace as somewhere to buy things", () => {
    expect(categorise({ amenity: "marketplace" })).toBe("CONVENIENCE");
    expect(categorise({ shop: "supermarket" })).toBe("CONVENIENCE");
  });

  it("does not let a road tag outrank a more specific one", () => {
    // A school whose way also carries a highway tag is a school.
    expect(categorise({ amenity: "school", highway: "service" })).toBe("SCHOOL");
  });
});

describe("buildQuery", () => {
  it("asks for road geometry and destination centres, in one request", () => {
    const query = buildQuery(PIN.lat, PIN.lon);
    expect(query).toContain(`${PIN.lat},${PIN.lon}`);
    // Roads are lines and get full geometry; a road's centroid is not where the road runs.
    expect(query).toContain("out geom");
    // Destinations are compact, and asking for every building outline is what made the query
    // expensive enough that Overpass returned 504s with quota to spare.
    expect(query).toContain("out center");
    expect(query.match(/\[out:json/g)).toHaveLength(1);
  });

  it("searches roads closer than destinations", () => {
    const query = buildQuery(PIN.lat, PIN.lon, 600, 1500);
    expect(query).toContain(`way(around:600,${PIN.lat},${PIN.lon})[highway`);
    expect(query).toContain(`node(around:1500,${PIN.lat},${PIN.lon})[amenity=school]`);
  });
});

describe("fetchProximity", () => {
  it("reports a failed lookup instead of an empty result", async () => {
    // Overpass is known-unreliable (ADR 0004 recorded 504s). "No features nearby" and "the
    // service did not answer" must never render as the same screen.
    const result = await fetchProximity(PIN.lat, PIN.lon, {
      fetchImpl: async () => new Response("upstream busy", { status: 504 }),
    });
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.retryable).toBe(true);
    }
  });

  it("carries the ODbL attribution with a successful answer", async () => {
    const payload = {
      elements: [
        {
          type: "node",
          lat: PIN.lat,
          lon: PIN.lon + DEG_PER_100M,
          tags: { amenity: "school", name: "โรงเรียน" },
        },
      ],
    };
    const result = await fetchProximity(PIN.lat, PIN.lon, {
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });
    expect(result.outcome).toBe("SUCCESS");
    if (result.outcome === "SUCCESS") {
      expect(result.attribution_th).toContain("OpenStreetMap");
      expect(result.features[0]?.category).toBe("SCHOOL");
    }
  });
});
