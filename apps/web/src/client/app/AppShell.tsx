import { th } from "@reis/i18n";
import {
  Activity,
  Building2,
  Calculator,
  ChevronDown,
  Coins,
  LayoutList,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Menu,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { TerrainBackdrop } from "../features/design-system/TerrainBackdrop.js";
import { useFavourites } from "../features/intake/useFavourites.js";

/**
 * The application frame: a bar across the top, and a panel that drops out of it.
 *
 * It was a rail down the left side, which put eight links in one column and made a reader read all
 * of them to find the two that were about where they are. The bar names the three things the
 * product does — start, read a result, check the system — and the panel under each has room to say
 * what its links lead to, which a rail never had.
 *
 * Switching topic inside a result is not navigation and does not belong here: the result screen
 * carries its own strip for that, which is now shown at every width because the rail that used to
 * duplicate it is gone.
 *
 * There is still no history list and no way back to an earlier run. Runs are anonymous and expire
 * after 24 hours, which is a product decision rather than a missing feature
 * (docs/project-overview.md §38).
 */

export const RESULT_VIEWS = ["overview", "prices", "area", "valuation", "concepts"] as const;
export type ResultView = (typeof RESULT_VIEWS)[number];

interface PanelLink {
  readonly to: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: LucideIcon;
  /** Shown beside the label, for a link that counts something. */
  readonly count?: number;
}

interface PanelColumn {
  readonly heading: string;
  readonly links: readonly PanelLink[];
}

/** The five result topics, grouped into the three questions they answer. */
const RESULT_COLUMNS: readonly {
  heading: string;
  items: readonly { view: ResultView; label: string; hint: string; icon: LucideIcon }[];
}[] = [
  {
    heading: th.nav.resultGroupPlace,
    items: [
      {
        view: "overview",
        label: th.resultTabs.overview,
        hint: th.nav.overviewHint,
        icon: LayoutList,
      },
      { view: "area", label: th.resultTabs.area, hint: th.nav.areaHint, icon: Users },
    ],
  },
  {
    heading: th.nav.resultGroupMoney,
    items: [
      { view: "prices", label: th.resultTabs.prices, hint: th.nav.pricesHint, icon: Coins },
      {
        view: "valuation",
        label: th.resultTabs.valuation,
        hint: th.nav.valuationHint,
        icon: Calculator,
      },
    ],
  },
  {
    heading: th.nav.resultGroupIdeas,
    items: [
      {
        view: "concepts",
        label: th.resultTabs.concepts,
        hint: th.nav.conceptsHint,
        icon: Lightbulb,
      },
    ],
  },
];

/** The view a result screen should show, read from the URL so a link can point straight at one. */
export function useResultView(): ResultView {
  const [params] = useSearchParams();
  const requested = params.get("view");
  return RESULT_VIEWS.includes(requested as ResultView) ? (requested as ResultView) : "overview";
}

/**
 * The open run, read from the path rather than from route params: the bar is mounted by the
 * catch-all route that wraps the inner routes, so `useParams` there sees no `:runId`.
 */
function runIdFromPath(pathname: string): string | null {
  const match = /^\/runs\/([^/?#]+)/.exec(pathname);
  return match?.[1] ?? null;
}

function PanelLinkRow({
  link,
  onNavigate,
}: { link: PanelLink; onNavigate?: (() => void) | undefined }) {
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className="flex items-start gap-2.5 rounded-card px-3 py-2.5 transition-colors hover:bg-surface-sunken"
    >
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-semibold text-sm">
          {link.label}
          {link.count !== undefined && link.count > 0 && (
            <span className="ml-1.5 tabular-nums font-normal opacity-70">({link.count})</span>
          )}
        </span>
        <span className="mt-0.5 block text-ink-muted text-xs leading-relaxed">{link.hint}</span>
      </span>
    </Link>
  );
}

/** A locked topic: shown, so a reader deciding whether to start can see what starting will give. */
function PanelLinkLocked({ link }: { link: PanelLink }) {
  const Icon = link.icon;
  return (
    <span aria-disabled="true" className="flex items-start gap-2.5 px-3 py-2.5 opacity-40">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-semibold text-sm">{link.label}</span>
        <span className="mt-0.5 block text-ink-muted text-xs leading-relaxed">{link.hint}</span>
      </span>
    </span>
  );
}

function MenuPanel({
  columns,
  footer,
  onNavigate,
  locked = false,
}: {
  columns: readonly PanelColumn[];
  footer?: string | undefined;
  onNavigate?: (() => void) | undefined;
  locked?: boolean;
}) {
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {columns.map((column) => (
        <div key={column.heading}>
          <p className="px-3 pb-1 font-semibold text-ink-muted text-xs">{column.heading}</p>
          {column.links.map((link) =>
            locked ? (
              <PanelLinkLocked key={link.label} link={link} />
            ) : (
              <PanelLinkRow key={link.label} link={link} onNavigate={onNavigate} />
            ),
          )}
        </div>
      ))}
      {footer && (
        <p className="px-3 text-ink-muted text-xs leading-relaxed sm:col-span-2 lg:col-span-3">
          {footer}
        </p>
      )}
    </div>
  );
}

type MenuId = "start" | "result" | "system";

function useMenus() {
  const location = useLocation();
  const runId = runIdFromPath(location.pathname);
  const savedCount = useFavourites().list.length;

  const start: PanelColumn[] = [
    {
      heading: th.nav.startHeading,
      links: [
        { to: "/", label: th.nav.chooseArea, hint: th.nav.chooseAreaHint, icon: Search },
        {
          to: "/saved",
          label: th.nav.savedAreas,
          hint: th.nav.savedAreasHint,
          icon: Star,
          count: savedCount,
        },
      ],
    },
  ];

  const result: PanelColumn[] = RESULT_COLUMNS.map((column) => ({
    heading: column.heading,
    links: column.items.map((item) => ({
      to: `/runs/${runId}?view=${item.view}`,
      label: item.label,
      hint: item.hint,
      icon: item.icon,
    })),
  }));

  const system: PanelColumn[] = [
    {
      heading: th.nav.systemHeading,
      links: [
        {
          to: "/status",
          label: th.nav.systemStatus,
          hint: th.nav.systemStatusHint,
          icon: Activity,
        },
      ],
    },
  ];

  return { runId, start, result, system };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { runId, start, result, system } = useMenus();

  /**
   * Shut on arrival anywhere new. A panel left hanging over the next screen is the classic way a
   * drop-down menu goes wrong, and a reader who pressed Back would find one covering the page.
   *
   * Compared against the last address rather than fired on every render, because this closes two
   * things a reader may have just opened.
   */
  const here = `${location.pathname}${location.search}`;
  const lastHere = useRef(here);
  useEffect(() => {
    if (lastHere.current === here) {
      return;
    }
    lastHere.current = here;
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [here]);

  // Escape closes it, and so does a click anywhere outside the bar.
  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (!bar.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [openMenu]);

  const active = (id: MenuId) =>
    id === "start"
      ? location.pathname === "/" || location.pathname === "/saved"
      : id === "result"
        ? Boolean(runId)
        : location.pathname === "/status";

  const trigger = (id: MenuId, label: string) => (
    <button
      type="button"
      aria-expanded={openMenu === id}
      aria-haspopup="true"
      onClick={() => setOpenMenu((current) => (current === id ? null : id))}
      className="flex items-center gap-1.5 rounded-card px-3 py-2 font-medium text-sm transition-colors"
      style={{
        backgroundColor: openMenu === id ? "var(--color-signature-wash)" : "transparent",
        color:
          openMenu === id || active(id) ? "var(--color-signature-text)" : "var(--color-ink-muted)",
      }}
    >
      {label}
      <ChevronDown
        size={14}
        aria-hidden="true"
        style={{ transform: openMenu === id ? "rotate(180deg)" : undefined }}
      />
    </button>
  );

  return (
    <div className="relative min-h-screen text-ink">
      <TerrainBackdrop />

      <div ref={bar} className="sticky top-0 z-30">
        <header className="glass flex items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Building2 size={18} className="shrink-0" aria-hidden="true" />
            <span className="truncate font-bold text-sm">{th.nav.appName}</span>
          </Link>

          {/* The bar is for widths that have one. A phone keeps the drawer it already had. */}
          <nav aria-label={th.nav.label} className="ml-4 hidden items-center gap-1 lg:flex">
            {trigger("start", th.nav.startHeading)}
            {trigger("result", th.nav.resultHeading)}
            {trigger("system", th.nav.systemHeading)}
          </nav>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={th.nav.openMenu}
            className="ml-auto rounded-card border border-border-strong p-2 lg:hidden"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </header>

        {openMenu && (
          <div className="glass hidden border-border border-t px-6 py-5 lg:block">
            <div className="mx-auto max-w-5xl">
              {openMenu === "start" && (
                <MenuPanel columns={start} onNavigate={() => setOpenMenu(null)} />
              )}
              {openMenu === "result" && (
                <MenuPanel
                  columns={result}
                  locked={!runId}
                  footer={runId ? th.nav.footerNote : th.nav.resultLocked}
                  onNavigate={() => setOpenMenu(null)}
                />
              )}
              {openMenu === "system" && (
                <MenuPanel columns={system} onNavigate={() => setOpenMenu(null)} />
              )}
            </div>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={th.nav.closeMenu}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="glass absolute inset-y-0 left-0 w-80 max-w-[88%] overflow-y-auto">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={th.nav.closeMenu}
                className="rounded-card border border-border-strong p-2"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {/* The same groups, stacked: a drawer has one column whatever the panel does. */}
            <nav aria-label={th.nav.label} className="flex flex-col gap-5 p-3">
              <MenuPanel columns={start} onNavigate={() => setDrawerOpen(false)} />
              <MenuPanel
                columns={result}
                locked={!runId}
                footer={runId ? undefined : th.nav.resultLocked}
                onNavigate={() => setDrawerOpen(false)}
              />
              <MenuPanel columns={system} onNavigate={() => setDrawerOpen(false)} />
              <p className="flex items-start gap-2 px-3 text-ink-muted text-xs leading-relaxed">
                <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                {th.nav.footerNote}
              </p>
            </nav>
          </div>
        </div>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
