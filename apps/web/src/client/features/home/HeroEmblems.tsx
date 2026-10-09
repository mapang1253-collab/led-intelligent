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
 * Towers, drawn as line work rather than as the soft masses in the scene behind them.
 *
 * The owners asked for the buildings to read as drawn — "ทำรูปแบบตึกให้เส้นเห็นชัด" — so these
 * carry an outline, floor lines and a window grid at full stroke, the way an elevation does. The
 * landscape's own settlements stay soft; these are the drawing laid over it.
 */
function TowersEmblem() {
  const towers = [
    { x: 6, w: 26, h: 86, floors: 7, mast: true },
    { x: 38, w: 34, h: 120, floors: 10, mast: false },
    { x: 78, w: 22, h: 62, floors: 5, mast: false },
    { x: 106, w: 30, h: 100, floors: 8, mast: true },
  ];
  const base = 148;

  return (
    <svg viewBox="0 0 148 160" className="size-full" aria-hidden="true" focusable="false">
      <title>อาคารในเมือง</title>
      <g fill="none" stroke={EMBLEM} strokeWidth={1.4} strokeLinejoin="round">
        {towers.map((tower) => {
          const top = base - tower.h;
          const storey = tower.h / tower.floors;
          return (
            <g key={tower.x}>
              <rect x={tower.x} y={top} width={tower.w} height={tower.h} />
              {tower.mast && (
                <line
                  x1={tower.x + tower.w / 2}
                  y1={top}
                  x2={tower.x + tower.w / 2}
                  y2={top - 12}
                  strokeLinecap="round"
                />
              )}
              {Array.from({ length: tower.floors - 1 }, (_, i) => (
                <line
                  key={`${tower.x}-f${i}`}
                  x1={tower.x}
                  y1={top + storey * (i + 1)}
                  x2={tower.x + tower.w}
                  y2={top + storey * (i + 1)}
                  strokeWidth={0.6}
                  opacity={0.65}
                />
              ))}
              {/* One lit window per floor, which is what a drawn skyline uses to say "occupied". */}
              {Array.from({ length: tower.floors - 1 }, (_, i) => (
                <rect
                  key={`${tower.x}-w${i}`}
                  x={tower.x + (i % 2 === 0 ? 5 : tower.w - 11)}
                  y={top + storey * (i + 1) - storey * 0.62}
                  width={6}
                  height={storey * 0.4}
                  strokeWidth={0.6}
                  opacity={0.8}
                />
              ))}
            </g>
          );
        })}
        <line x1={0} y1={base} x2={148} y2={base} strokeWidth={1.1} />
      </g>
    </svg>
  );
}

/**
 * The emblems, spread across the band.
 *
 * Sizes and vertical offsets differ on purpose: a row of four identical boxes reads as a toolbar,
 * and this is meant to read as things lying on the ground at different distances.
 */
const EMBLEMS = [
  {
    key: "map",
    Emblem: ThailandEmblem,
    className: "left-[2%] bottom-2 h-[15rem] w-[10rem]",
    opacity: 0.3,
  },
  { key: "globe", Emblem: GlobeEmblem, className: "left-[22%] bottom-24 size-24", opacity: 0.3 },
  {
    key: "towers",
    Emblem: TowersEmblem,
    className: "left-[36%] bottom-0 h-[11rem] w-[10rem]",
    opacity: 0.42,
  },
  { key: "pin", Emblem: PinEmblem, className: "right-[26%] bottom-6 size-24", opacity: 0.3 },
  { key: "plot", Emblem: PlotEmblem, className: "right-[5%] bottom-20 size-36", opacity: 0.3 },
] as const;

export function HeroEmblems({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className ?? ""}`}>
      {EMBLEMS.map(({ key, Emblem, className: place, opacity }) => (
        <div key={key} className={`absolute ${place}`} style={{ opacity }}>
          <Emblem />
        </div>
      ))}
    </div>
  );
}
