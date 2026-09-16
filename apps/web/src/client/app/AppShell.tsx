import { th } from "@reis/i18n";
import {
  Activity,
  Building2,
  Calculator,
  Coins,
  LayoutList,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { TerrainBackdrop } from "../features/design-system/TerrainBackdrop.js";

/**
 * The application frame: one navigation rail that is present from the first screen.
 *
 * Choosing an area is the front door, so it is the first item and the route at `/`. The result
 * topics sit under it and are only reachable once a run exists — shown rather than hidden while
 * they are not, because a reader deciding whether to start should be able to see what starting
 * will give them.
 *
 * The rail is the only navigation. There is no history list and no way back to an earlier run:
 * runs are anonymous and expire after 24 hours, which is a product decision rather than a missing
 * feature (docs/project-overview.md §38).
 */

export const RESULT_VIEWS = ["overview", "prices", "area", "valuation", "concepts"] as const;
export type ResultView = (typeof RESULT_VIEWS)[number];

const RESULT_ITEMS: readonly { view: ResultView; label: string; icon: LucideIcon }[] = [
  { view: "overview", label: th.resultTabs.overview, icon: LayoutList },
  { view: "prices", label: th.resultTabs.prices, icon: Coins },
  { view: "area", label: th.resultTabs.area, icon: Users },
  { view: "valuation", label: th.resultTabs.valuation, icon: Calculator },
  { view: "concepts", label: th.resultTabs.concepts, icon: Lightbulb },
];

/** The view a result screen should show, read from the URL so the rail can link straight to it. */
export function useResultView(): ResultView {
  const [params] = useSearchParams();
  const requested = params.get("view");
  return RESULT_VIEWS.includes(requested as ResultView) ? (requested as ResultView) : "overview";
}

/**
 * The open run, read from the path rather than from route params: the rail is mounted by the
 * catch-all route that wraps the inner routes, so `useParams` there sees no `:runId`.
 */
function runIdFromPath(pathname: string): string | null {
  const match = /^\/runs\/([^/?#]+)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * Whether the rail is tucked away, remembered between visits.
 *
 * localStorage, not a run artefact: this is which way a reader likes their window, and it never
 * leaves their browser. Reads and writes are guarded because private windows and blocked site data
 * make both throw, and a backdrop preference is not worth a blank screen.
 */
const RAIL_KEY = "reis.rail.collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(RAIL_KEY, collapsed ? "1" : "0");
  } catch {
    // A preference that cannot be saved is still a preference for this session.
  }
}

function NavRail({ onNavigate, onCollapse }: { onNavigate?: () => void; onCollapse?: () => void }) {
  const location = useLocation();
  const runId = runIdFromPath(location.pathname);
  const view = useResultView();
  const onIntake = location.pathname === "/";
  const onStatus = location.pathname === "/status";

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-card px-3 py-2.5 text-sm transition-colors ${
      active ? "font-semibold" : "font-medium"
    }`;
  const itemStyle = (active: boolean) => ({
    backgroundColor: active ? "var(--color-signature-wash)" : "transparent",
    color: active ? "var(--color-signature-text)" : "var(--color-ink-muted)",
  });

  return (
    <nav aria-label={th.nav.label} className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-1">
        <Link to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
          <Building2 size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate font-bold text-sm leading-tight">{th.nav.appName}</span>
        </Link>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={th.nav.collapse}
            title={th.nav.collapse}
            className="ml-auto rounded-card p-1.5 text-ink-muted hover:text-ink"
          >
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div>
        <p className="px-3 pb-1.5 font-medium text-ink-muted text-xs">{th.nav.startHeading}</p>
        <Link
          to="/"
          onClick={onNavigate}
          aria-current={onIntake ? "page" : undefined}
          className={itemClass(onIntake)}
          style={itemStyle(onIntake)}
        >
          <Search size={16} aria-hidden="true" />
          {th.nav.chooseArea}
        </Link>
      </div>

      <div>
        <p className="px-3 pb-1.5 font-medium text-ink-muted text-xs">{th.nav.resultHeading}</p>
        {RESULT_ITEMS.map((item) => {
          const active = Boolean(runId) && view === item.view;
          const Icon = item.icon;
          if (!runId) {
            // Visible but inert: the reader can see what a run will contain before starting one.
            return (
              <span
                key={item.view}
                aria-disabled="true"
                className={`${itemClass(false)} opacity-40`}
                style={itemStyle(false)}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.view}
              to={`/runs/${runId}?view=${item.view}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
              style={itemStyle(active)}
            >
              <Icon size={16} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {!runId && <p className="mt-1.5 px-3 text-ink-muted text-xs">{th.nav.resultLocked}</p>}
      </div>

      <div>
        <p className="px-3 pb-1.5 font-medium text-ink-muted text-xs">{th.nav.systemHeading}</p>
        <Link
          to="/status"
          onClick={onNavigate}
          aria-current={onStatus ? "page" : undefined}
          className={itemClass(onStatus)}
          style={itemStyle(onStatus)}
        >
          <Activity size={16} aria-hidden="true" />
          {th.nav.systemStatus}
        </Link>
      </div>

      <p className="mt-auto flex items-start gap-2 px-3 text-ink-muted text-xs leading-relaxed">
        <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {th.nav.footerNote}
      </p>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function setRail(next: boolean) {
    setCollapsed(next);
    writeCollapsed(next);
  }

  return (
    <div className="relative min-h-screen text-ink">
      <TerrainBackdrop />

      {/* A phone gets a top bar and a drawer; the rail only becomes a rail where there is width. */}
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={th.nav.openMenu}
          className="rounded-card border border-border-strong p-2"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
        <span className="flex items-center gap-2 font-bold text-sm">
          <Building2 size={16} aria-hidden="true" />
          {th.nav.appName}
        </span>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={th.nav.closeMenu}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="glass absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto">
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
            <NavRail onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:flex">
        {collapsed ? (
          /* Tucked away: one button, out of the way, rather than a rail standing there always. */
          <button
            type="button"
            onClick={() => setRail(false)}
            aria-label={th.nav.expand}
            title={th.nav.expand}
            className="glass sticky top-4 z-20 ml-4 hidden size-10 shrink-0 items-center justify-center self-start rounded-card lg:flex"
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
          </button>
        ) : (
          <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto lg:block">
            <NavRail onCollapse={() => setRail(true)} />
          </aside>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
