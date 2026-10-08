import type { LucideIcon } from "lucide-react";
import { useId, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * Topic switcher for the result screen.
 *
 * It used to appear only below `lg`, because a navigation rail carried the same five links wherever
 * there was room for it, and two controls for one choice is one too many. The rail is gone — the
 * top bar it became is for moving between screens, and switching topic inside a result is not
 * that — so this strip is the only control now, at every width. It reads and writes `view` in the
 * URL, so a link pointing straight at a topic and this strip cannot disagree.
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
  /**
   * The question this topic answers, printed above its cluster in the strip.
   *
   * The same three the top menu groups them under. Five buttons in a row is readable; five buttons
   * in a row that say which of three questions each one is about is readable and tells the reader
   * what the screen is made of before they click anything.
   */
  readonly group?: string;
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
      {/* Shown at every width now. It used to hide above `lg`, where the navigation rail carried
          the same five links; the rail is gone, and switching topic inside a result was never
          navigation anyway. Horizontal and scrollable rather than stacked: a phone keeps one row
          and swipes it. */}
      <div
        ref={strip}
        role="tablist"
        aria-label="หัวข้อผลการวิเคราะห์"
        onKeyDown={onKeyDown}
        className="-mx-1 flex items-end gap-1 overflow-x-auto px-1 pb-1"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id;
          const Icon = tab.icon;
          // Printed once per group, on its first tab. A `role="tablist"` may only hold tabs, so
          // the heading rides inside the button rather than in a wrapper that would break that.
          const opensGroup = tab.group !== undefined && tab.group !== tabs[index - 1]?.group;
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
              className={`shrink-0 whitespace-nowrap rounded-card border px-4 py-2.5 font-medium text-sm transition-colors ${
                opensGroup ? "ml-3 first:ml-0" : ""
              }`}
              style={{
                borderColor: selected ? "var(--color-signature)" : "var(--color-border)",
                backgroundColor: selected ? "var(--color-signature-wash)" : "transparent",
                color: selected ? "var(--color-signature-text)" : "var(--color-ink-muted)",
              }}
            >
              {opensGroup && (
                <span className="mb-1 block text-ink-muted text-xs leading-none">{tab.group}</span>
              )}
              <span className="flex items-center gap-2">
                <Icon size={15} aria-hidden="true" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="tabular-nums opacity-70">{tab.count}</span>
                )}
              </span>
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
