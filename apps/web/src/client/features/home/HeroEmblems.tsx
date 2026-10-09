import { PROVINCES, PROVINCE_VIEWBOX } from "../design-system/TerrainBackdrop.js";

/**
 * The band of emblems across the foot of the hero: the country, the globe, a dropped pin, a plot.
 *
 * The owners circled this strip in two photographs — once on a reference they liked and once on
 * our page, where it was missing — so it is the thing the front page was short of rather than a
 * flourish. Each emblem is one of the four nouns the product deals in, and together they say what
 * it is about before the copy does: somewhere in Thailand, located, on a plot of ground.
 *
 * Decoration, and nothing else. The map is the same public-domain outline the page backdrop
 * already draws, borrowed rather than copied; the pin marks nowhere; the plot is a quadrilateral.
 * Nothing here is evidence about anybody's land (docs/adr/0004), and the whole band is
 * aria-hidden.
 *
 * Warm, because the light in the scene above it is warm — these sit on the ground that sun is
 * setting over, so they take its colour rather than the product's blue.
 */

const EMBLEM = "#e8c89a";

/** Thailand, drawn small. One `g` scaled down rather than 77 re-authored paths. */
function ThailandEmblem() {
  return (
    <svg viewBox={PROVINCE_VIEWBOX} className="size-full" aria-hidden="true" focusable="false">
      <title>แผนที่ประเทศไทย</title>
      <g fill="none" stroke={EMBLEM} strokeWidth={4} strokeLinejoin="round">
        {PROVINCES.map((path) => (
          <path key={path.slice(0, 48)} d={path} />
        ))}
      </g>
    </svg>
  );
}

/** A globe: a sphere with the meridians and parallels a drawn globe carries. */
function GlobeEmblem() {
  return (
    <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true" focusable="false">
      <title>ลูกโลก</title>
      <g fill="none" stroke={EMBLEM} strokeWidth={1.6}>
        <circle cx={60} cy={54} r={34} />
        <ellipse cx={60} cy={54} rx={14} ry={34} />
        <ellipse cx={60} cy={54} rx={27} ry={34} />
        <line x1={26} y1={54} x2={94} y2={54} />
        <path d="M 31 38 Q 60 48, 89 38" />
        <path d="M 31 70 Q 60 60, 89 70" />
        {/* The stand, which is what makes it read as a globe rather than as a circle. */}
        <path d="M 60 88 L 60 102 M 44 102 L 76 102" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** A dropped pin, with the ring a map draws under one. */
function PinEmblem() {
  return (
    <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true" focusable="false">
      <title>หมุดตำแหน่ง</title>
      <g fill="none" stroke={EMBLEM} strokeWidth={1.6}>
        <path d="M 60 96 C 60 96, 88 66, 88 46 A 28 28 0 1 0 32 46 C 32 66, 60 96, 60 96 Z" />
        <circle cx={60} cy={46} r={10} />
        <ellipse cx={60} cy={103} rx={22} ry={6} opacity={0.55} />
      </g>
    </svg>
  );
}

/** A plot of ground, cornered the way a survey drawing corners one. */
function PlotEmblem() {
  return (
    <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true" focusable="false">
      <title>แปลงที่ดิน</title>
      <g fill="none" stroke={EMBLEM} strokeWidth={1.6}>
        <path d="M 18 74 L 46 34 L 104 44 L 78 92 Z" />
        <path d="M 46 34 L 60 78 M 18 74 L 78 92" strokeWidth={0.9} opacity={0.6} />
        {[
          [18, 74],
          [46, 34],
          [104, 44],
          [78, 92],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The four, spread across the band.
 *
 * Sizes and vertical offsets differ on purpose: a row of four identical boxes reads as a toolbar,
 * and this is meant to read as things lying on the ground at different distances.
 */
const EMBLEMS = [
  { key: "map", Emblem: ThailandEmblem, className: "left-[3%] bottom-2 h-[15rem] w-[10rem]" },
  { key: "globe", Emblem: GlobeEmblem, className: "left-[28%] bottom-16 size-32" },
  { key: "pin", Emblem: PinEmblem, className: "left-[53%] bottom-10 size-28" },
  { key: "plot", Emblem: PlotEmblem, className: "right-[7%] bottom-20 size-36" },
] as const;

export function HeroEmblems({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className ?? ""}`}>
      {EMBLEMS.map(({ key, Emblem, className: place }) => (
        <div key={key} className={`absolute ${place} opacity-[0.32]`}>
          <Emblem />
        </div>
      ))}
    </div>
  );
}
