import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CircleDashed,
  CircleHelp,
  FileSearch,
  Info,
  MapPin,
  Moon,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";

/**
 * Living preview of the design tokens. Font and signature colour are switchable here so the
 * authors can choose from real screens rather than swatches; once chosen, the losing options are
 * deleted and the choice is recorded in docs/adr/0003.
 *
 * No emoji anywhere — icons are Lucide components, which is also what
 * docs/technology-stack.md §2 locks in.
 */

type Status = "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN";

const STATUS: Record<Status, { label: string; Icon: typeof Check; fg: string; bg: string }> = {
  PASS: { label: "ผ่าน", Icon: Check, fg: "var(--color-pass)", bg: "var(--color-pass-soft)" },
  FAIL: { label: "ไม่ผ่าน", Icon: X, fg: "var(--color-fail)", bg: "var(--color-fail-soft)" },
  PARTIAL: {
    label: "ผ่านบางส่วน",
    Icon: CircleDashed,
    fg: "var(--color-partial)",
    bg: "var(--color-partial-soft)",
  },
  UNKNOWN: {
    label: "ไม่ทราบ",
    Icon: CircleHelp,
    fg: "var(--color-unknown)",
    bg: "var(--color-unknown-soft)",
  },
};

function StatusPill({ status }: { status: Status }) {
  const { label, Icon, fg, bg } = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-semibold text-sm"
      style={{ color: fg, backgroundColor: bg }}
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(16,21,28,0.04),0_8px_24px_-12px_rgba(16,21,28,0.12)]">
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-5 font-bold text-ink text-lg tracking-tight">{children}</h2>;
}

const FONTS = [
  { id: "anuphan", name: "Anuphan" },
  { id: "plex", name: "IBM Plex Sans Thai" },
  { id: "looped", name: "Noto Sans Thai Looped" },
  { id: "noto", name: "Noto Sans Thai" },
] as const;

const PALETTES = [
  { id: "turquoise", name: "เทอร์คอยซ์", swatch: "#00B8A0" },
  { id: "violet", name: "ม่วง", swatch: "#6C5CE7" },
  { id: "cobalt", name: "น้ำเงินโคบอลต์", swatch: "#1D4ED8" },
] as const;

const SECTIONS = [
  "สรุปคำแนะนำ",
  "หลักฐานสนับสนุน",
  "หลักฐานแย้ง",
  "ผลตรวจสอบ",
  "การเงิน",
  "ข้อจำกัด",
  "สิ่งที่ต้องตรวจสอบต่อ",
];

const METRICS = [
  { label: "รายได้ครัวเรือน/เดือน", value: "17,019", unit: "บาท", Icon: TrendingUp },
  { label: "ประชากรในตำบล", value: "22,480", unit: "คน", Icon: Building2 },
  { label: "หลักฐานที่ใช้ได้", value: "6", unit: "จาก 14 รายการ", Icon: FileSearch },
];

const EVIDENCE_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ["กลุ่มประชากร", "ผู้ถือครองทำการเกษตร (เจ้าของที่ดิน)"],
  ["ระดับพื้นที่", "จังหวัดชลบุรี"],
  ["ปีข้อมูล", "2568 (ค.ศ. 2025)"],
  ["แหล่งข้อมูล", "สำนักงานสถิติแห่งชาติ"],
];

