import { th } from "@reis/i18n";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CircleDashed,
  CircleHelp,
  Info,
  MapPin,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { TerrainBackdrop } from "./TerrainBackdrop.js";
import { SPECIMEN } from "./specimens.js";

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
  PASS: {
    label: SPECIMEN.statusLabels.PASS,
    Icon: Check,
    fg: "var(--color-pass)",
    bg: "var(--color-pass-soft)",
  },
  FAIL: {
    label: SPECIMEN.statusLabels.FAIL,
    Icon: X,
    fg: "var(--color-fail)",
    bg: "var(--color-fail-soft)",
  },
  PARTIAL: {
    label: SPECIMEN.statusLabels.PARTIAL,
    Icon: CircleDashed,
    fg: "var(--color-partial)",
    bg: "var(--color-partial-soft)",
  },
  UNKNOWN: {
    label: SPECIMEN.statusLabels.UNKNOWN,
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
    <section className="glass rounded-card p-6 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.5)]">
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-5 font-bold text-ink text-lg tracking-tight">{children}</h2>;
}

/** Latin + looped-Thai pairings. Loopless Thai faces are deliberately not offered. */
const FONTS = [
  { id: "plex", name: "Inter + Plex Thai" },
  { id: "sarabun", name: "Inter + Sarabun" },
  { id: "looped", name: "DM Sans + Noto Looped" },
  { id: "jakarta", name: "Jakarta + Plex Thai" },
] as const;

const PALETTES = [
  { id: "aurora", name: "Aurora", swatch: "linear-gradient(135deg,#00C2A8,#3B82F6,#7C3AED)" },
  { id: "sunset", name: "Sunset", swatch: "linear-gradient(135deg,#FF7A45,#F43F8E,#8B5CF6)" },
  { id: "ocean", name: "Ocean", swatch: "linear-gradient(135deg,#06B6D4,#2563EB,#1E3A8A)" },
  { id: "berry", name: "Berry", swatch: "linear-gradient(135deg,#EC4899,#A855F7,#6366F1)" },
] as const;

const SECTIONS = SPECIMEN.sections;

const METRICS = SPECIMEN.metrics;

const EVIDENCE_FIELDS = SPECIMEN.evidenceFields;

export function DesignSystemPreview() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [font, setFont] = useState<string>("plex");
  const [palette, setPalette] = useState<string>("ocean");
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
    <div className="relative min-h-screen text-ink">
      <TerrainBackdrop />

      <div className="glass border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted">{SPECIMEN.fontLabel}</span>
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
            <span className="text-ink-muted">{SPECIMEN.paletteLabel}</span>
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
                  className="size-3.5 rounded-full"
                  style={{ background: p.swatch }}
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
            {theme === "light" ? SPECIMEN.toDarkMode : SPECIMEN.toLightMode}
          </button>
        </div>
      </div>

      <header className="relative overflow-hidden px-6 py-20 text-ink">
        {/* Decorative glow uses the vivid tier — no text sits on it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--grad-vivid-from) 0%, var(--grad-vivid-via) 60%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <span className="glass inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-semibold text-xs">
            <Building2 size={14} /> {SPECIMEN.badge}
          </span>
          <h1 className="mt-5 font-bold text-4xl leading-tight tracking-tight md:text-6xl">
            {th.app.headlineLead}
            <br />
            <span className="headline-gradient">{th.app.headlineAnswer}</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">{SPECIMEN.tagline}</p>
          <button
            type="button"
            className="mt-7 inline-flex items-center gap-2 rounded-pill px-7 py-3.5 font-bold text-base text-white shadow-[0_8px_28px_-8px_rgba(0,0,0,0.6)]"
            style={{
              background:
                "linear-gradient(120deg, var(--grad-deep-from), var(--grad-deep-via), var(--grad-deep-to))",
            }}
          >
            {SPECIMEN.primaryAction}
            <ArrowUpRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-ink-muted text-sm">
                <MapPin size={15} /> {SPECIMEN.place}
              </p>
              <p className="mt-1 font-bold text-3xl tracking-tight">{SPECIMEN.concept}</p>
            </div>
            <span
              className="rounded-pill px-4 py-2 font-bold text-sm text-white"
              style={{
                background: "linear-gradient(120deg, var(--grad-deep-via), var(--grad-deep-to))",
              }}
            >
              {SPECIMEN.scopeBadge}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {METRICS.map((m) => (
              <div key={m.label} className="glass rounded-card p-4">
                <p className="flex items-center gap-1.5 text-ink-muted text-sm">
                  <m.Icon size={15} /> {m.label}
                </p>
                <p className="mt-1.5 font-bold text-2xl tracking-tight">
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
            <span className="font-bold">{SPECIMEN.disclaimerLead}</span> — {SPECIMEN.disclaimerBody}
          </p>
        </div>

        <Card>
          <CardTitle>{SPECIMEN.statusHeading}</CardTitle>
          <div className="flex flex-wrap gap-3">
            <StatusPill status="PASS" />
            <StatusPill status="FAIL" />
            <StatusPill status="PARTIAL" />
            <StatusPill status="UNKNOWN" />
          </div>
          <p className="mt-5 flex items-start gap-2 text-ink-muted text-sm">
            <Info size={15} className="mt-0.5 shrink-0" />
            {SPECIMEN.statusNote}
          </p>
        </Card>

        <Card>
          <CardTitle>{SPECIMEN.navHeading}</CardTitle>
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
          <p className="mt-5 text-ink-muted text-sm">{SPECIMEN.navNote}</p>
        </Card>

        <Card>
          <CardTitle>{SPECIMEN.evidenceHeading}</CardTitle>
          <article className="glass rounded-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-bold text-base">{SPECIMEN.evidenceTitle}</h3>
              <span className="rounded-pill border border-border-strong px-3 py-1 font-semibold text-ink-muted text-xs">
                {SPECIMEN.evidenceBadge}
              </span>
            </div>
            <p className="mt-3 font-bold text-4xl tracking-tight">
              <span className="headline-gradient">{SPECIMEN.evidenceValue}</span>
              <span className="ml-2 font-medium text-ink-muted text-base">
                {SPECIMEN.evidenceUnit}
              </span>
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
              {SPECIMEN.evidenceNote}
            </p>
          </article>
        </Card>
      </main>
    </div>
  );
}
