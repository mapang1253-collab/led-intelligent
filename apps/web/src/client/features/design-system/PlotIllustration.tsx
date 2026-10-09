/**
 * The front page's illustration: a plot of land with buildings standing on it.
 *
 * Drawn, never photographed, and deliberately of nowhere. docs/adr/0004 closes the door on
 * property photographs and on anything that reads as evidence about a reader's surroundings; the
 * reason is that a picture beside an analysis is taken for part of it. This is an axonometric
 * diagram with no address, no scale and no source — the visual equivalent of the word "ที่ดิน",
 * there to say what the product is about before a word is read.
 *
 * Everything is drawn from the design tokens, so it follows the theme and the chosen palette
 * rather than carrying colours of its own, and it holds still for a reader who asks their system
 * for less motion.
 */

/** Axonometric projection: a 30-degree ground plane, height straight up the screen. */
const COS30 = Math.cos(Math.PI / 6);

function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * COS30, (x + y) * 0.5 - z];
}

const point = ([x, y]: [number, number]) => `${x.toFixed(2)},${y.toFixed(2)}`;
const polygon = (points: [number, number][]) => points.map(point).join(" ");

/** A drawn segment, as a pair rather than a list, so indexing it needs no guard. */
type Segment = readonly [[number, number], [number, number]];

interface Block {
  readonly id: string;
  /** Footprint on the ground plane. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly height: number;
  /** Floor lines drawn on the two visible walls, as a building of that many storeys would show. */
  readonly storeys: number;
}

/**
 * Three masses rather than one: the question the product asks is what a plot *could* carry, and a
 * single block would illustrate an answer instead of a question. Ordered back to front, which in
 * this projection means by x + y, so the painter's algorithm below is simply their order here.
 */
const BLOCKS: readonly Block[] = [
  { id: "low", x0: 12, y0: 10, x1: 38, y1: 32, height: 15, storeys: 2 },
  { id: "tower", x0: 56, y0: 8, x1: 78, y1: 30, height: 50, storeys: 6 },
  { id: "mid", x0: 16, y0: 54, x1: 46, y1: 80, height: 28, storeys: 4 },
];

/**
 * The plot is drawn larger than the masses standing on it, which is the whole point: the question
 * is what this ground could carry, and buildings filling it edge to edge would answer it.
 */
const PLOT = { x0: 0, y0: 0, x1: 118, y1: 104 } as const;

/** A strip along the near edge. The width of the road in front is a fact the form asks for. */
const ROAD = { from: 110, to: 124 } as const;