export function DesignSystemPreview() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [font, setFont] = useState<string>("anuphan");
  const [palette, setPalette] = useState<string>("turquoise");
  const [section, setSection] = useState<string>(SECTIONS[0] ?? "");

  function selectedStyle(isActive: boolean) {
    return isActive
      ? {
          borderColor: "var(--color-signature)",
          backgroundColor: "var(--color-signature-wash)",
          color: "var(--color-signature-text)",
          fontWeight: 600,
        }
      : { borderColor: "var(--color-border)", color: "var(--color-ink-muted)" };
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="border-border border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">ฟอนต์</span>
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  document.documentElement.setAttribute("data-font", f.id);
                  setFont(f.id);
                }}
                className="rounded-pill border px-3 py-1"
                style={selectedStyle(font === f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">สีหลัก</span>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  document.documentElement.setAttribute("data-palette", p.id);
                  setPalette(p.id);
                }}
                className="flex items-center gap-2 rounded-pill border px-3 py-1"
                style={selectedStyle(palette === p.id)}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: p.swatch }}
                  aria-hidden="true"
                />
                {p.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto flex items-center gap-2 rounded-pill border border-border px-3 py-1 text-ink-muted"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            {theme === "light" ? "โหมดมืด" : "โหมดสว่าง"}
          </button>
        </div>
      </div>

      <header
        className="px-6 py-14"
        style={{
          background:
            "linear-gradient(135deg, var(--color-signature) 0%, color-mix(in srgb, var(--color-signature) 68%, #000) 100%)",
          color: "var(--color-signature-on)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-black/15 px-3 py-1 font-semibold text-xs">
            <Building2 size={14} /> ต้นแบบเชิงวิชาการ
          </span>
          <h1 className="mt-4 font-extrabold text-4xl leading-tight tracking-tight md:text-5xl">
            ที่ดินแปลงนี้
            <br />
            ใช้ทำอะไรได้คุ้มที่สุด
          </h1>
          <p className="mt-3 max-w-xl text-base opacity-80">
            วิเคราะห์จากหลักฐานจริง ครบทุกจังหวัดทั่วประเทศ พร้อมบอกตรง ๆ ว่าอะไรที่ยังไม่รู้
          </p>
          <button
            type="button"
            className="mt-7 inline-flex items-center gap-2 rounded-pill px-6 py-3 font-bold text-base"
            style={{
              backgroundColor: "var(--color-signature-on)",
              color: "var(--color-signature)",
            }}
          >
            เริ่มวิเคราะห์
            <ArrowUpRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-ink-muted text-sm">
                <MapPin size={15} /> ต.บางปลาสร้อย อ.เมืองชลบุรี จ.ชลบุรี
              </p>
              <p className="mt-1 font-extrabold text-3xl tracking-tight">ที่พักอาศัยให้เช่า</p>
            </div>
            <span
              className="rounded-pill px-4 py-2 font-bold text-sm"
              style={{
                backgroundColor: "var(--color-signature-wash)",
                color: "var(--color-signature-text)",
              }}
            >
              ระดับพื้นที่ (AREA)
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {METRICS.map((m) => (
              <div key={m.label} className="rounded-card bg-surface-sunken p-4">
                <p className="flex items-center gap-1.5 text-ink-muted text-sm">
                  <m.Icon size={15} /> {m.label}
                </p>
                <p className="mt-1.5 font-extrabold text-2xl tracking-tight">
                  {m.value}
                  <span className="ml-1.5 font-medium text-ink-muted text-sm">{m.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div
          className="flex gap-3 rounded-card p-5 text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--color-partial-soft)",
            color: "var(--color-partial)",
            border: "1px solid color-mix(in srgb, var(--color-partial) 35%, transparent)",
          }}
        >
          <AlertTriangle size={20} className="mt-0.5 shrink-0" strokeWidth={2.5} />
          <p>
            <span className="font-bold">ผลนี้เป็นการศึกษาเบื้องต้นทางวิชาการ</span> —
            จัดทำโดยระบบต้นแบบสำหรับโครงการมหาวิทยาลัย ไม่ใช่คำรับรองทางกฎหมาย วิศวกรรม การสำรวจ
            การประเมินราคา หรือคำแนะนำการลงทุน ต้องตรวจสอบกับผู้เชี่ยวชาญก่อนตัดสินใจจริง
          </p>
        </div>

        <Card>
          <CardTitle>สถานะการตรวจสอบ</CardTitle>
          <div className="flex flex-wrap gap-3">
            <StatusPill status="PASS" />
            <StatusPill status="FAIL" />
            <StatusPill status="PARTIAL" />
            <StatusPill status="UNKNOWN" />
          </div>
          <p className="mt-5 flex items-start gap-2 text-ink-muted text-sm">
            <Info size={15} className="mt-0.5 shrink-0" />
            สีสถานะไม่เปลี่ยนตามสีหลักของแอป เพราะสื่อความหมายเชิงวิเคราะห์ ไม่ใช่การตกแต่ง และ “ไม่ทราบ”
            ใช้สีเทาไร้สีสันโดยตั้งใจ เพื่อไม่ให้ดูเหมือน “เกือบไม่ผ่าน”
          </p>
        </Card>

        <Card>
          <CardTitle>แถบนำทางผลลัพธ์</CardTitle>
          <nav className="-mx-1 flex flex-wrap gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className="rounded-pill px-4 py-2 font-medium text-sm transition-colors"
                style={
                  section === s
                    ? {
                        backgroundColor: "var(--color-signature)",
                        color: "var(--color-signature-on)",
                        fontWeight: 700,
                      }
                    : { color: "var(--color-ink-muted)" }
                }
              >
                {s}
              </button>
            ))}
          </nav>
          <p className="mt-5 text-ink-muted text-sm">
            หน้าตาเหมือนแท็บ แต่กดแล้วเลื่อนไปยังหัวข้อในหน้าเดียวกัน — ข้อจำกัดและหลักฐานแย้งจึงไม่ถูกซ่อน
          </p>
        </Card>

        <Card>
          <CardTitle>การ์ดหลักฐาน</CardTitle>
          <article className="rounded-card border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-bold text-base">รายได้ครัวเรือนเฉลี่ยต่อเดือน</h3>
              <span className="rounded-pill border border-border-strong px-3 py-1 font-semibold text-ink-muted text-xs">
                หลักฐานตรง
              </span>
            </div>
            <p className="mt-3 font-extrabold text-4xl tracking-tight">
              17,019
              <span className="ml-2 font-medium text-ink-muted text-base">บาท/เดือน</span>
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {EVIDENCE_FIELDS.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-border border-b pb-2">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-ink-muted text-sm">
              <Info size={15} className="mt-0.5 shrink-0" />
              แหล่งข้อมูลไม่ได้เผยแพร่ค่าเฉลี่ยรวมทุกครัวเรือน ระบบจึงแสดงแยกตามกลุ่ม และไม่สร้างค่าเฉลี่ยรวมขึ้นเอง
            </p>
          </article>
        </Card>
      </main>
    </div>
  );
}
