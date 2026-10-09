/**
 * The front page's backdrop: a painted landscape, not a plan.
 *
 * The first version of this drew the ground as a cadastral wireframe — thin strokes on flat fills —
 * and the owners were right that it read as a diagram rather than as a place. This one is built
 * the way a painting is: layers of land receding into haze, a sun low behind the ridges, a river
 * carrying its light, and a valley floor that darkens toward the viewer. There is not a hairline
 * stroke in it.
 *
 * It is still of nowhere, and that is deliberate. docs/adr/0004 closes the door on property
 * photographs and on anything that reads as evidence about a reader's surroundings, because a
 * picture beside an analysis is taken for part of it. No coordinate here corresponds to anything
 * on earth: the ridges come from a seeded fractal, the fields from a grid under perspective.
 *
 * Every colour is a design token, so the scene follows the theme and the chosen palette.
 */

/**
 * The light, as three colours of its own.
 *
 * These are literals rather than tokens on purpose, and they are the only ones in the file. A
 * landscape with one hue has no light in it — what reads as sunlight is the meeting of a warm
 * source and cool shade, and the palette tokens are all one side of that. They are the colour of
 * the sun in this picture, nothing else: in particular they are not `--color-partial`, which is
 * amber because PARTIAL means something in this product and must not be spent on scenery.
 */
const SUN_CORE = "#fff4de";
const SUN_WARM = "#ffcf96";
const SHADE_COOL = "#1b2a52";

const WIDTH = 1440;
const HEIGHT = 900;

/** A small deterministic generator: the same landscape every render, on every machine. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * A ridge line, as a sum of waves at halving amplitudes.
 *
 * One sine is a hill; four summed at different rates is a skyline. The phases come from the seed,
 * so each ridge has its own character and none of them repeats the one behind it.
 */
