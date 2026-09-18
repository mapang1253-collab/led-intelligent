import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Info, MapPin, Star, X } from "lucide-react";
import { useState } from "react";
import { useFavourites } from "./useFavourites.js";

/**
 * Choosing where to look.
 *
 * Two ways in: the exact province → district → subdistrict lists, and a short starting list for a
 * reader with no place in mind. Search by name used to sit above both and was removed at the
 * owners' request; with it went the one route that could find an area by the name of a condominium
 * standing in it, since that match lived in the search query rather than in the lists.
 *
 * The counts on each row are counts of published figures. An area with more of them is better
 * documented, not better to invest in, and the copy on this screen says so — a list of places
 * ordered by anything must not be read as a ranking of places (docs/output-policy.md).
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
 * Six hardcoded famous names used to sit here. They are now the six subdistricts for which the
 * state has actually published the most figures, read from the database rather than chosen by us,
 * because "where is there enough data to be worth analysing" is a question this product can answer
 * from evidence and "where is worth buying" is one it must never answer at all.
 *
 * That distinction is not decoration. Ordering places by anything reads as a ranking of places,
 * and a LOCKED decision forbids this product ranking areas by investment merit. So the list says
 * what the number is — records published by the Treasury and DOPA — and the copy beside it says
 * what the number is not.
 */
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
  // The unit goes after the number. "ราคาประเมินห้องชุด 603" without it reads as a price of 603.
  const count = (n: number) => `${n.toLocaleString("th-TH")} ${th.picker.figureCountUnit}`;
  if (choice.condominium_figures > 0) {
    badges.push(`${th.picker.condoBadge} ${count(choice.condominium_figures)}`);
  }
  if (choice.land_figures > 0) {
    badges.push(`${th.picker.landBadge} ${count(choice.land_figures)}`);
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
  starred,
  onToggleStar,
}: {
  choice: AreaChoice;
  onPick: (c: AreaChoice) => void;
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
          <span className="font-medium">{name}</span>
          <span className="block text-ink-muted text-xs">{within}</span>
          {/* `matched_building_th` is not rendered any more: it existed to explain why a search
              returned a place whose own name did not contain the word, and nothing searches. */}
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
  const [showShowcase, setShowShowcase] = useState(false);
  const favourites = useFavourites();

  const showcase = useQuery({
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
      {/* The lists, shown outright. They were behind a toggle while a search box sat above them
          offering a faster route; with the search gone this is the way in, and a form whose only
          control is a disclosure has nothing on it to do. */}
      <div>{fallback}</div>

      {errorMessage && (
        <p className="mt-2 text-sm" style={{ color: "var(--color-fail)" }}>
          {errorMessage}
        </p>
      )}

      {/* The shortlist itself lives at /saved, reached from the rail, where it stays put and can
          be opened from a result. A second copy here would be two lists for one thing, and this one
          disappeared the moment anybody typed a search. The stars stay — this is where you add to
          it. */}
      {/* Folded away rather than filling the screen: this is for the reader with no place in
          mind, and it opens on request. */}
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
              {(showcase.data ?? []).map((choice) => (
                <ChoiceRow
                  key={choice.subdistrict_id}
                  choice={choice}
                  onPick={onPick}
                  starred={favourites.has(choice.subdistrict_id)}
                  onToggleStar={favourites.toggle}
                />
              ))}
            </ul>
            {/* Named, because "where did this list come from" is the first fair question. */}
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">
              {th.picker.showcaseSource}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