/** The ground, its boundary, and the grid a cadastral drawing puts on it. */
function Ground() {
  const corners: [number, number][] = [
    iso(PLOT.x0, PLOT.y0),
    iso(PLOT.x1, PLOT.y0),
    iso(PLOT.x1, PLOT.y1),
    iso(PLOT.x0, PLOT.y1),
  ];
  const step = 16;
  const lines: Segment[] = [];
  for (let x = PLOT.x0 + step; x < PLOT.x1; x += step) {
    lines.push([iso(x, PLOT.y0), iso(x, PLOT.y1)]);
  }
  for (let y = PLOT.y0 + step; y < PLOT.y1; y += step) {
    lines.push([iso(PLOT.x0, y), iso(PLOT.x1, y)]);
  }

  return (
    <g>
      <polygon points={polygon(corners)} fill="var(--map-fill)" />
      {lines.map(([a, b]) => (
        <line
          key={`${point(a)}-${point(b)}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="var(--map-stroke)"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}
      <polygon
        points={polygon(corners)}
        fill="none"
        stroke="var(--map-stroke)"
        strokeWidth={1.4}
        strokeDasharray="5 3"
      />

      <polygon
        points={polygon([
          iso(PLOT.x0, ROAD.from),
          iso(PLOT.x1, ROAD.from),
          iso(PLOT.x1, ROAD.to),
          iso(PLOT.x0, ROAD.to),
        ])}
        fill="var(--map-fill)"
        opacity={0.75}
      />
      <line
        x1={iso(PLOT.x0, (ROAD.from + ROAD.to) / 2)[0]}
        y1={iso(PLOT.x0, (ROAD.from + ROAD.to) / 2)[1]}
        x2={iso(PLOT.x1, (ROAD.from + ROAD.to) / 2)[0]}
        y2={iso(PLOT.x1, (ROAD.from + ROAD.to) / 2)[1]}
        stroke="var(--map-stroke)"
        strokeWidth={0.8}
        strokeDasharray="6 5"
      />
    </g>
  );
}

/** One mass: a lit roof, a wall turned to the light and a wall turned away. */
function Mass({ block, index }: { block: Block; index: number }) {
  const { x0, y0, x1, y1, height: h } = block;

  const roof: [number, number][] = [iso(x0, y0, h), iso(x1, y0, h), iso(x1, y1, h), iso(x0, y1, h)];
  const right: [number, number][] = [iso(x1, y0, h), iso(x1, y1, h), iso(x1, y1), iso(x1, y0)];
  const front: [number, number][] = [iso(x0, y1, h), iso(x1, y1, h), iso(x1, y1), iso(x0, y1)];

  const floors: Segment[] = [];
  for (let s = 1; s < block.storeys; s += 1) {
    const z = (h / block.storeys) * s;
    floors.push([iso(x1, y0, z), iso(x1, y1, z)]);
    floors.push([iso(x0, y1, z), iso(x1, y1, z)]);
  }

  return (
    <g className="plot-mass" style={{ animationDelay: `${index * 140}ms` }}>
      <polygon points={polygon(front)} fill="var(--mass-front)" />
      <polygon points={polygon(right)} fill="var(--mass-right)" />
      <polygon points={polygon(roof)} fill="var(--mass-roof)" />
      {floors.map(([a, b]) => (
        <line
          key={`${block.id}-${point(a)}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="var(--mass-line)"
          strokeWidth={0.4}
        />
      ))}
      <polygon
        points={polygon(roof)}
        fill="none"
        stroke="var(--mass-edge)"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </g>
  );
}

export function PlotIllustration({ className }: { className?: string }) {
  const ground = iso(96, 84);
  const pin = iso(96, 84, 26);

  return (
    <svg
      viewBox="-112 -30 224 160"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <title>ภาพประกอบที่ดินและอาคาร</title>
      <defs>
        {/* A single light direction, expressed once, so every face agrees about where it comes
            from. The tokens behind these flip with the theme, so the drawing does too. */}
        <style>{`
          .plot-scene {
            --mass-roof: color-mix(in srgb, var(--grad-vivid-from) 72%, var(--color-surface));
            --mass-right: color-mix(in srgb, var(--grad-deep-via) 62%, var(--color-surface));
            --mass-front: color-mix(in srgb, var(--grad-deep-to) 58%, var(--color-surface));
            --mass-edge: color-mix(in srgb, var(--grad-vivid-from) 85%, transparent);
            --mass-line: color-mix(in srgb, var(--color-surface) 35%, transparent);
          }
          .plot-mass {
            animation: plot-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
            transform-box: fill-box;
            transform-origin: bottom center;
          }
          @keyframes plot-rise {
            from { opacity: 0; transform: translateY(14px) scaleY(0.82); }
            to { opacity: 1; transform: none; }
          }
          .plot-pin { animation: plot-bob 4s ease-in-out infinite; }
          @keyframes plot-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .plot-mass, .plot-pin { animation: none; }
          }
        `}</style>
      </defs>

      <g className="plot-scene">
        <Ground />
        {BLOCKS.map((block, index) => (
          <Mass key={block.id} block={block} index={index} />
        ))}

        {/* A pin, because placing one is the first thing the form asks for. */}
        <g className="plot-pin">
          <line
            x1={pin[0]}
            y1={pin[1]}
            x2={ground[0]}
            y2={ground[1]}
            stroke="var(--map-marker)"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
          <circle cx={pin[0]} cy={pin[1]} r={4.5} fill="var(--map-marker)" />
          <circle cx={pin[0]} cy={pin[1]} r={1.8} fill="var(--color-surface)" />
        </g>
        <ellipse
          cx={ground[0]}
          cy={ground[1]}
          rx={5}
          ry={2.6}
          fill="var(--map-marker)"
          opacity={0.25}
        />
      </g>
    </svg>
  );
}
