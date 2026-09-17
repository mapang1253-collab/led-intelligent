#!/usr/bin/env node
/**
 * Latency benchmark against the gates in docs/performance-and-reliability.md §7.
 *
 * What this replaces mattered: `pnpm benchmark` used to print "not implemented yet" and exit 0.
 * A command that reports success without measuring anything is worse than one that fails, because
 * anyone running it — an examiner, or us in six months — reads a pass and believes the latency
 * gates hold. §7 is explicit that "a target becomes a supported claim only after its benchmark
 * passes", so a fake pass manufactures unsupported claims.
 *
 * Three targets are measured end to end against a running deployment. The rest of §7 is listed
 * as not measured rather than quietly dropped: an unmeasured target and a passing one must never
 * look alike in this output.
 *
 * Runs are created for real, because that is the only way to time one. They are anonymous and
 * expire 24 hours after creation like any other, so the cost of benchmarking is a handful of rows
 * that delete themselves. Against a deployment the script says so before it starts.
 */

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]?.replace(/^--/, "");
  if (key) {
    args.set(key, process.argv[i + 1]);
  }
}

const baseUrl = (args.get("base-url") ?? "http://localhost:5173").replace(/\/$/, "");
const samples = Number(args.get("samples") ?? 12);
const runCount = Number(args.get("runs") ?? 5);
const origin = new URL(baseUrl).origin;

/**
 * §7, verbatim thresholds. `full` marks a row where what is measured is the target itself rather
 * than a necessary condition for it.
 */
const GATES = {
  acknowledgement: { label: "ตอบรับคำสั่งวิเคราะห์", p95: 1_000, full: true },
  firstProgress: { label: "สถานะความคืบหน้าแรกที่เป็นจริง", p95: 2_000, full: true },
  endToEnd: { label: "วิเคราะห์จนจบ (ข้อมูลพร้อมแล้ว)", p95: 30_000, full: true },
  deadline: { label: "เพดานเวลาต่อหนึ่ง run", p95: 60_000, full: true },
  shellDelivery: { label: "ส่งไฟล์หน้าเว็บครบ", p95: 2_500, full: false },
};

/** §7 asks for p50/p95/p99, so all three are reported even where only p95 is a gate. */
function percentile(sorted, p) {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function summarise(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted.at(-1) ?? Number.NaN,
  };
}

const ms = (value) => (Number.isFinite(value) ? `${Math.round(value)}` : "—");

/** The API rejects a POST without a matching Origin (docs/security-privacy-compliance.md §3). */
function headers(cookie) {
  const base = { "Content-Type": "application/json", Origin: origin };
  return cookie ? { ...base, Cookie: cookie } : base;
}

async function wellDocumentedArea() {
  const response = await fetch(`${baseUrl}/api/v1/administrative-areas/well-documented`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`well-documented failed: ${response.status}`);
  }
  const body = await response.json();
  const area = body.data?.[0];
  if (!area) {
    throw new Error("no well-documented area to benchmark with");
  }
  return area;
}

/**
 * Creates one run and returns how long the acknowledgement took, plus its capability cookie.
 *
 * A rejection is returned, not thrown. A benchmark that dies on the first failure destroys its own
 * finding: "it failed once out of twelve" and "it failed twelve times out of twelve" are different
 * facts about a system, and only one of them can be learned by continuing.
 */
async function createRun(area) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/v1/analysis-runs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      province_id: area.province_id,
      district_id: area.district_id,
      subdistrict_id: area.subdistrict_id,
    }),
  });
  const elapsed = performance.now() - started;
  if (!response.ok) {
    const text = await response.text();
    // Cloudflare serves its own HTML for platform-level refusals; the code inside it is the
    // diagnosis (1102 = Worker exceeded resource limits), so it is worth digging out.
    const cfCode = text.match(/error code: (\d+)/)?.[1];
    return { ok: false, elapsed, status: response.status, code: cfCode ?? String(response.status) };
  }
  const body = await response.json();
  // The capability is an HttpOnly cookie; a script has to carry it back by hand to read the run.
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { ok: true, elapsed, runId: body.run_id, state: body.run_state, cookie };
}

