import { describe, expect, it } from "vitest";
import { describeParcelLayer, findDptParcel, parseDptMapSheet } from "./parcels.js";

/**
 * Fixtures are the shapes DPT's own services returned on 2026-10-07, trimmed to what the parsers
 * read. The three schema families are all represented, because they are the reason this adapter
 * reads a layer's metadata instead of assuming a column layout.
 */

/** ภูเก็ต: the common shape — parcels on layer 0, every column named as expected. */
const PHUKET_SERVICE = JSON.stringify({
  layers: [
    { id: 0, name: "PARCEL83" },
    { id: 1, name: "PLLU83" },
  ],
});

const PHUKET_LAYER = JSON.stringify({
  fields: [
    { name: "UTMMAP1", type: "esriFieldTypeString" },
    { name: "UTMMAP2", type: "esriFieldTypeInteger" },
    { name: "UTMMAP3", type: "esriFieldTypeString" },
    { name: "UTMMAP4", type: "esriFieldTypeString" },
    { name: "LAND_NO", type: "esriFieldTypeString" },
    { name: "AREA", type: "esriFieldTypeDouble" },
    { name: "TAM_NME", type: "esriFieldTypeString" },
    { name: "APM_NME", type: "esriFieldTypeString" },
    { name: "PRO_NME", type: "esriFieldTypeString" },
  ],
});

const PHUKET_PARCEL = JSON.stringify({
  features: [
    {
      attributes: {
        LAND_NO: "239",
        AREA: 144.016511,
        TAM_NME: "เทพกระษัตรี",
        APM_NME: "ถลาง",
        PRO_NME: "ภูเก็ต",
      },
      geometry: {
        rings: [
          [
            [98.325, 8.048],
            [98.3252, 8.048],
            [98.3252, 8.0482],
            [98.325, 8.0482],
            [98.325, 8.048],
          ],
        ],
      },
    },
  ],
});

/** ปัตตานี: เลขที่ดิน is an integer, and the names use DPT's other spelling. */
const PATTANI_LAYER = JSON.stringify({
  fields: [
    { name: "UTMMAP1", type: "esriFieldTypeString" },
    { name: "UTMMAP2", type: "esriFieldTypeInteger" },
    { name: "UTMMAP3", type: "esriFieldTypeString" },
    { name: "UTMMAP4", type: "esriFieldTypeString" },
    { name: "LAND_NO", type: "esriFieldTypeInteger" },
    { name: "PROV_NAME", type: "esriFieldTypeString" },
    { name: "APDOL_NAME", type: "esriFieldTypeString" },
    { name: "TBDOL_NAME", type: "esriFieldTypeString" },
  ],
});

function stubFetch(routes: Record<string, { body: string; status?: number }>): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    for (const [fragment, response] of Object.entries(routes)) {
      if (url.includes(fragment)) {
        return new Response(response.body, { status: response.status ?? 200 });
      }
    }
    return new Response(JSON.stringify({ unrouted: url }), { status: 404 });
  }) as typeof fetch;
}

const PHUKET_LAYER_PROFILE = {
  layer_id: 0,
  land_field: "LAND_NO",
  land_quoted: true,
  map2_quoted: false,
  area_field: "AREA",
  province_field: "PRO_NME",
  district_field: "APM_NME",
  subdistrict_field: "TAM_NME",
};

describe("parseDptMapSheet", () => {
  it("accepts a ระวาง however the reader punctuates it", () => {
    const expected = { map1: "4625", map2: 2, map3: "2488", map4: "02" };
    expect(parseDptMapSheet("4625 II 2488-02")).toEqual(expected);
    expect(parseDptMapSheet(" 4625/ii/2488/02 ")).toEqual(expected);
    // The last part is padded: a deed printing "2" means subsheet 02.
    expect(parseDptMapSheet("4625 II 2488-2")).toEqual(expected);
  });

  it("refuses anything that is not a ระวาง", () => {
    expect(parseDptMapSheet("4625 II 2488")).toBeNull();
    expect(parseDptMapSheet("462 II 2488-02")).toBeNull();
    expect(parseDptMapSheet("4625 V 2488-02")).toBeNull();
    expect(parseDptMapSheet("")).toBeNull();
  });
});

