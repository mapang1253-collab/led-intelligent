import type { LucideIcon } from "lucide-react";

/**
 * A heading in a coloured band, so a reader can see the structure before reading a word.
 *
 * The result screens are long columns of Thai text at three or four weights: a panel title, a
 * group title, a cohort, a caveat, a source line. The owners called it ลายตา and the cause was
 * that every level was distinguished only by size, and the steps between sizes were small — a
 * `text-lg` bold panel title above a `font-semibold` group title is two pixels of difference doing
 * the work of a hierarchy.
 *
 * Colour does that work instead, which leaves size free to say which level is which. Both bands
 * take their own token rather than the signature, which they used to share with the links, the
 * chart fills and the primary button around them — too much of one blue, and the headings stopped
 * separating anything. The token flips with the theme, so both read light and dark.
 *
 * Two levels only. A third would be back to telling them apart by eye.
 */

/** A panel's own title: the widest band, with the panel's icon. */
export function PanelHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2
      className="flex items-center gap-2.5 rounded-card border-l-4 px-4 py-3 font-bold text-lg tracking-tight"
      style={{
        backgroundColor: "var(--color-heading-wash)",
        borderLeftColor: "var(--color-heading)",
        color: "var(--color-heading)",
      }}
    >
      <Icon size={19} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </h2>
  );
}

/**
 * A group's title inside a panel: the same band, one step down.
 *
 * `subtitle` is for the thing that qualifies the title rather than continuing it — the area an
 * evidence group describes, most often. It used to be appended after a dot in a third weight, and
 * a line that runs measure, dot, area that way is read as neither.
 */
export function GroupHeading({
  icon: Icon,
  subtitle,
  children,
}: {
  icon?: LucideIcon;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-card border-l-4 px-3.5 py-2.5"
      style={{
        backgroundColor: "var(--color-heading-wash)",
        borderLeftColor: "var(--color-heading)",
      }}
    >
      <h3 className="font-bold text-base leading-snug" style={{ color: "var(--color-heading)" }}>
        {children}
      </h3>
      {subtitle && (
        <p
          className="mt-0.5 flex items-center gap-1.5 font-medium text-xs"
          style={{ color: "var(--color-heading)", opacity: 0.85 }}
        >
          {Icon && <Icon size={13} className="shrink-0" aria-hidden="true" />}
          {subtitle}
        </p>
      )}
    </div>
  );
}
