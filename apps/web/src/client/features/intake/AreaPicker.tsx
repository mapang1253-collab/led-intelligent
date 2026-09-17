import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Info, LoaderCircle, MapPin, Search, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFavourites } from "./useFavourites.js";

/**
 * Choosing where to look.
 *
 * The three cascading dropdowns are exact but slow: seventy-seven provinces, then a district, then
 * a subdistrict, with no way to know whether the place you land on has anything in it. Searching by
 * name reaches the same place in one step, and each result carries what the system actually holds
 * for it, so nobody picks blind and finds out afterwards.
 *
 * The counts are counts of published figures. An area with more of them is better documented, not
 * better to invest in, and the copy on this screen says so — a list of places ordered by anything
 * must not be read as a ranking of places (docs/output-policy.md).
 */

export interface AreaChoice {
  subdistrict_id: string;
  subdistrict_name_th: string;
  district_id: string;
  district_name_th: string;
  province_id: string;
  province_name_th: string;
  condominium_figures: number;
  land_figures: number;
  has_own_population: boolean;
  matched_building_th: string | null;
}

/**
 * Somewhere to start, for a reader with no place in mind.
 *
 * Six places chosen for being recognisable across the country and for having figures worth
 * opening — not for being good investments, which this product does not rank and must not appear
 * to. Each is listed under the name people actually say: nobody calls ทองหล่อ "แขวงคลองตันเหนือ",
 * and a starting list written in administrative names would not be a starting list at all.
 *
 * Ids rather than names, because a name lookup could drift to a different place as data changes,
 * and this list is meant to be the same six every time.
 */
const SHOWCASE: readonly { readonly id: string; readonly nickname: string }[] = [
  { id: "1151", nickname: "ทองหล่อ" },
  { id: "1993", nickname: "พัทยา" },
  { id: "1964", nickname: "บางแสน" },
  { id: "5168", nickname: "เชียงใหม่" },
  { id: "7638", nickname: "ป่าตอง ภูเก็ต" },
  { id: "7964", nickname: "หาดใหญ่" },
];

async function fetchChoices(url: string): Promise<readonly AreaChoice[]> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`area lookup failed: ${response.status}`);
  }
  return ((await response.json()) as { data: AreaChoice[] }).data;
}

/** Bangkok's divisions are เขต and แขวง; everywhere else uses อำเภอ and ตำบล. */
function placeLabel(choice: AreaChoice): { name: string; within: string } {
  const bangkok = choice.province_name_th === "กรุงเทพมหานคร";
  return {
    name: `${bangkok ? "แขวง" : "ต."}${choice.subdistrict_name_th}`,
    within: bangkok
      ? `เขต${choice.district_name_th} ${choice.province_name_th}`
      : `อ.${choice.district_name_th} จ.${choice.province_name_th}`,
  };
}

function DataBadges({ choice }: { choice: AreaChoice }) {
  const badges: string[] = [];
  if (choice.condominium_figures > 0) {
    badges.push(`${th.picker.condoBadge} ${choice.condominium_figures}`);
  }
  if (choice.land_figures > 0) {
    badges.push(`${th.picker.landBadge} ${choice.land_figures}`);
  }
  if (badges.length === 0) {
    // Said plainly rather than left blank: an empty row reads as a loading state.
    return <span className="text-ink-muted text-xs">{th.picker.noPropertyData}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted text-xs">
      <Building2 size={12} aria-hidden="true" />
      {badges.join(" · ")}
    </span>
  );
}

