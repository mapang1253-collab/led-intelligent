/**
 * The front page's aerial scene: a stylised plan of land, tilted away from the reader.
 *
 * Drawn, never photographed. docs/adr/0004 closes the door on property photographs and on anything
 * that reads as evidence about a reader's surroundings, because a picture beside an analysis is
 * taken for part of it. Nothing here is a place: the parcels come from a seeded grid, the river is
 * a curve, and no coordinate in this file corresponds to anything on earth.
 *
 * What it is for is saying, before a word is read, what the product looks at — ground divided into
 * parcels, with figures attached to parts of it. That is the product's whole shape, and the
 * callouts above this scene carry the system's own live counts rather than invented ones.
 *
 * Every colour is a design token, so the scene follows the theme and the chosen palette.
 */

/** A small deterministic generator: the same land every render, on every machine. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const WIDTH = 1200;
const HEIGHT = 820;
const COLS = 13;
const ROWS = 9;

/**
 * The parcel grid, jittered at its interior joints so neighbouring plots share edges exactly —
 * a tessellation rather than a set of rectangles with gaps between them, which is what a cadastral
 * plan actually looks like.
 */
function buildGrid(): { x: number; y: number }[][] {
  const random = seeded(20260926);
  const cellW = WIDTH / COLS;
  const cellH = HEIGHT / ROWS;
  const grid: { x: number; y: number }[][] = [];
  for (let row = 0; row <= ROWS; row += 1) {
    const line: { x: number; y: number }[] = [];
    for (let col = 0; col <= COLS; col += 1) {
      const edge = row === 0 || col === 0 || row === ROWS || col === COLS;
      const jitter = edge ? 0 : 0.34;
      line.push({
        x: col * cellW + (random() - 0.5) * cellW * jitter,
        y: row * cellH + (random() - 0.5) * cellH * jitter,
      });
    }
    grid.push(line);
  }
  return grid;
}

const GRID = buildGrid();

/**
 * Which tint a plot takes.
 *
 * Denser towards the middle and open towards the edges, the way a town thins into its outskirts.
 * The tints are all drawn from the palette's own gradient, never from the status colours — green
 * and amber mean PASS and PARTIAL in this product, and spending them on decoration would blunt the
 * one place they carry meaning.
 */
const TINTS = [
  "color-mix(in srgb, var(--grad-deep-to) 26%, transparent)",
  "color-mix(in srgb, var(--grad-deep-via) 22%, transparent)",
  "color-mix(in srgb, var(--grad-vivid-from) 17%, transparent)",
  "color-mix(in srgb, var(--grad-deep-via) 11%, transparent)",
  "color-mix(in srgb, var(--grad-vivid-to) 30%, transparent)",
] as const;

interface Plot {
  readonly key: string;
  readonly points: string;
  readonly fill: string;
  /** Central plots carry a building; the outskirts stay open ground. */
  readonly building: { x: number; y: number; w: number; h: number } | null;
}

function buildPlots(): Plot[] {
  const random = seeded(777);
  const plots: Plot[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const a = GRID[row]?.[col];
      const b = GRID[row]?.[col + 1];
      const c = GRID[row + 1]?.[col + 1];
      const d = GRID[row + 1]?.[col];
      if (!a || !b || !c || !d) {
        continue;
      }

      // Distance from the middle, normalised, as the measure of how built-up a plot is.
      const dx = (col + 0.5) / COLS - 0.5;
      const dy = (row + 0.5) / ROWS - 0.5;
      const fromCentre = Math.sqrt(dx * dx + dy * dy) * 2;
      const density = Math.max(0, 1 - fromCentre) + random() * 0.35;

      const tint = density > 0.85 ? 1 : density > 0.6 ? 2 : density > 0.38 ? 0 : 3;
      const left = Math.min(a.x, d.x);
      const right = Math.max(b.x, c.x);
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(c.y, d.y);
      const inset = 0.3 + random() * 0.16;

      plots.push({
        key: `${row}-${col}`,
        points: [a, b, c, d].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
        fill: TINTS[tint] as string,
        building:
          density > 0.72
            ? {
                x: left + (right - left) * inset * 0.5,
                y: top + (bottom - top) * inset * 0.5,
                w: (right - left) * (1 - inset),
                h: (bottom - top) * (1 - inset),
              }
            : null,
      });
    }
  }
  return plots;
}

