import { describe, expect, it } from "vitest";
import { extractConditionText, fetchZoning, toHexColour, zoningTileTemplate } from "./zoning.js";

/**
 * Fixtures are the bytes the two DPT services returned for ต.หนองปรือ อ.บางละมุง จ.ชลบุรี
 * (12.9276, 100.8909) on 2026-09-26, trimmed to the shape the parsers read.
 */

const IDENTIFY = JSON.stringify({
  results: [
    {
      layerId: 0,
      layerName: "PLLU_2099000",
      value: "4",
      attributes: {
        PL_DESC: "ที่ดินประเภทศูนย์กลางพาณิชยกรรม",
        PL_BLOCK: "พ.-4",
        PL_USE: "2100",
        CB_ID: "2099000",
      },
    },
    // The same service carries planned roads. They are a different question, and a road drawn on
    // the zoning panel as if it were a land-use zone would be read as one.
    {
      layerId: 1,
      layerName: "PLRC_2099000",
      value: "ก",
      attributes: { RD_CODE: "ก" },
    },
  ],
});

const LAYER = JSON.stringify({
  name: "PLLU_2099000",
  drawingInfo: {
    renderer: {
      type: "uniqueValue",
      field1: "PL_USE",
      uniqueValueInfos: [
        { value: "2100", symbol: { color: [230, 0, 0, 255] } },
        { value: "6700", symbol: { color: [0, 0, 0, 0] } },
      ],
    },
  },
});

const PERMITTED = `<style>.ws6 {font-size: 8px;}</style>
<table><tr height=40 style='background-color:#30b950'><td><div align=center style='font-family: Prompt; font-size: 13px;'>ข้อกำหนดการใช้ประโยชน์ที่ดิน</div></td></tr>
<tr height=100%><td><div style='font-family: Prompt; font-size: 12px;margin-left: 20px;'>ให้ใช้ประโยชน์ที่ดินเพื่อพาณิชยกรรม การอยู่อาศัย สถาบันราชการ สาธารณูปโภค สาธารณูปการ และกิจการอื่น</div></td></tr></table>`;

const PROHIBITED = `<style>.ws6 {font-size: 8px;}</style>
<table><tr><td><div align=center style='font-family: Prompt; font-size: 13px;'>ข้อห้ามการใช้ประโยชน์ที่ดิน</div></td></tr>
<tr height=100%><td><div style='font-family: Prompt; font-size: 12px;margin-left: 20px;'>(1) โรงงานตามกฎหมายว่าด้วยโรงงาน เว้นแต่โรงงานที่ประกอบกิจการเกี่ยวกับอุตสาหกรรมบริการ<br>
(2) คลังน้ำมันและสถานที่เก็บรักษาน้ำมัน ลักษณะที่สาม<br>
(3) เลี้ยงสัตว์ทุกชนิดเพื่อการค้าที่อาจก่อเหตุรำคาญ </div></td></tr></table>`;

/**
 * สระบุรี's town plans carry no PL_DESC — only the numeric code — so the name comes from the
 * plan's legend, where DPT pairs each zone with its swatch image named after that code.
 */
const SARABURI_IDENTIFY = JSON.stringify({
  results: [
    {
      layerId: 0,
      layerName: "PLLU_1901103",
      attributes: { PL_USE: "6300", PL_BLOCK: "12.28", CB_ID: "1901103" },
    },
  ],
});

const SARABURI_LEGEND = `<table>
<tr><td>สัญลักษณ์สี</td><td>ประเภท</td><td>ที่ดินหมายเลข</td></tr>
<tr><td><img src="https://plludds.dpt.go.th/pllu-non/cdn/assets/img/Usecode/6200.png"></td><td>สถาบันศาสนา</td><td>11.1 - 11.22</td></tr>
<tr><td><img src="https://plludds.dpt.go.th/pllu-non/cdn/assets/img/Usecode/6300.png"></td><td>สถาบันราชการ การสาธารณูปโภคและสาธารณูปการ</td><td>12.1 - 12.40</td></tr>
</table>`;

function stubFetch(routes: Record<string, { body: string; status?: number }>): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    for (const [fragment, response] of Object.entries(routes)) {
      if (url.includes(fragment)) {
        return new Response(response.body, { status: response.status ?? 200 });
      }
    }
    return new Response("not routed", { status: 404 });
  }) as typeof fetch;
}

const ROUTES = {
  identify: { body: IDENTIFY },
  "MapServer/0?f=json": { body: LAYER },
  "querydb_landuse.php": { body: PERMITTED },
  querydb_landuse_prohibition: { body: PROHIBITED },
};

describe("extractConditionText", () => {
  it("returns the regulation's words, not the template around them", () => {
    expect(extractConditionText(PERMITTED)).toEqual([
      "ให้ใช้ประโยชน์ที่ดินเพื่อพาณิชยกรรม การอยู่อาศัย สถาบันราชการ สาธารณูปโภค สาธารณูปการ และกิจการอื่น",
    ]);
  });

  it("keeps each numbered clause separate", () => {
    const items = extractConditionText(PROHIBITED);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatch(/^\(1\) โรงงานตามกฎหมาย/);
    expect(items[2]).toBe("(3) เลี้ยงสัตว์ทุกชนิดเพื่อการค้าที่อาจก่อเหตุรำคาญ");
  });

  it("returns nothing rather than stylesheet text when the template changes", () => {
    // Breaking loudly beats rendering ".ws6 {font-size: 8px;}" under "ข้อกำหนด".
    expect(extractConditionText("<style>.ws6 {font-size: 8px;}</style><p>อะไรสักอย่าง</p>")).toEqual(
      [],
    );
  });
});