function ChoiceRow({
  choice,
  onPick,
  nickname,
  starred,
  onToggleStar,
}: {
  choice: AreaChoice;
  onPick: (c: AreaChoice) => void;
  /** The name people say, when it differs from the one on the map. */
  nickname?: string;
  starred?: boolean;
  onToggleStar?: (c: AreaChoice) => void;
}) {
  const { name, within } = placeLabel(choice);
  return (
    <li className="flex items-center gap-1 border-border border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onPick(choice)}
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 py-3 text-left hover:bg-surface-sunken"
      >
        <span>
          <span className="font-medium">{nickname ?? name}</span>
          <span className="block text-ink-muted text-xs">
            {nickname ? `${name} · ${within}` : within}
          </span>
          {/* Why this place came back at all, when its own name does not contain the word. */}
          {choice.matched_building_th && (
            <span className="mt-0.5 block text-signature-text text-xs">
              {th.picker.matchedBuilding} {choice.matched_building_th}
            </span>
          )}
        </span>
        <DataBadges choice={choice} />
      </button>
      {/* Its own control, outside the row button: a star is not a way of choosing the place. */}
      {onToggleStar && (
        <button
          type="button"
          onClick={() => onToggleStar(choice)}
          aria-pressed={starred}
          aria-label={starred ? th.picker.favouriteRemove : th.picker.favouriteAdd}
          title={starred ? th.picker.favouriteRemove : th.picker.favouriteAdd}
          className="shrink-0 rounded-card p-2 text-ink-muted hover:text-ink"
          style={starred ? { color: "var(--color-signature-text)" } : undefined}
        >
          <Star size={16} fill={starred ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

export function AreaPicker({
  selected,
  onPick,
  onClear,
  errorMessage,
  fallback,
}: {
  selected: AreaChoice | null;
  onPick: (choice: AreaChoice) => void;
  onClear: () => void;
  errorMessage?: string;
  /** The exact cascading lists, kept for anyone who would rather browse than search. */
  fallback: React.ReactNode;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const favourites = useFavourites();

  // One request per pause in typing, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const results = useQuery({
    queryKey: ["area-search", debounced],
    queryFn: () =>
      fetchChoices(`/api/v1/administrative-areas/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
  });

  const showcase = useQuery({
    queryKey: ["area-showcase"],
    queryFn: () =>
      fetchChoices(
        `/api/v1/administrative-areas/by-ids?ids=${SHOWCASE.map((s) => s.id).join(",")}`,
      ),
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (selected) {
    const { name, within } = placeLabel(selected);
    return (
      <div className="rounded-card border border-border-strong bg-surface-sunken p-5">
        <p className="font-medium text-ink-muted text-sm">{th.picker.selectedHeading}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold text-lg">
            <MapPin size={18} aria-hidden="true" />
            {name}
            <span className="font-medium text-ink-muted text-sm">{within}</span>
          </p>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-4 py-2 font-medium text-sm"
          >
            <X size={14} aria-hidden="true" />
            {th.picker.change}
          </button>
        </div>
        <div className="mt-2">
          <DataBadges choice={selected} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="font-medium text-sm">{th.picker.searchLabel}</span>
        <span className="relative mt-1.5 block">
          <Search
            size={17}
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 text-ink-muted"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={th.picker.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-card border border-border-strong bg-surface py-3 pr-4 pl-11 text-base"
          />
          {results.isFetching && (
            <LoaderCircle
              size={17}
              className="-translate-y-1/2 absolute top-1/2 right-4 animate-spin text-ink-muted"
              aria-hidden="true"
            />
          )}
        </span>
      </label>

      <p className="mt-2 text-ink-muted text-xs leading-relaxed">{th.picker.searchHelp}</p>

      {errorMessage && (
        <p className="mt-2 text-sm" style={{ color: "var(--color-fail)" }}>
          {errorMessage}
        </p>
      )}

      {debounced.length >= 2 && results.data && (
        <ul className="mt-3">
          {results.data.length === 0 ? (
            <li className="py-3 text-ink-muted text-sm">{th.picker.noMatches}</li>
          ) : (
            results.data.map((choice) => (
              <ChoiceRow
                key={choice.subdistrict_id}
                choice={choice}
                onPick={onPick}
                starred={favourites.has(choice.subdistrict_id)}
                onToggleStar={favourites.toggle}
              />
            ))
          )}
        </ul>
      )}

      {/* The shortlist itself lives at /saved, reached from the rail, where it stays put and can
          be opened from a result. A second copy here would be two lists for one thing, and this one
          disappeared the moment anybody typed a search. The stars stay — this is where you add to
          it. */}
      {/* Folded away rather than filling the screen. Someone who knows where they are going should
          see the search box and nothing competing with it; this is here for the reader who does
          not, and opens on request. */}
      {debounced.length < 2 && (
        <div className="mt-5 border-border border-t pt-4">
          <button
            type="button"
            onClick={() => setShowShowcase((open) => !open)}
            aria-expanded={showShowcase}
            className="flex items-center gap-2 font-medium text-signature-text text-sm"
          >
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={showShowcase ? "" : "-rotate-90 transition-transform"}
            />
            {th.picker.showcaseToggle}
          </button>
          {showShowcase && (
            <div className="mt-3">
              {/* Chosen for being familiar, never for being good places to buy. */}
              <p className="flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
                <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                {th.picker.showcaseNote}
              </p>
              <ul className="mt-2">
                {SHOWCASE.map((entry) => {
                  const choice = showcase.data?.find((c) => c.subdistrict_id === entry.id);
                  return choice ? (
                    <ChoiceRow
                      key={entry.id}
                      choice={choice}
                      onPick={onPick}
                      nickname={entry.nickname}
                      starred={favourites.has(choice.subdistrict_id)}
                      onToggleStar={favourites.toggle}
                    />
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-border border-t pt-4">
        <button
          type="button"
          onClick={() => setShowFallback((open) => !open)}
          aria-expanded={showFallback}
          className="flex items-center gap-2 font-medium text-signature-text text-sm"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={showFallback ? "" : "-rotate-90 transition-transform"}
          />
          {th.picker.browseToggle}
        </button>
        {showFallback && <div className="mt-4">{fallback}</div>}
      </div>
    </div>
  );
}
