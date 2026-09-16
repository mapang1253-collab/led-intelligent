import type { LucideIcon } from "lucide-react";
import { useId, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * Topic switcher for the result screen, for widths where the navigation rail is not on screen.
 *
 * The rail owns this job wherever there is room for it; duplicating it beside itself would be two
 * controls for one choice. Below that width the rail is a drawer, and switching topic should not
 * cost a drawer open each time, so the strip appears there instead. Both read and write the same
 * `view` in the URL, so they can never disagree about which topic is open.
 *
 * What must NOT move into a tab is the academic disclaimer. docs/output-policy.md §3 forbids it
 * being reachable only through a collapsed area, and an unselected tab panel is exactly that, so it
 * stays above this strip and on screen whichever tab is open — in particular above the price
 * tables, which is the placement §3 rule 3 is about.
 */

export interface ResultTab {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Shown beside the label when there is something countable behind it. */
  readonly count?: number;
  readonly render: () => React.ReactNode;
}

export function ResultTabs({
  tabs,
  activeId,
}: {
  tabs: readonly ResultTab[];
  /** Owned by the URL, so the strip and the navigation rail cannot disagree. */
  activeId: string;
}) {
  const baseId = useId();
  const strip = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  function setActiveId(id: string) {
    const next = new URLSearchParams(params);
    next.set("view", id);
    // Replaced rather than pushed: switching topic is not a step to walk back through.
    navigate({ search: next.toString() }, { replace: true });
  }

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) {
    return null;
  }

  /** Arrow keys move between tabs, as a tablist is expected to (WAI-ARIA authoring practices). */
  function onKeyDown(event: React.KeyboardEvent) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) {
      setActiveId(next.id);
      strip.current
        ?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${baseId}-${next.id}`)}`)
        ?.focus();
    }
  }

  return (
    <div className="mt-5">
      {/* Hidden where the rail is visible: one choice, one control. */}
      {/* Horizontal and scrollable rather than stacked: a phone keeps one row and swipes it. */}
      <div
        ref={strip}
        role="tablist"
        aria-label="หัวข้อผลการวิเคราะห์"
        onKeyDown={onKeyDown}
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`${baseId}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-card border px-4 py-2.5 font-medium text-sm transition-colors"
              style={{
                borderColor: selected ? "var(--color-signature)" : "var(--color-border)",
                backgroundColor: selected ? "var(--color-signature-wash)" : "transparent",
                color: selected ? "var(--color-signature-text)" : "var(--color-ink-muted)",
              }}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="tabular-nums opacity-70">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-${active.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${active.id}`}
      >
        {active.render()}
      </div>
    </div>
  );
}
