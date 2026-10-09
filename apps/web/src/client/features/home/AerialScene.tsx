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
 * These three are literals rather than tokens on purpose, and the only ones in the file. A
 * landscape with one hue has no light in it — what reads as sunlight is the meeting of a warm
 * source and the dark it fails to reach, and the palette tokens are all one side of that. They are
 * the colour of
 * the sun in this picture, nothing else: in particular they are not `--color-partial`, which is
 * amber because PARTIAL means something in this product and must not be spent on scenery.
 */
const SUN_CORE = "#ffeec4";
const SUN_WARM = "#f0b45e";
/**
 * The aurora over the hills, laid across the sky in soft bands well above the ridgeline.
 *
 * Teal into blue, not teal into green. The first pass went green enough that the sky stopped
 * belonging to the rest of the product, which is blue everywhere else; the owners asked for the
 * green pulled back and the theme's own colour put in its place.
 */
const AURORA_TEAL = "#1f9fb8";
const AURORA_GREEN = "#2b6fd4";
/**
 * The sky overhead, the far side of every ridge, and the ground nearest the viewer — everything
 * well out of the light.
 *
 * Darker than `--terrain-base` on purpose. The scene sits behind the page's own backdrop and its
 * own type, and a hero bright enough to look good on its own washes both out; the owners asked for
 * it dimmer, and this is the colour everything falls toward.
 */
const NIGHT = "#070d1c";

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
        opacity: 0.06 + random() * 0.13 + depthAt(row) * 0.17,
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

/**
 * Stars, scattered over the upper sky and kept away from the glow behind the hills.
 *
 * A meteor needs something to cross. Without a star field the streak reads as a scratch on the
 * screen rather than as something happening in the sky.
 */
interface Star {
  readonly key: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly opacity: number;
  /** Seconds, so no two stars breathe together. */
  readonly delay: number;
}

function buildStars(): Star[] {
  const random = seeded(90210);
  const stars: Star[] = [];
  for (let i = 0; i < 90; i += 1) {
    const cx = random() * WIDTH;
    const cy = 20 + random() * 400;
    // The sky washes out toward the sun, so nothing is drawn where it would not be seen.
    const nearSun = Math.hypot(cx - WIDTH * 0.58, (cy - 430) * 1.6) < 420;
    if (nearSun && random() > 0.18) {
      continue;
    }
    stars.push({
      key: `star-${i}`,
      cx,
      cy,
      r: 0.7 + random() * 1.5,
      // Fainter toward the horizon, as atmosphere actually does to them.
      opacity: (0.25 + random() * 0.6) * (1 - cy / 560),
      delay: random() * 6,
    });
  }
  return stars;
}

const STARS = buildStars();

/**
 * Meteors: three, crossing rarely rather than raining.
 *
 * Each is drawn once at the origin pointing down-right, and the animation carries it across its
 * own stretch of sky. The long gaps between them are the point — a shower would be weather, and
 * this is meant to be something the eye catches now and then.
 */