describe("describeParcelLayer", () => {
  it("finds the parcel layer and reads how its columns are stored", async () => {
    const layer = await describeParcelLayer("83", {
      fetchImpl: stubFetch({
        "MapServer/0?f=json": { body: PHUKET_LAYER },
        MapServer: { body: PHUKET_SERVICE },
      }),
    });
    expect(layer).toEqual(PHUKET_LAYER_PROFILE);
  });

  it("notices when เลขที่ดิน is a number, because quoting one is rejected outright", async () => {
    // ปัตตานี answered "Failed to execute query" for every lookup until this was read rather than
    // assumed. An integer column needs LAND_NO=239, not LAND_NO='239'.
    const layer = await describeParcelLayer("94", {
      fetchImpl: stubFetch({
        "MapServer/4?f=json": { body: PATTANI_LAYER },
        MapServer: { body: JSON.stringify({ layers: [{ id: 4, name: "PARCEL94" }] }) },
      }),
    });
    expect(layer?.land_quoted).toBe(false);
    expect(layer?.province_field).toBe("PROV_NAME");
    expect(layer?.subdistrict_field).toBe("TBDOL_NAME");
    // No AREA column at all: the department publishes none here, so none is reported.
    expect(layer?.area_field).toBeNull();
  });

  it("reads the department's other spelling of the column", async () => {
    // นครนายก spells it land_no. Every other province spells it LAND_NO.
    const layer = await describeParcelLayer("38", {
      fetchImpl: stubFetch({
        "MapServer/0?f=json": {
          body: JSON.stringify({
            fields: [
              { name: "UTMMAP1", type: "esriFieldTypeString" },
              { name: "UTMMAP2", type: "esriFieldTypeInteger" },
              { name: "UTMMAP3", type: "esriFieldTypeString" },
              { name: "UTMMAP4", type: "esriFieldTypeString" },
              { name: "land_no", type: "esriFieldTypeString" },
            ],
          }),
        },
        MapServer: { body: JSON.stringify({ layers: [{ id: 0, name: "PARCEL38" }] }) },
      }),
    });
    expect(layer?.land_field).toBe("land_no");
  });

  it("reports a province with no parcel layer as unsearchable", async () => {
    const layer = await describeParcelLayer("20", {
      fetchImpl: stubFetch({
        MapServer: { body: JSON.stringify({ layers: [{ id: 0, name: "PLLU20" }] }) },
      }),
    });
    expect(layer).toBeNull();
  });

  it("reports a parcel layer with no ระวาง columns as unsearchable", async () => {
    // ร้อยเอ็ด, นครพนม, อุตรดิตถ์, แพร่ and พิจิตร publish the polygons without UTMMAP, so a ระวาง cannot
    // address them. Listing them and then failing every lookup would read as a broken app.
    const layer = await describeParcelLayer("23", {
      fetchImpl: stubFetch({
        "MapServer/4?f=json": {
          body: JSON.stringify({
            fields: [
              { name: "LAND_NO", type: "esriFieldTypeString" },
              { name: "AREA", type: "esriFieldTypeDouble" },
              { name: "TAM_NME", type: "esriFieldTypeString" },
            ],
          }),
        },
        MapServer: { body: JSON.stringify({ layers: [{ id: 4, name: "PARCEL23" }] }) },
      }),
    });
    expect(layer).toBeNull();
  });
});