/** Reads a run. Refusals come back as data for the same reason createRun's do. */
async function readRun(runId, cookie) {
  const response = await fetch(`${baseUrl}/api/v1/analysis-runs/${runId}`, {
    headers: { Accept: "application/json", Origin: origin, Cookie: cookie },
  });
  if (!response.ok) {
    const text = await response.text();
    const cfCode = text.match(/error code: (\d+)/)?.[1];
    return { ok: false, code: cfCode ?? String(response.status) };
  }
  return { ok: true, envelope: await response.json() };
}

/** The real RunState union (packages/data-access). Earlier this held two states that do not exist. */
/** How long the end-to-end measurement will wait before calling a run unfinished. */
const POLL_CEILING_MS = 240_000;

const TERMINAL = new Set([
  "COMPLETE",
  "PARTIAL",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * Shell delivery: the document plus every script and stylesheet it references, fetched together
 * the way a browser would rather than one after another.
 *
 * This is a necessary condition for §7's "usable application shell", never the measure of it —
 * parse, hydrate and first paint all happen after the last byte lands, and the documented mobile
 * profile is a device and a network this script is not running on. It is reported for what it is.
 */
async function measureShellDelivery() {
  const started = performance.now();
  const response = await fetch(baseUrl, { headers: { Accept: "text/html" } });
  const html = await response.text();
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  await Promise.all(
    [...new Set(refs)].map((path) => fetch(`${baseUrl}${path}`).then((r) => r.arrayBuffer())),
  );
  return performance.now() - started;
}

console.log("เกณฑ์จาก docs/performance-and-reliability.md §7");
console.log(`เป้าหมายที่วัด  ${baseUrl}`);
if (!baseUrl.startsWith("http://localhost")) {
  console.log("หมายเหตุ  นี่คือระบบที่ให้บริการจริง การวัดจะสร้าง run จริงที่หมดอายุใน 24 ชม.");
}
console.log("");

const area = await wellDocumentedArea();
console.log(
  `พื้นที่ทดสอบ  ต.${area.subdistrict_name_th} อ.${area.district_name_th} จ.${area.province_name_th}` +
    `  (หลักฐานคอนโด ${area.condominium_figures} · ที่ดิน ${area.land_figures})`,
);
console.log("");

/** Rejections, counted by the code the platform gave, so a pattern is visible rather than a mood. */
const rejections = new Map();
let attempts = 0;

function recordRejection(refusal) {
  rejections.set(refusal.code, (rejections.get(refusal.code) ?? 0) + 1);
}

const ackTimes = [];
const progressTimes = [];
process.stdout.write(`วัดการตอบรับและสถานะแรก ${samples} ครั้ง `);
for (let i = 0; i < samples; i += 1) {
  attempts += 1;
  const created = await createRun(area);
  if (!created.ok) {
    recordRejection(created);
    process.stdout.write("x");
    continue;
  }
  ackTimes.push(created.elapsed);

  const progressStart = performance.now();
  const read = await readRun(created.runId, created.cookie);
  if (!read.ok) {
    recordRejection(read);
    process.stdout.write("r");
    continue;
  }
  // "Truthful" means a real stage state, not a fabricated percentage (§7).
  if (!read.envelope.run_state) {
    throw new Error("run envelope carried no state");
  }
  progressTimes.push(performance.now() - progressStart);
  process.stdout.write(".");
}
console.log(" เสร็จ");

const endToEnd = [];
process.stdout.write(`วัดเวลาวิเคราะห์จนจบ ${runCount} ครั้ง `);
for (let i = 0; i < runCount; i += 1) {
  const started = performance.now();
  attempts += 1;
  const created = await createRun(area);
  if (!created.ok) {
    recordRejection(created);
    process.stdout.write("x");
    continue;
  }
  let state = created.state;
  while (!TERMINAL.has(state)) {
    // Stops well past §7's 60-second deadline rather than at it. A measurement that gives up on
    // the threshold it is testing cannot tell "missed the gate by two seconds" from "never
    // finished at all", and on the deployed site the honest answer is the first of those.
    if (performance.now() - started > POLL_CEILING_MS) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    const read = await readRun(created.runId, created.cookie);
    if (!read.ok) {
      recordRejection(read);
      continue;
    }
    state = read.envelope.run_state;
  }
  endToEnd.push(performance.now() - started);
  process.stdout.write(".");
}
console.log(" เสร็จ");

const shell = [];
process.stdout.write("วัดการส่งไฟล์หน้าเว็บ 5 ครั้ง ");
for (let i = 0; i < 5; i += 1) {
  shell.push(await measureShellDelivery());
  process.stdout.write(".");
}
console.log(" เสร็จ\n");

const measured = [
  ["acknowledgement", summarise(ackTimes)],
  ["firstProgress", summarise(progressTimes)],
  ["endToEnd", summarise(endToEnd)],
  ["deadline", summarise(endToEnd)],
  ["shellDelivery", summarise(shell)],
];

console.log("เป้าหมายที่วัดได้จริง");
console.log(`  ${"รายการ".padEnd(34)}p50     p95     p99     เกณฑ์ p95   ผล`);
let failed = 0;
for (const [key, stats] of measured) {
  const gate = GATES[key];
  const pass = stats.p95 <= gate.p95;
  if (!pass) {
    failed += 1;
  }
  const verdict = pass ? (gate.full ? "ผ่าน" : "ผ่านเงื่อนไขจำเป็น") : "ไม่ผ่าน";
  console.log(
    `  ${gate.label.padEnd(32)}${ms(stats.p50).padStart(6)}  ${ms(stats.p95).padStart(6)}  ${ms(stats.p99).padStart(6)}  ${String(gate.p95).padStart(8)}   ${verdict}`,
  );
}
console.log(`  (หน่วยเป็นมิลลิวินาที · จำนวนตัวอย่าง ${ackTimes.length}/${endToEnd.length}/5)`);

console.log("\nสิ่งที่เครื่องมือนี้ยังไม่ได้วัด — ไม่ใช่ว่าผ่าน แต่คือยังไม่ได้วัด");
for (const line of [
  "หน้าเว็บพร้อมใช้งานบนโปรไฟล์มือถือตามเอกสาร — ต้องวัดบนอุปกรณ์และเครือข่ายจริง ที่นี่วัดได้แค่เวลาส่งไฟล์",
  "เพดาน 20 วินาทีต่อการเรียก Gemini หนึ่งครั้ง — เห็นได้เฉพาะตอน AI_MODE=LIVE_AI (ดู pnpm ai:budget)",
  "พฤติกรรมเมื่อมีผู้ใช้พร้อมกันหลายคน และการ load-test คิวรีเชิงพื้นที่ที่ขนาดจริง",
  "การกู้คืนของ Workflow เมื่อแหล่งข้อมูลล่ม และเมื่อโมเดลตอบช้าเกินกำหนด",
  "การแยกวัด cold กับ warm ตามชนิดของเป้าหมาย (พื้นที่ / จุด / แปลง) และตามจำนวนแนวคิด",
]) {
  console.log(`  · ${line}`);
}

const rejected = [...rejections.values()].reduce((sum, n) => sum + n, 0);
if (rejected > 0) {
  console.log("\nคำขอที่ถูกปฏิเสธระหว่างวัด");
  for (const [code, n] of rejections) {
    const note = code === "1102" ? "  (Cloudflare: Worker ใช้ทรัพยากรเกินกำหนด)" : "";
    console.log(`  · รหัส ${code}  ${n} จาก ${attempts} ครั้ง${note}`);
  }
  console.log("  การปฏิเสธนับเป็นความล้มเหลว ไม่ใช่ตัวอย่างที่หายไป — ตัวเลขด้านบนวัดเฉพาะครั้งที่ระบบยอมรับ");
}

if (failed > 0 || rejected > 0) {
  console.log(`\nไม่ผ่าน ${failed} รายการ · ถูกปฏิเสธ ${rejected} จาก ${attempts} คำขอ`);
  process.exit(1);
}
console.log("\nผ่านทุกรายการที่วัด");
