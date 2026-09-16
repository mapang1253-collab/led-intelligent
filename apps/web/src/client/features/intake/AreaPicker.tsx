import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Info, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

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

function ChoiceRow({ choice, onPick }: { choice: AreaChoice; onPick: (c: AreaChoice) => void }) {
  const { name, within } = placeLabel(choice);
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(choice)}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 border-border border-b px-1 py-3 text-left last:border-b-0 hover:bg-surface-sunken"
      >
        <span>
          <span className="font-medium">{name}</span>
          <span className="block text-ink-muted text-xs">{within}</span>
          {/* Why this place came back at all, when its own name does not contain the word. */}
          {choice.matched_building_th && (
            <span className="mt-0.5 block text-signature-text text-xs">
              {th.picker.matchedBuilding} {choice.matched_building_th}
            </span>
          )}
        </span>
        <DataBadges choice={choice} />
      </button>
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

  const documented = useQuery({
    queryKey: ["area-well-documented"],
    queryFn: () => fetchChoices("/api/v1/administrative-areas/well-documented"),
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
              <ChoiceRow key={choice.subdistrict_id} choice={choice} onPick={onPick} />
            ))
          )}
        </ul>
      )}

      {debounced.length < 2 && (
        <div className="mt-6">
          <p className="font-medium text-sm">{th.picker.startHereHeading}</p>
          {/* The ordering is about this system's coverage, never about the places themselves. */}
          <p className="mt-1 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.picker.startHereNote}
          </p>
          <ul className="mt-2">
            {documented.data?.map((choice) => (
              <ChoiceRow key={choice.subdistrict_id} choice={choice} onPick={onPick} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 border-border border-t pt-4">
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
