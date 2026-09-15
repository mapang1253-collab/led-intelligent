import { useState } from "react";

/**
 * Living preview of the design tokens, used to agree the visual language before the real screens
 * are built. It renders the patterns that carry analytical meaning — status, evidence provenance,
 * the mandatory academic disclaimer — because those are the ones whose design is constrained by
 * docs/output-policy.md, not a matter of taste.
 */

type Status = "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN";

const STATUS_STYLE: Record<Status, { label: string; icon: string; fg: string; bg: string }> = {
  PASS: { label: "ผ่าน", icon: "✓", fg: "var(--color-pass)", bg: "var(--color-pass-soft)" },
  FAIL: { label: "ไม่ผ่าน", icon: "✕", fg: "var(--color-fail)", bg: "var(--color-fail-soft)" },
  PARTIAL: {
    label: "ผ่านบางส่วน",
    icon: "◐",
    fg: "var(--color-partial)",
    bg: "var(--color-partial-soft)",
  },
  UNKNOWN: {
    label: "ไม่ทราบ",
    icon: "?",
    fg: "var(--color-unknown)",
    bg: "var(--color-unknown-soft)",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium"
      style={{ color: s.fg, backgroundColor: s.bg }}
    >
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
      <span className="text-xs opacity-70">({status})</span>
    </span>
  );
}

/** Evidence provenance must stay visible; a proxy may never look like direct evidence. */
const EVIDENCE_KINDS = [
  { code: "EXACT", label: "หลักฐานตรง", note: "วัดจากทรัพย์/พื้นที่เป้าหมายโดยตรง" },
  { code: "PROXY", label: "ข้อมูลทดแทน", note: "ใช้พื้นที่ใกล้เคียงแทน เพราะไม่มีข้อมูลตรง" },
  { code: "BENCHMARK", label: "ค่าอ้างอิง", note: "ค่ากลางจากแหล่งอ้างอิง ไม่ใช่ของพื้นที่นี้" },
  { code: "ASSUMPTION", label: "สมมติฐาน", note: "ระบบตั้งสมมติฐานเอง ต้องตรวจสอบก่อนใช้จริง" },
];

const SECTIONS = [
  "สรุปคำแนะนำ",
  "หลักฐานสนับสนุน",
  "หลักฐานแย้ง",
  "ผลตรวจสอบ",
  "การเงิน",
  "ข้อจำกัด",
  "สิ่งที่ต้องตรวจสอบต่อ",
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeSection, setActiveSection] = useState(SECTIONS[0]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-border border-b bg-header text-header-on">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-semibold text-lg">ระบบวิเคราะห์ศักยภาพการลงทุนอสังหาริมทรัพย์</p>
            <p className="text-sm opacity-80">ตัวอย่างระบบออกแบบ — ยังไม่ใช่หน้าใช้งานจริง</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md border border-current px-3 py-1.5 text-sm"
          >
            {theme === "light" ? "โหมดมืด" : "โหมดสว่าง"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Panel title="สถานะการตรวจสอบ (สีไม่ใช่สัญญาณเดียว — มีไอคอนและข้อความไทยเสมอ)">
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="PASS" />
            <StatusBadge status="FAIL" />
            <StatusBadge status="PARTIAL" />
            <StatusBadge status="UNKNOWN" />
          </div>
          <p className="mt-4 text-ink-muted text-sm">
            “ไม่ทราบ” ใช้สีเทาไร้สีสันโดยตั้งใจ เพื่อไม่ให้ถูกเข้าใจผิดว่าเป็นคำเตือนหรือผลลบ
          </p>
        </Panel>

        <Panel title="ชนิดของหลักฐาน (ต้องแยกออกจากกันด้วยสายตา)">
          <ul className="space-y-2">
            {EVIDENCE_KINDS.map((k) => (
              <li
                key={k.code}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-surface-sunken px-3 py-2"
              >
                <span className="rounded border border-border-strong px-2 py-0.5 font-medium text-xs">
                  {k.label}
                </span>
                <span className="text-ink-muted text-sm">{k.note}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="แถบนำทางแบบแท็บ (กดแล้วเลื่อนไปหัวข้อ ไม่ได้ซ่อนเนื้อหา)">
          <nav className="flex flex-wrap gap-1 border-border border-b pb-px">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className="rounded-t-md px-3 py-2 text-sm"
                style={
                  activeSection === s
                    ? {
                        color: "var(--color-primary)",
                        borderBottom: "2px solid var(--color-primary)",
                        fontWeight: 600,
                      }
                    : { color: "var(--color-ink-muted)" }
                }
              >
                {s}
              </button>
            ))}
          </nav>
          <p className="mt-4 text-ink-muted text-sm">
            หน้าตาเหมือนแท็บ แต่ทุกหัวข้ออยู่ในหน้าเดียวกันทั้งหมด — ข้อจำกัดและหลักฐานแย้งจึงไม่ถูกซ่อน ตามที่{" "}
            <code className="text-xs">output-policy.md</code> กำหนด
          </p>
        </Panel>

        <Panel title="คำปฏิเสธความรับผิดชอบเชิงวิชาการ (ห้ามเล็กหรือจางกว่าคำแนะนำ)">
          <div
            className="rounded-md border-l-4 p-4 text-sm leading-relaxed"
            style={{
              borderColor: "var(--color-partial)",
              backgroundColor: "var(--color-partial-soft)",
            }}
          >
            ผลการวิเคราะห์นี้จัดทำโดยระบบต้นแบบทางวิชาการสำหรับโครงการมหาวิทยาลัย
            เป็นเครื่องมือช่วยศึกษาความเป็นไปได้เบื้องต้น ไม่ใช่คำรับรองทางกฎหมาย วิศวกรรม การสำรวจ การประเมินราคา
            หรือคำแนะนำการลงทุน
          </div>
        </Panel>

        <Panel title="ตัวอย่างการ์ดหลักฐาน">
          <article className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">รายได้ครัวเรือนเฉลี่ยต่อเดือน</h3>
              <StatusBadge status="PARTIAL" />
            </div>
            <p className="mt-2 font-semibold text-2xl">17,019 บาท</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">กลุ่มประชากร</dt>
              <dd>ผู้ถือครองทำการเกษตร (ส่วนใหญ่เป็นเจ้าของที่ดิน)</dd>
              <dt className="text-ink-muted">ระดับพื้นที่</dt>
              <dd>จังหวัด (ชลบุรี)</dd>
              <dt className="text-ink-muted">ปีข้อมูล</dt>
              <dd>2568 (ค.ศ. 2025)</dd>
              <dt className="text-ink-muted">แหล่งข้อมูล</dt>
              <dd>สำนักงานสถิติแห่งชาติ</dd>
            </dl>
            <p className="mt-3 border-border border-t pt-3 text-ink-muted text-sm">
              แหล่งข้อมูลไม่ได้เผยแพร่ค่าเฉลี่ยรวมทุกครัวเรือน ระบบจึงแสดงแยกตามกลุ่ม และไม่สร้างค่าเฉลี่ยรวมขึ้นเอง
            </p>
          </article>
        </Panel>
      </main>
    </div>
  );
}