const METEORS = [
  { key: "m1", from: [120, 40], to: [720, 320], length: 170, duration: 2.1, delay: 1.5, every: 13 },
  {
    key: "m2",
    from: [760, 20],
    to: [1340, 290],
    length: 130,
    duration: 1.7,
    delay: 7.5,
    every: 13,
  },
  {
    key: "m3",
    from: [380, 120],
    to: [1020, 420],
    length: 200,
    duration: 2.4,
    delay: 11,
    every: 13,
  },
] as const;

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
          <stop offset="0%" stopColor={NIGHT} stopOpacity="0.99" />
          <stop offset="36%" stopColor={NIGHT} stopOpacity="0.9" />
          <stop offset="68%" stopColor="var(--grad-deep-to)" stopOpacity="0.6" />
          <stop offset="90%" stopColor={SUN_WARM} stopOpacity="0.16" />
          <stop offset="100%" stopColor={SUN_WARM} stopOpacity="0.07" />
        </linearGradient>

        {/* The sun sits just above the furthest ridge and lights everything in front of it. */}
        <radialGradient id="sun" cx="0.58" cy="0.58" r="0.5">
          <stop offset="0%" stopColor={SUN_CORE} stopOpacity="0.52" />
          <stop offset="14%" stopColor={SUN_WARM} stopOpacity="0.34" />
          <stop offset="38%" stopColor="var(--grad-vivid-from)" stopOpacity="0.19" />
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
            <stop offset="0%" stopColor={SUN_WARM} stopOpacity={0.34 - index * 0.07} />
            <stop offset="45%" stopColor={SUN_WARM} stopOpacity="0" />
          </linearGradient>
        ))}

        {/* Four ridges, each darker and more saturated than the one behind it. */}
        {[0.3, 0.46, 0.64, 0.84].map((depth, index) => (
          <linearGradient key={depth} id={`ridge-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={index < 2 ? "var(--grad-vivid-from)" : "var(--grad-deep-via)"}
              stopOpacity={0.3 + depth * 0.45}
            />
            <stop offset="100%" stopColor={NIGHT} stopOpacity={0.74 + depth * 0.24} />
          </linearGradient>
        ))}

        <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SUN_WARM} stopOpacity="0.12" />
          <stop offset="16%" stopColor="var(--grad-deep-via)" stopOpacity="0.4" />
          <stop offset="58%" stopColor="var(--grad-deep-to)" stopOpacity="0.84" />
          <stop offset="100%" stopColor={NIGHT} stopOpacity="0.96" />
        </linearGradient>

        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SUN_CORE} stopOpacity="0.38" />
          <stop offset="22%" stopColor={SUN_WARM} stopOpacity="0.32" />
          <stop offset="52%" stopColor="var(--grad-vivid-from)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--grad-vivid-via)" stopOpacity="0.38" />
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

        {/* Each band is its own soft brush stroke; three of them overlapping is what gives the
            light its folds. */}
        <linearGradient id="aurora-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AURORA_TEAL} stopOpacity="0" />
          <stop offset="45%" stopColor={AURORA_TEAL} stopOpacity="0.55" />
          <stop offset="100%" stopColor={AURORA_GREEN} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aurora-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AURORA_GREEN} stopOpacity="0" />
          <stop offset="55%" stopColor={AURORA_GREEN} stopOpacity="0.5" />
          <stop offset="100%" stopColor={AURORA_TEAL} stopOpacity="0" />
        </linearGradient>
        <filter id="aurora-blur" x="-30%" y="-80%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="24" />
        </filter>

        <linearGradient id="meteor-tail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SUN_CORE} stopOpacity="0" />
          <stop offset="70%" stopColor={SUN_CORE} stopOpacity="0.35" />
          <stop offset="100%" stopColor={SUN_CORE} stopOpacity="0.95" />
        </linearGradient>

        <style>{`
          .star { animation: star-breathe 5s ease-in-out infinite; }
          @keyframes star-breathe {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
          }
          ${METEORS.map(
            (meteor) => `
          .${meteor.key} {
            offset-rotate: 0deg;
            /* The fill mode matters: without it the 0% frame does not apply during the delay, so
               each meteor hangs in the sky as a motionless streak until its turn comes round. */
            animation: fly-${meteor.key} ${meteor.every}s linear ${meteor.delay}s infinite both;
          }
          @keyframes fly-${meteor.key} {
            0% { transform: translate(${meteor.from[0]}px, ${meteor.from[1]}px); opacity: 0; }
            ${((0.08 / meteor.every) * 100).toFixed(2)}% { opacity: 0; }
            ${((0.5 / meteor.every) * 100).toFixed(2)}% { opacity: 1; }
            ${(((meteor.duration * 0.82) / meteor.every) * 100).toFixed(2)}% { opacity: 1; }
            ${((meteor.duration / meteor.every) * 100).toFixed(2)}% {
              transform: translate(${meteor.to[0]}px, ${meteor.to[1]}px);
              opacity: 0;
            }
            100% { transform: translate(${meteor.to[0]}px, ${meteor.to[1]}px); opacity: 0; }
          }`,
          ).join("")}
          @media (prefers-reduced-motion: reduce) {
            .star, ${METEORS.map((meteor) => `.${meteor.key}`).join(", ")} { animation: none; }
            ${METEORS.map((meteor) => `.${meteor.key}`).join(", ")} { opacity: 0; }
          }
        `}</style>

        {/* A breath of grain over everything, so the gradients do not band on a wide screen. */}
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="var(--terrain-base)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#sky)" />

      {STARS.map((star) => (
        <circle
          key={star.key}
          className="star"
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill={SUN_CORE}
          opacity={star.opacity}
          style={{ animationDelay: `${star.delay.toFixed(2)}s` }}
        />
      ))}

      {METEORS.map((meteor) => (
        <g key={meteor.key} className={meteor.key} style={{ transformBox: "view-box" }}>
          <rect
            x={-meteor.length}
            y={-0.9}
            width={meteor.length}
            height={1.8}
            rx={0.9}
            fill="url(#meteor-tail)"
            transform="rotate(24)"
          />
          <circle r={1.8} fill={SUN_CORE} />
        </g>
      ))}

      {/*
        The aurora, between the stars and the hills.

        Drawn as three broad curves rather than one, because a single band reads as a smear; the
        places where they cross are what look like folds. Blurred hard and kept faint — it is
        weather in the sky, not a light source, and the sun below it still sets the scene's key.
      */}
      <g filter="url(#aurora-blur)" opacity={0.7}>
        <path
          d="M -80 232 C 240 120, 520 300, 760 196 S 1240 120, 1520 250 L 1520 400 C 1240 300, 980 420, 740 352 S 220 300, -80 392 Z"
          fill="url(#aurora-a)"
        />
        <path
          d="M -80 318 C 300 232, 600 372, 900 280 S 1300 232, 1520 330 L 1520 452 C 1280 372, 1000 472, 700 412 S 240 400, -80 468 Z"
          fill="url(#aurora-b)"
        />
        <path
          d="M -80 160 C 200 96, 440 216, 680 140 S 1120 72, 1520 180 L 1520 268 C 1160 196, 900 292, 640 236 S 180 212, -80 280 Z"
          fill="url(#aurora-a)"
          opacity={0.6}
        />
      </g>

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
        opacity={0.24}
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
          {/* The same silhouette again, carrying only the light that catches along its crest. */}
          <path
            d={ridge(layer.baseline, layer.amplitude, layer.seed)}
            fill={`url(#rim-${index})`}
          />
          <rect
            x={-40}
            y={layer.baseline - 6}
            width={WIDTH + 80}
            height={46}
            fill={index < 2 ? SUN_WARM : "var(--grad-vivid-from)"}
            opacity={0.17 - index * 0.032}
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
            field.tone > 0.84
              ? SUN_WARM
              : field.tone > 0.62
                ? "var(--grad-vivid-from)"
                : field.tone > 0.3
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
        opacity={0.09}
        filter="url(#haze)"
      />
      {/* The near ground is out of the light, and falls into cool shade rather than into grey. */}
      <rect
        x={0}
        y={HEIGHT * 0.68}
        width={WIDTH}
        height={HEIGHT * 0.32}
        fill={NIGHT}
        opacity={0.46}
      />
      <radialGradient id="vignette" cx="0.5" cy="0.44" r="0.78">
        <stop offset="50%" stopColor={NIGHT} stopOpacity="0" />
        <stop offset="100%" stopColor={NIGHT} stopOpacity="0.92" />
      </radialGradient>
      <rect width={WIDTH} height={HEIGHT} fill="url(#vignette)" />
      <rect width={WIDTH} height={HEIGHT} filter="url(#grain)" opacity={0.045} />
    </svg>
  );
}