describe("findDptParcel", () => {
  it("returns where the parcel is, how big, and a pin", async () => {
    const result = await findDptParcel("83", "4625 II 2488-02", "239", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({ query: { body: PHUKET_PARCEL } }),
    });
    expect(result.outcome).toBe("FOUND");
    if (result.outcome !== "FOUND") return;
    expect(result.parcel.province_name_th).toBe("ภูเก็ต");
    expect(result.parcel.district_name_th).toBe("ถลาง");
    expect(result.parcel.subdistrict_name_th).toBe("เทพกระษัตรี");
    expect(result.parcel.area_sqm).toBeCloseTo(144.0165, 3);
    expect(result.parcel.latitude).toBeCloseTo(8.0481, 3);
    expect(result.parcel.longitude).toBeCloseTo(98.3251, 3);
    expect(result.parcel.match_count).toBe(1);
  });

  it("quotes each column the way its own type requires", async () => {
    const seen: string[] = [];
    const capture = (async (input: Parameters<typeof fetch>[0]) => {
      seen.push(String(input));
      return new Response(PHUKET_PARCEL, { status: 200 });
    }) as typeof fetch;

    await findDptParcel("83", "4625 II 2488-02", "239", PHUKET_LAYER_PROFILE, {
      fetchImpl: capture,
    });
    expect(decodeURIComponent(seen[0] ?? "")).toContain("LAND_NO='239'");
    expect(decodeURIComponent(seen[0] ?? "")).toContain("UTMMAP2=2");

    seen.length = 0;
    await findDptParcel(
      "94",
      "5322 III 8000-00",
      "239",
      { ...PHUKET_LAYER_PROFILE, layer_id: 4, land_quoted: false, area_field: null },
      { fetchImpl: capture },
    );
    expect(decodeURIComponent(seen[0] ?? "")).toContain("LAND_NO=239");
  });

  it("never lets a reader's text reach the service as syntax", async () => {
    const seen: string[] = [];
    const capture = (async (input: Parameters<typeof fetch>[0]) => {
      seen.push(String(input));
      return new Response(PHUKET_PARCEL, { status: 200 });
    }) as typeof fetch;

    const result = await findDptParcel(
      "83",
      "4625 II 2488-02",
      "1' OR LAND_NO>'0",
      PHUKET_LAYER_PROFILE,
      { fetchImpl: capture },
    );
    // Refused before a request is made at all, not escaped on the way out.
    expect(result.outcome).toBe("NOT_FOUND");
    expect(seen).toHaveLength(0);
  });

  it("tells the reader when one number matches several polygons", async () => {
    // เชียงใหม่ repeats a เลขที่ดิน across split polygons. Showing the first of two as the holding
    // would under-report the area without saying so.
    const result = await findDptParcel("50", "4846 IV 2480-00", "114", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({
        query: {
          body: JSON.stringify({
            features: [
              JSON.parse(PHUKET_PARCEL).features[0],
              JSON.parse(PHUKET_PARCEL).features[0],
            ],
          }),
        },
      }),
    });
    if (result.outcome !== "FOUND") throw new Error("expected a hit");
    expect(result.parcel.match_count).toBe(2);
  });

  it("drops the import placeholders the department left in the name columns", async () => {
    // นครราชสีมา fills every ตำบล with "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน" and every
    // province with "ไม่มีจังหวัด". Printed under ที่ตั้ง, that reads as an answer.
    const result = await findDptParcel("30", "5439 IV 9690-00", "260", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({
        query: {
          body: JSON.stringify({
            features: [
              {
                attributes: {
                  AREA: 6198.77,
                  TAM_NME: "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน",
                  APM_NME: "เพื่อการนำเข้าข้อมูลจากระบบงานเดิมของกรมที่ดิน",
                  PRO_NME: "ไม่มีจังหวัด",
                },
                geometry: {
                  rings: [
                    [
                      [102.1795, 15.2843],
                      [102.18, 15.2843],
                      [102.18, 15.285],
                    ],
                  ],
                },
              },
            ],
          }),
        },
      }),
    });
    if (result.outcome !== "FOUND") throw new Error("expected a hit");
    expect(result.parcel.province_name_th).toBeNull();
    expect(result.parcel.subdistrict_name_th).toBeNull();
    // The area is the department's own and stays.
    expect(result.parcel.area_sqm).toBeCloseTo(6198.77, 2);
  });

  it("offers no pin when the outline is not in Thailand", async () => {
    const result = await findDptParcel("83", "4625 II 2488-02", "239", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({
        query: {
          body: JSON.stringify({
            features: [
              {
                attributes: { AREA: 100 },
                geometry: {
                  rings: [
                    [
                      [0, 0],
                      [0, 1],
                      [1, 1],
                    ],
                  ],
                },
              },
            ],
          }),
        },
      }),
    });
    if (result.outcome !== "FOUND") throw new Error("expected a hit");
    expect(result.parcel.latitude).toBeNull();
    expect(result.parcel.area_sqm).toBe(100);
  });

  it("separates a stopped service from a number that is simply not there", async () => {
    const stopped = await findDptParcel("83", "4625 II 2488-02", "239", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({
        query: {
          body: JSON.stringify({
            error: { code: 500, message: "Could not find service. Service may be stopped." },
          }),
        },
      }),
    });
    expect(stopped.outcome).toBe("OUTSIDE_COVERAGE");

    const empty = await findDptParcel("83", "4625 II 2488-02", "999999", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({ query: { body: JSON.stringify({ features: [] }) } }),
    });
    expect(empty.outcome).toBe("NOT_FOUND");
  });

  it("reports a transport failure as retryable rather than as no such parcel", async () => {
    const result = await findDptParcel("83", "4625 II 2488-02", "239", PHUKET_LAYER_PROFILE, {
      fetchImpl: stubFetch({ query: { body: "", status: 503 } }),
    });
    expect(result.outcome).toBe("FAILED");
    if (result.outcome !== "FAILED") return;
    expect(result.retryable).toBe(true);
  });
});
