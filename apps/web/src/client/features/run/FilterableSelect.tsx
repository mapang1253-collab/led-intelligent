import { th } from "@reis/i18n";
import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

/**
 * A select with a box that narrows its options.
 *
 * The lists on this screen come from the department's own schedules and are as long as the
 * schedules are: 69 building types, 56 land locations. The owners found what that costs — to reach
 * "520/1 อาคารอยู่อาศัยรวม" you scroll past every house, townhouse and shophouse the Treasury
 * prices, and on a laptop the dropdown is taller than the window.
 *
 * It stays a native `<select>`. A hand-rolled listbox would have to re-earn what the browser
 * already does for free — keyboard, type-ahead, screen readers, and the full-screen picker a phone
 * shows — and would risk all four to save one scroll. Filtering the options it carries is the
 * whole change.
 */

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  /** Optional heading to sit under. Options sharing one are rendered in a single `<optgroup>`. */
  readonly group?: string;
}

/** Below this, scrolling is not a problem and a search box is just another thing on screen. */
const SEARCH_FROM = 12;

export function FilterableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  labelClassName = "font-medium text-sm",
  selectClassName = "mt-1.5 w-full rounded-card border border-border-strong bg-surface-sunken px-3 py-2.5 text-sm",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly SelectOption[];
  placeholder: string;
  disabled?: boolean;
  labelClassName?: string;
  selectClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const selectId = useId();
  const searchId = useId();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return options;
    }
    /**
     * The chosen option is always kept, even when it does not match.
     *
     * A `<select>` whose current value is not among its options shows blank, and the reader would
     * watch their own answer disappear as they typed a search for the next one.
     */
    return options.filter(
      (option) => option.value === value || option.label.toLowerCase().includes(needle),
    );
  }, [options, query, value]);

  /** Visible options in their caller-given order, bucketed by heading. */
  const grouped = useMemo(() => {
    const buckets = new Map<string, SelectOption[]>();
    for (const option of visible) {
      const key = option.group ?? "";
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(option);
      } else {
        buckets.set(key, [option]);
      }
    }
    return [...buckets.entries()];
  }, [visible]);

  const searching = query.trim() !== "";
  const matches = searching
    ? visible.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
        .length
    : options.length;

  return (
    <div>
      <label htmlFor={selectId} className={`block ${labelClassName}`}>
        {label}
      </label>

      {options.length >= SEARCH_FROM && (
        <span className="relative mt-1.5 block">
          <Search
            size={14}
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-ink-muted"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={th.optionSearch.placeholder}
            aria-label={`${th.optionSearch.aria} — ${label}`}
            autoComplete="off"
            className="w-full rounded-card border border-border bg-surface py-1.5 pr-8 pl-8 text-sm"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={th.optionSearch.clear}
              className="-translate-y-1/2 absolute top-1/2 right-2 text-ink-muted"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </span>
      )}

      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        <option value="">{placeholder}</option>
        {/* Grouped only where the caller asked for groups, and a group with nothing left after
            filtering is dropped rather than shown as an empty heading. */}
        {grouped.map(([group, items]) =>
          group === "" ? (
            items.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <optgroup key={group} label={group}>
              {items.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ),
        )}
      </select>

      {/* Said rather than left to be inferred from a shorter list: a reader who typed a word with
          no matches would otherwise see a dropdown holding only what they had already chosen. */}
      {searching && (
        <p className="mt-1 text-ink-muted text-xs" aria-live="polite">
          {matches === 0
            ? th.optionSearch.none
            : th.optionSearch.count
                .replace("{n}", matches.toLocaleString("th-TH"))
                .replace("{total}", options.length.toLocaleString("th-TH"))}
        </p>
      )}
    </div>
  );
}