const PLOTS = buildPlots();

/** The river, as a curve through the plan rather than along its joints. */
const RIVER = `M ${-40} ${HEIGHT * 0.26}
  C ${WIDTH * 0.22} ${HEIGHT * 0.34}, ${WIDTH * 0.3} ${HEIGHT * 0.62}, ${WIDTH * 0.52} ${HEIGHT * 0.66}
  S ${WIDTH * 0.84} ${HEIGHT * 0.56}, ${WIDTH + 40} ${HEIGHT * 0.82}`;

/** Two roads, drawn along grid lines so they read as boundaries the plots were cut against. */
const ROAD_ROWS = [3, 6] as const;
const ROAD_COLS = [4, 9] as const;

function roadPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

export function AerialScene({ className }: { className?: string }) {
  const roads: string[] = [];
  for (const row of ROAD_ROWS) {
    const line = GRID[row];
    if (line) {
      roads.push(roadPath(line));
    }
  }
  for (const col of ROAD_COLS) {
    const line = GRID.map((row) => row[col]).filter((p): p is { x: number; y: number } =>
      Boolean(p),
    );
    roads.push(roadPath(line));
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="aerial-sheen" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="var(--grad-vivid-from)" stopOpacity="0.22" />
          <stop offset="55%" stopColor="var(--grad-deep-via)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--grad-deep-to)" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="aerial-light" cx="0.46" cy="0.3" r="0.72">
          <stop offset="0%" stopColor="var(--grad-vivid-from)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--grad-vivid-from)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        width={WIDTH}
        height={HEIGHT}
        fill="color-mix(in srgb, var(--grad-deep-to) 34%, var(--terrain-base))"
      />

      {PLOTS.map((plot) => (
        <polygon
          key={plot.key}
          points={plot.points}
          fill={plot.fill}
          stroke="color-mix(in srgb, var(--grad-vivid-from) 26%, transparent)"
          strokeWidth={1.1}
        />
      ))}

      {/* Water reads as the one thing that is not a plot, so it takes the brightest tint. */}
      <path
        d={RIVER}
        fill="none"
        stroke={TINTS[4]}
        strokeWidth={34}
        strokeLinecap="round"
        opacity={0.95}
      />
      <path
        d={RIVER}
        fill="none"
        stroke="color-mix(in srgb, var(--grad-vivid-from) 55%, transparent)"
        strokeWidth={1.2}
        strokeDasharray="10 9"
      />

      {roads.map((path) => (
        <g key={path}>
          <path
            d={path}
            fill="none"
            stroke="color-mix(in srgb, var(--color-surface) 22%, transparent)"
            strokeWidth={13}
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke="color-mix(in srgb, var(--grad-vivid-from) 42%, transparent)"
            strokeWidth={1.2}
            strokeDasharray="14 12"
          />
        </g>
      ))}

      {/* Footprints, with one offset copy each: enough to read as built, flat enough to stay a plan. */}
      {PLOTS.filter((plot) => plot.building !== null).map((plot) => {
        const b = plot.building as NonNullable<Plot["building"]>;
        return (
          <g key={`b-${plot.key}`}>
            <rect
              x={b.x + 3}
              y={b.y + 4}
              width={b.w}
              height={b.h}
              rx={3}
              fill="color-mix(in srgb, var(--grad-deep-to) 55%, transparent)"
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={3}
              fill="color-mix(in srgb, var(--grad-vivid-from) 46%, var(--color-surface))"
              stroke="color-mix(in srgb, var(--color-surface) 45%, transparent)"
              strokeWidth={0.8}
            />
          </g>
        );
      })}

      <rect width={WIDTH} height={HEIGHT} fill="url(#aerial-light)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#aerial-sheen)" />
    </svg>
  );
}
