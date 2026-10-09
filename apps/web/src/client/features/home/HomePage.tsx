import { th } from "@reis/i18n";
import {
  ArrowRight,
  Building2,
  Coins,
  Database,
  Globe,
  type LucideIcon,
  Map as MapIcon,
  MapPinned,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";
import { AerialScene } from "./AerialScene.js";
import { HeroEmblems } from "./HeroEmblems.js";
import { LandingSections } from "./LandingSections.js";
import { useSystemFigures } from "./useSystemFigures.js";

/**
 * The front door.
 *
 * It used to be the intake form: a reader arrived at a dropdown and had to already know what the
 * product was for. The form is now one page further in, behind a button, and this page does the
 * job a front page does — say what this is, show what it looks at, and state what it holds.
 *
 * Every figure on it is read from the running system (see useSystemFigures). The illustration is
 * drawn and is of nowhere (see AerialScene and docs/adr/0004). Between them, the page is as
 * ambitious as a landing page should be and still says nothing the product cannot support.
 */

const num = (value: number) => value.toLocaleString("th-TH");

/**
 * Champagne, for the line work on the front page only.
 *
 * The product's signature stays blue — it marks the selected thing in the rail, the active tab,
 * the link you can follow. Gold here is scenery: the emblems, the hairline on a card, the ring
 * round a data node. Keeping them apart is what stops the decoration from looking clickable.
 */
const GOLD = "#e8c89a";
const GOLD_LINE = "rgba(232, 200, 154, 0.38)";

/**
 * A figure pinned to the scene, the way this product pins evidence to a place.
 *
 * `ready` is not decoration. These counts come from the database, and the slowest of them took
 * about ten seconds on the deployed site — during which the card stated "0 รายการข้อมูล", which is
 * not a figure that is loading, it is a false statement about the system. Until the number is
 * known the card shows a bar where it will be.
 */
function Callout({
  ready,
  value,
  label,
  className,
  icon: Icon,
}: {
  ready: boolean;
  value: string;
  label: string;
  className: string;
  /** Rides in the node at the foot of the leader line, naming what the figure counts. */
  icon: LucideIcon;
}) {
  return (
    <div className={`pointer-events-none absolute hidden lg:block ${className}`}>
      <div
        className="rounded-card px-4 py-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md"
        style={{
          backgroundColor: "rgba(7, 13, 28, 0.55)",
          border: `1px solid ${GOLD_LINE}`,
        }}
      >
        {ready ? (
          <p className="font-bold text-base tabular-nums leading-none tracking-tight">{value}</p>
        ) : (
          <p
            className="h-4 w-28 animate-pulse rounded-pill"
            style={{ backgroundColor: "var(--color-border-strong)" }}
          />
        )}
        <p className="mt-1 text-ink-muted text-xs">{label}</p>
      </div>
      {/* The leader line, as a survey drawing marks the thing it is describing, and at its foot a
          node rather than a dot: a gold ring with the icon of whatever the figure counts. */}
      <div
        className="mx-auto h-9 w-px"
        style={{ background: `linear-gradient(to bottom, transparent, ${GOLD_LINE})` }}
      />
      <div className="relative mx-auto size-11">
        <span
          className="absolute inset-0 animate-ping rounded-full"
          style={{ border: `1px solid ${GOLD_LINE}`, animationDuration: "3.5s" }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(7, 13, 28, 0.6)",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            boxShadow: "0 0 18px -4px rgba(232, 200, 154, 0.5)",
          }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <article className="glass rounded-card p-6">
      <span
        className="flex size-11 items-center justify-center rounded-card"
        style={{
          backgroundColor: "var(--color-signature-wash)",
          color: "var(--color-signature-text)",
        }}
      >
        <Icon size={21} aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-bold text-lg tracking-tight">{title}</h3>
      <p className="mt-2 text-ink-muted text-sm leading-relaxed">{body}</p>
    </article>
  );
}

export function HomePage() {
  const figures = useSystemFigures();

  return (
    <div>
      {/*
        The hero holds the scene, and the scene is tilted away rather than drawn in perspective:
        the plan is authored flat, which keeps it readable as a plan, and CSS lays it back so it
        reads as ground seen from the air. The mask at its foot is what stops it ending in a line.
      */}
      <section className="relative flex min-h-[38rem] flex-col justify-center overflow-hidden px-6 pt-12 pb-16 lg:min-h-[46rem] lg:pt-16 lg:pb-24">
        {/*
          The scene fills the hero as a backdrop.

          It is not tilted: the first version was a flat plan that CSS laid back to fake depth, and
          this one has its own horizon, its own haze and its own light. Laying it back as well
          would be perspective applied twice.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            /*
              Dissolved at the foot rather than cut off there, and the page's own backdrop is
              meant to come up through it.

              The hero used to fade to an opaque --terrain-base while that backdrop — the map of
              Thailand and its lit markers — began immediately below, so the two met as a seam
              across the window. Fading the scene itself hands the eye over gradually instead, and
              the landscape, the map and the markers read as one picture for the last third of the
              hero. That overlap was briefly treated as a fault and was going to be covered with an
              opaque floor; the owners looked at it and asked for exactly this, so it stays, and
              the floor is not coming.
            */
            maskImage:
              "linear-gradient(to bottom, #000 58%, rgba(0,0,0,0.45) 84%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, #000 58%, rgba(0,0,0,0.45) 84%, transparent 100%)",
          }}
        >
          <AerialScene className="size-full" />
        </div>

        {/*
          Two scrims over the scene, and the headline needs both.

          The plan is bright where the light falls on it, and gradient type over a bright, busy
          ground is the one thing it cannot survive — the second line of the headline disappeared
          into a parcel. The first pool darkens the middle where the words sit; the second carries
          the foot of the scene into the page background so it ends in a horizon rather than an
          edge.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(62% 58% at 50% 34%, color-mix(in srgb, var(--terrain-base) 80%, transparent) 0%, color-mix(in srgb, var(--terrain-base) 52%, transparent) 55%, transparent 88%)",
          }}
        />

        {/* The band the owners circled: the country, a globe, a pin and a plot, lying across the
            foot of the hero behind the figures. Hidden below `lg`, where there is no room for
            them beside the words. */}
        <HeroEmblems className="absolute inset-x-0 bottom-14 hidden h-72 lg:block" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="glass inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 font-semibold text-xs">
              <Building2 size={14} aria-hidden="true" />
              {th.app.academicBadge}
            </span>
            <h1 className="mt-6 font-bold text-4xl leading-[1.15] tracking-tight md:text-6xl">
              {th.app.headlineLead}
              <br />
              {/* Gold here and nowhere else. The product's own signature stays blue; this line is
                  the one the owners picked out of the reference, and it is lit by the same sun
                  that lights the scene behind it. */}
              <span
                style={{
                  background: "linear-gradient(100deg, #ffeec4, #f0b45e 48%, #e2a04a)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {th.app.headlineAnswer}
              </span>
            </h1>
            <p
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed [text-shadow:0_1px_12px_rgba(0,0,0,0.8)]"
              style={{ color: "rgba(226,234,246,0.86)" }}
            >
              {th.home.heroLead}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 rounded-pill px-7 py-3.5 font-bold text-base text-white"
                style={{
                  background:
                    "linear-gradient(120deg, var(--grad-deep-from), var(--grad-deep-via), var(--grad-deep-to))",
                  // A lit edge rather than a drop shadow: the button sits on a night scene, and a
                  // shadow under it has nothing to fall on.
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.18), 0 0 28px -6px var(--color-signature), 0 16px 40px -18px rgba(0,0,0,0.9)",
                }}
              >
                {th.home.heroPrimary}
                <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <a
                href="#what"
                className="inline-flex items-center gap-2 rounded-pill px-6 py-3.5 font-semibold text-sm backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.22)",
                }}
              >
                {th.home.heroSecondary}
              </a>
            </div>

            {/* Three short promises in a row beneath the buttons, each one the product can keep
                today: where the figures come from, how far they reach, and what it asks of the
                reader in return — which is nothing. */}
            <ul className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
              {(
                [
                  [Database, th.home.badge1Title, th.home.badge1Body],
                  [MapPinned, th.home.badge2Title, th.home.badge2Body],
                  [ShieldCheck, th.home.badge3Title, th.home.badge3Body],
                ] as const
              ).map(([Icon, title, body]) => (
                <li key={title} className="flex items-center gap-2.5 text-left">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-card"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "#f0d9a8",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  {/* Not ink-muted. Muted grey is a colour for a panel; over a landscape it is
                      the first thing to disappear, and the owners could not read this row. */}
                  <span className="[text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">
                    <span className="block font-semibold text-sm tracking-wide">{title}</span>
                    <span className="block text-xs" style={{ color: "rgba(226,234,246,0.78)" }}>
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* The counts, pinned onto the ground they describe. Hidden below `lg`, where there is
              no room beside the words and they would land on top of them. */}
          <div className="relative mt-16 hidden h-44 lg:block">
            <Callout
              className="top-0 left-[4%]"
              icon={MapIcon}
              ready={figures.provinces > 0}
              value={th.landing.coverageProvinces.replace("{n}", num(figures.provinces))}
              label={th.landing.coverageProvincesNote}
            />
            <Callout
              className="top-16 left-[37%]"
              icon={Globe}
              ready={figures.observations > 0}
              value={th.landing.coverageObservations.replace("{n}", num(figures.observations))}
              label={
                figures.activeSources.length > 0
                  ? th.home.calloutSources.replace("{n}", num(figures.activeSources.length))
                  : th.home.calloutSourcesPending
              }
            />
            <Callout
              className="top-2 right-[5%]"
              icon={MapPinned}
              ready={figures.searchableProvinces > 0}
              value={th.landing.coverageParcels.replace("{n}", num(figures.searchableProvinces))}
              label={th.landing.coverageParcelsNote}
            />
          </div>
        </div>
      </section>

      {/*
        `isolate` is load-bearing. A positioned element paints above its in-flow siblings whatever
        the source order, so without a stacking context of its own this veil covered the first
        heading under it instead of sitting behind it — `-z-10` only means "behind" relative to
        something, and this is the something.
      */}
      <main className="relative isolate px-6 pb-20">
        {/* The other half of the handoff: the hero ends in the page's own colour, and the backdrop
            behind this section comes up out of it rather than starting at an edge. */}
        <div
          aria-hidden="true"
          className="-z-10 pointer-events-none absolute inset-x-0 top-0 h-44"
          style={{ background: "linear-gradient(to bottom, var(--terrain-base), transparent)" }}
        />
        <section id="what" className="mx-auto max-w-5xl scroll-mt-20">
          <h2 className="font-bold text-3xl tracking-tight">{th.home.whatHeading}</h2>
          <p className="mt-2 max-w-prose text-ink-muted leading-relaxed">{th.home.whatIntro}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Feature icon={Coins} title={th.app.offerPricesTitle} body={th.app.offerPricesBody} />
            <Feature icon={MapIcon} title={th.app.offerZoningTitle} body={th.app.offerZoningBody} />
            <Feature
              icon={ScrollText}
              title={th.app.offerConceptsTitle}
              body={th.app.offerConceptsBody}
            />
          </div>
        </section>

        {/* How a run goes, in the order the reader will meet it. Four steps, no invented detail. */}
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="font-bold text-3xl tracking-tight">{th.home.stepsHeading}</h2>
          <ol className="mt-7 grid gap-4 md:grid-cols-4">
            {(
              [
                [MapPinned, th.home.step1Title, th.home.step1Body],
                [Database, th.home.step2Title, th.home.step2Body],
                [ScrollText, th.home.step3Title, th.home.step3Body],
                [ShieldCheck, th.home.step4Title, th.home.step4Body],
              ] as const
            ).map(([Icon, title, body], index) => (
              <li key={title} className="glass rounded-card p-5">
                <span className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-card font-bold text-xs tabular-nums"
                    style={{
                      backgroundColor: "var(--color-signature-wash)",
                      color: "var(--color-signature-text)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <Icon size={16} className="text-ink-muted" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-base tracking-tight">{title}</h3>
                <p className="mt-1.5 text-ink-muted text-sm leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mx-auto max-w-5xl">
          <LandingSections />
        </div>

        {/*
          What it does not do, said on the front page rather than discovered on the result screen.

          A landing page that only promises is the one thing docs/output-policy.md will not have:
          the limits travel with the claims. Putting them here costs nothing and is the clearest
          signal that the figures above are meant honestly.
        */}
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="font-bold text-3xl tracking-tight">{th.home.limitsHeading}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [th.home.limit1Title, th.home.limit1Body],
              [th.home.limit2Title, th.home.limit2Body],
              [th.home.limit3Title, th.home.limit3Body],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-card border border-border border-l-2 border-l-signature bg-surface-sunken p-5"
              >
                <h3 className="font-bold text-sm">{title}</h3>
                <p className="mt-1.5 text-ink-muted text-sm leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto mt-16 max-w-5xl">
          <div className="glass flex flex-wrap items-center justify-between gap-5 rounded-card p-8">
            <div>
              <h2 className="font-bold text-2xl tracking-tight">{th.home.ctaHeading}</h2>
              <p className="mt-1.5 max-w-prose text-ink-muted text-sm leading-relaxed">
                {th.home.ctaBody}
              </p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 rounded-pill px-6 py-3 font-bold text-sm text-white"
              style={{
                background:
                  "linear-gradient(120deg, var(--grad-deep-from), var(--grad-deep-via), var(--grad-deep-to))",
              }}
            >
              {th.home.heroPrimary}
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