function ridge(baseline: number, amplitude: number, seed: number): string {
  const random = seeded(seed);
  const phases = [random() * 7, random() * 7, random() * 7, random() * 7];
  const rates = [1.1, 2.3, 4.7, 9.1];
  const points: [number, number][] = [];
  const steps = 56;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    let y = 0;
    for (let w = 0; w < rates.length; w += 1) {
      y += Math.sin(t * Math.PI * 2 * (rates[w] as number) + (phases[w] as number)) / 2 ** w;
    }
    points.push([t * WIDTH, baseline - y * amplitude]);
  }

  // Smoothed through its points, then closed down the sides and along the foot of the frame.
  let path = `M ${-20} ${HEIGHT + 20} L ${-20} ${(points[0] as [number, number])[1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i] as [number, number];
    const [x1, y1] = points[i + 1] as [number, number];
    const mx = (x0 + x1) / 2;
    path += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)}, ${mx.toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = points[points.length - 1] as [number, number];
  path += ` L ${WIDTH + 20} ${last[1].toFixed(1)} L ${WIDTH + 20} ${HEIGHT + 20} Z`;
  return path;
}

/**
 * The fields on the valley floor, laid out under a crude perspective: rows grow deeper and columns
 * grow wider as they approach the viewer, the way a patchwork of plots does seen from the air.
 */
interface Field {
  readonly key: string;
  readonly points: string;
  readonly opacity: number;
  readonly tone: number;
}

function buildFields(): Field[] {
  const random = seeded(4242);
  const horizon = 548;
  const rows = 9;
  const cols = 11;
  const fields: Field[] = [];

  /** Depth 0 at the horizon, 1 at the bottom edge; everything widens with it. */
  const depthAt = (row: number) => (row / rows) ** 1.9;
  const yAt = (row: number) => horizon + depthAt(row) * (HEIGHT - horizon + 90);
  /*
    A gentle spread, and a drift that grows with it.

    The first attempt opened from 0.28 to 2.38 across the depth, which turned the columns into
    rays fanning out of the horizon — a sunburst, not a patchwork. Opening by about half as much,
    and sliding each row sideways as it comes forward, keeps the plots reading as plots.
  */
  const xAt = (col: number, row: number) => {
    const depth = depthAt(row);
    const spread = 0.95 + depth * 0.85;
    const drift = depth * 150;
    return WIDTH / 2 + (col / cols - 0.5) * WIDTH * spread - drift;
  };

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const jitter = (random() - 0.5) * 26 * depthAt(row + 1);
      const corners: [number, number][] = [
        [xAt(col, row) + jitter, yAt(row)],
        [xAt(col + 1, row) + jitter, yAt(row)],
        [xAt(col + 1, row + 1) + jitter * 1.6, yAt(row + 1)],
        [xAt(col, row + 1) + jitter * 1.6, yAt(row + 1)],
      ];
      fields.push({
        key: `${row}-${col}`,
        points: corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
        // Faint near the horizon where haze eats everything, stronger as the ground comes forward.
        opacity: 0.1 + random() * 0.2 + depthAt(row) * 0.26,
        tone: random(),
      });
    }
  }
  return fields;
}

const FIELDS = buildFields();

/**
 * Woodland, as clumps of overlapping blobs.
 *
 * A valley of nothing but quadrilaterals reads as graph paper. These break the grid where it meets
 * the hills and where it meets the water, which is where tree cover actually survives being farmed.
 */
interface Clump {
  readonly key: string;
  readonly blobs: { cx: number; cy: number; rx: number; ry: number }[];
  readonly opacity: number;
}

function buildWoods(): Clump[] {
  const random = seeded(31337);
  const anchors: [number, number, number][] = [
    // x, y, spread — along the foot of the hills, then down beside the river.
    [180, 596, 150],
    [430, 580, 120],
    [1040, 586, 160],
    [1300, 604, 130],
    [300, 742, 180],
    [1130, 760, 190],
    [820, 860, 150],
  ];
  return anchors.map(([x, y, spread], index) => ({
    key: `wood-${index}`,
    opacity: 0.24 + random() * 0.18,
    blobs: Array.from({ length: 9 }, () => {
      const r = 20 + random() * 34;
      return {
        cx: x + (random() - 0.5) * spread,
        cy: y + (random() - 0.5) * spread * 0.4,
        rx: r,
        ry: r * (0.55 + random() * 0.25),
      };
    }),
  }));
}

const WOODS = buildWoods();

/** A handful of settlements along the river, as masses of light rather than as drawn buildings. */
const SETTLEMENTS = [
  { x: 548, y: 612, w: 86, h: 26 },
  { x: 712, y: 648, w: 120, h: 34 },
  { x: 898, y: 606, w: 74, h: 22 },
  { x: 628, y: 712, w: 150, h: 40 },
] as const;

export function AerialScene({ className }: { className?: string }) {
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
        {/* Cool overhead, warming as it falls toward the light behind the hills. */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--grad-deep-to)" stopOpacity="0.97" />
          <stop offset="42%" stopColor="var(--grad-deep-via)" stopOpacity="0.6" />
          <stop offset="72%" stopColor="var(--grad-vivid-from)" stopOpacity="0.42" />
          <stop offset="90%" stopColor={SUN_WARM} stopOpacity="0.3" />
          <stop offset="100%" stopColor={SUN_WARM} stopOpacity="0.14" />
        </linearGradient>

        {/* The sun sits just above the furthest ridge and lights everything in front of it. */}
        <radialGradient id="sun" cx="0.58" cy="0.58" r="0.5">
          <stop offset="0%" stopColor={SUN_CORE} stopOpacity="0.95" />
          <stop offset="14%" stopColor={SUN_WARM} stopOpacity="0.72" />
          <stop offset="38%" stopColor="var(--grad-vivid-from)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--grad-vivid-from)" stopOpacity="0" />
        </radialGradient>

        {/* The rim each ridge takes along its crest, strongest on the ones nearest the light. */}
        {[0, 1, 2, 3].map((index) => (
          <linearGradient
            key={`rim-${index}`}
            id={`rim-${index}`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={[404, 426, 446, 468][index]}
            x2="0"
            y2={[470, 500, 530, 566][index]}
          >
            <stop offset="0%" stopColor={SUN_WARM} stopOpacity={0.5 - index * 0.1} />
            <stop offset="45%" stopColor={SUN_WARM} stopOpacity="0" />
          </linearGradient>
        ))}

        {/* Four ridges, each darker and more saturated than the one behind it. */}
        {[0.3, 0.46, 0.64, 0.84].map((depth, index) => (
          <linearGradient key={depth} id={`ridge-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={index < 2 ? "var(--grad-vivid-from)" : "var(--grad-deep-via)"}
              stopOpacity={0.4 + depth * 0.5}
            />
            <stop offset="100%" stopColor="var(--grad-deep-to)" stopOpacity={0.72 + depth * 0.26} />
          </linearGradient>
        ))}

        <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SUN_WARM} stopOpacity="0.22" />
          <stop offset="16%" stopColor="var(--grad-deep-via)" stopOpacity="0.5" />
          <stop offset="58%" stopColor="var(--grad-deep-to)" stopOpacity="0.78" />
          <stop offset="100%" stopColor={SHADE_COOL} stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SUN_CORE} stopOpacity="0.5" />
          <stop offset="22%" stopColor={SUN_WARM} stopOpacity="0.44" />
          <stop offset="52%" stopColor="var(--grad-vivid-from)" stopOpacity="0.72" />
          <stop offset="100%" stopColor="var(--grad-vivid-via)" stopOpacity="0.5" />
        </linearGradient>

        <filter id="haze" x="-20%" y="-60%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="soft" x="-30%" y="-80%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="glow" x="-40%" y="-120%" width="180%" height="400%">
          <feGaussianBlur stdDeviation="16" />
        </filter>

        {/* A breath of grain over everything, so the gradients do not band on a wide screen. */}
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="var(--terrain-base)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#sky)" />

      {/* Sun, and the light it throws forward along the valley. */}
      <ellipse cx={WIDTH * 0.58} cy={430} rx={520} ry={330} fill="url(#sun)" />
      {/* The disc, kept small and warm. White and wide, it stopped being a sun and became a
          smudge where the river meets the horizon. */}
      <ellipse
        cx={WIDTH * 0.58}
        cy={454}
        rx={74}
        ry={22}
        fill={SUN_CORE}
        opacity={0.42}
        filter="url(#glow)"
      />

      {/* Ridges, back to front. Each gets a band of haze at its foot, which is what makes the one
          in front of it read as nearer rather than merely lower. */}
      {[
        { baseline: 456, amplitude: 52, seed: 11, fill: "url(#ridge-0)" },
        { baseline: 492, amplitude: 66, seed: 29, fill: "url(#ridge-1)" },
        { baseline: 524, amplitude: 78, seed: 53, fill: "url(#ridge-2)" },
        { baseline: 560, amplitude: 92, seed: 97, fill: "url(#ridge-3)" },
      ].map((layer, index) => (
        <g key={layer.seed}>
          <path d={ridge(layer.baseline, layer.amplitude, layer.seed)} fill={layer.fill} />
          <rect
            x={-40}
            y={layer.baseline - 6}
            width={WIDTH + 80}
            height={46}
            fill="var(--grad-vivid-from)"
            opacity={0.3 - index * 0.055}
            filter="url(#haze)"
          />
        </g>
      ))}

      {/* The floor of the valley, and the plots on it. */}
      <rect x={0} y={520} width={WIDTH} height={HEIGHT - 520} fill="url(#valley)" />
      {FIELDS.map((field) => (
        <polygon
          key={field.key}
          points={field.points}
          fill={
            field.tone > 0.72
              ? "var(--grad-vivid-from)"
              : field.tone > 0.4
                ? "var(--grad-deep-via)"
                : "var(--color-surface)"
          }
          opacity={field.opacity}
        />
      ))}

      {WOODS.map((clump) => (
        <g key={clump.key} opacity={clump.opacity} filter="url(#soft)">
          {clump.blobs.map((blob) => (
            <ellipse
              key={`${blob.cx}-${blob.cy}`}
              cx={blob.cx}
              cy={blob.cy}
              rx={blob.rx}
              ry={blob.ry}
              fill="var(--grad-deep-to)"
            />
          ))}
        </g>
      ))}

      {/* The river, widening as it comes forward, with its own glow over the fields it crosses. */}
      <path
        d={`M ${WIDTH * 0.57} 548
            C ${WIDTH * 0.54} 620, ${WIDTH * 0.62} 664, ${WIDTH * 0.54} 724
            S ${WIDTH * 0.38} 820, ${WIDTH * 0.3} ${HEIGHT + 30}
            L ${WIDTH * 0.47} ${HEIGHT + 30}
            C ${WIDTH * 0.53} 820, ${WIDTH * 0.66} 712, ${WIDTH * 0.6} 548 Z`}
        fill="url(#river)"
      />
      <path
        d={`M ${WIDTH * 0.575} 548
            C ${WIDTH * 0.545} 620, ${WIDTH * 0.625} 664, ${WIDTH * 0.545} 724
            S ${WIDTH * 0.39} 820, ${WIDTH * 0.31} ${HEIGHT + 30}`}
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth={22}
        opacity={0.13}
        filter="url(#soft)"
      />

      {SETTLEMENTS.map((place) => (
        <g key={`${place.x}-${place.y}`}>
          <ellipse
            cx={place.x + place.w / 2}
            cy={place.y + place.h / 2}
            rx={place.w}
            ry={place.h}
            fill="var(--grad-vivid-from)"
            opacity={0.3}
            filter="url(#glow)"
          />
          <rect
            x={place.x}
            y={place.y}
            width={place.w}
            height={place.h}
            rx={6}
            fill="var(--color-surface)"
            opacity={0.3}
            filter="url(#soft)"
          />
        </g>
      ))}

      {/* Depth, last: haze along the horizon, a darker foreground, and a vignette at the edges. */}
      {/* The horizon is where the light pools, so the haze there is the warmest thing in frame. */}
      <rect
        x={-40}
        y={508}
        width={WIDTH + 80}
        height={74}
        fill={SUN_WARM}
        opacity={0.2}
        filter="url(#haze)"
      />
      {/* The near ground is out of the light, and falls into cool shade rather than into grey. */}
      <rect
        x={0}
        y={HEIGHT * 0.68}
        width={WIDTH}
        height={HEIGHT * 0.32}
        fill={SHADE_COOL}
        opacity={0.3}
      />
      <radialGradient id="vignette" cx="0.5" cy="0.44" r="0.78">
        <stop offset="60%" stopColor={SHADE_COOL} stopOpacity="0" />
        <stop offset="100%" stopColor={SHADE_COOL} stopOpacity="0.72" />
      </radialGradient>
      <rect width={WIDTH} height={HEIGHT} fill="url(#vignette)" />
      <rect width={WIDTH} height={HEIGHT} filter="url(#grain)" opacity={0.045} />
    </svg>
  );
}