describe("toHexColour", () => {
  it("converts the publisher's RGBA to a swatch", () => {
    expect(toHexColour([230, 0, 0, 255])).toBe("#e60000");
    expect(toHexColour([255, 211, 127, 255])).toBe("#ffd37f");
  });

  it("treats a fully transparent fill as no colour", () => {
    // เขตทหาร is drawn unfilled; a black swatch would invent a colour the plan does not use.
    expect(toHexColour([0, 0, 0, 0])).toBeNull();
    expect(toHexColour(undefined)).toBeNull();
  });
});

describe("fetchZoning", () => {
  it("returns the zone, its colour and the regulation's own text", async () => {
    const result = await fetchZoning("20", 12.9276, 100.8909, {
      fetchImpl: stubFetch(ROUTES),
    });

    expect(result.outcome).toBe("SUCCESS");
    if (result.outcome !== "SUCCESS") return;
    expect(result.plans).toHaveLength(1);

    const plan = result.plans[0];
    if (!plan) throw new Error("expected a plan");
    expect(plan.plan_id).toBe("2099000");
    expect(plan.zone_name_th).toBe("ที่ดินประเภทศูนย์กลางพาณิชยกรรม");
    expect(plan.block_th).toBe("พ.-4");
    expect(plan.colour).toBe("#e60000");
    expect(plan.permitted_th).toContain("พาณิชยกรรม");
    expect(plan.prohibited_th).toHaveLength(3);
  });

  it("ignores the planned-road layer in the same service", async () => {
    const result = await fetchZoning("20", 12.9276, 100.8909, { fetchImpl: stubFetch(ROUTES) });
    if (result.outcome !== "SUCCESS") throw new Error("expected success");
    expect(result.plans.every((plan) => plan.zone_name_th.startsWith("ที่ดินประเภท"))).toBe(true);
  });

  it("reports a province with no published plan as outside coverage, not as a failure", async () => {
    // ArcGIS answers a missing service with HTTP 200 and an error body.
    const result = await fetchZoning("12", 13.86, 100.51, {
      fetchImpl: stubFetch({
        identify: { body: JSON.stringify({ error: { code: 500, message: "Service not found " } }) },
      }),
    });
    expect(result.outcome).toBe("OUTSIDE_COVERAGE");
  });

  it("still returns the zone when the regulation text cannot be fetched", async () => {
    // The two services fail independently. Losing the text should not lose the zone name.
    const result = await fetchZoning("20", 12.9276, 100.8909, {
      fetchImpl: stubFetch({
        identify: { body: IDENTIFY },
        "MapServer/0?f=json": { body: LAYER },
        querydb: { body: "", status: 502 },
      }),
    });
    if (result.outcome !== "SUCCESS") throw new Error("expected success");
    const plan = result.plans[0];
    if (!plan) throw new Error("expected a plan");
    expect(plan.zone_name_th).toBe("ที่ดินประเภทศูนย์กลางพาณิชยกรรม");
    expect(plan.permitted_th).toBeNull();
    expect(plan.prohibited_th).toEqual([]);
  });

  it("names the zone from the plan's legend when the data carries no PL_DESC", async () => {
    // Without this the hit was dropped, and a reader whose land is inside a town plan was told
    // it was in none — the opposite of the truth.
    const result = await fetchZoning("19", 14.5289, 100.9101, {
      fetchImpl: stubFetch({
        identify: { body: SARABURI_IDENTIFY },
        get_legend_pllu: { body: SARABURI_LEGEND },
        "MapServer/0?f=json": { body: "{}" },
        querydb: { body: "", status: 502 },
      }),
    });
    if (result.outcome !== "SUCCESS") throw new Error("expected success");
    expect(result.plans[0]?.zone_name_th).toBe("สถาบันราชการ การสาธารณูปโภคและสาธารณูปการ");
    expect(result.plans[0]?.block_th).toBe("12.28");
  });

  it("reads a stopped service as outside coverage, in DPT's own wording", async () => {
    // นนทบุรี answers "Could not find service", which an earlier test's "not found" did not match.
    const result = await fetchZoning("12", 13.8621, 100.5144, {
      fetchImpl: stubFetch({
        identify: {
          body: JSON.stringify({
            error: {
              code: 500,
              message:
                "Error handling service request :Could not find service. Service may be stopped or it may not be configured.",
            },
          }),
        },
      }),
    });
    expect(result.outcome).toBe("OUTSIDE_COVERAGE");
  });

  it("refuses a province code that is not two digits", async () => {
    const result = await fetchZoning("2", 12.9, 100.8, { fetchImpl: stubFetch({}) });
    expect(result.outcome).toBe("FAILED");
    expect(zoningTileTemplate("2")).toBeNull();
    expect(zoningTileTemplate("20")).toContain("PLLU20");
  });
});
