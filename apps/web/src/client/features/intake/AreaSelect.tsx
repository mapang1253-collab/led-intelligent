import type { AdministrativeAreaOption } from "@reis/contracts";
import { th } from "@reis/i18n";
import { ChevronDown, LoaderCircle, Search, TriangleAlert, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

/**
 * One level of the dependent administrative hierarchy. A native select is deliberate: it is
 * keyboard-operable and screen-reader-correct without custom ARIA, and it gets the platform picker
 * on mobile — which matters more here than styling.
 *
 * "Option counts stay small" is what this comment used to say, and 77 provinces is not small when
 * you are hunting for one on a laptop. A box above the list narrows it; the list itself is
 * untouched, so scrolling and type-ahead still work for anyone who prefers them.
 *
 * Free text is never accepted; docs/project-overview.md §7 requires normalized administrative IDs.
 */
/** Below this, scrolling is not a problem and a search box is just another thing on screen. */
const SEARCH_FROM = 12;

export interface AreaSelectProps {
  label: string;
  placeholder: string;
  /** Shown instead of the placeholder when the parent level has not been chosen yet. */
  disabledHint?: string;
  options: readonly AdministrativeAreaOption[] | undefined;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  errorMessage?: string | undefined;
}

export function AreaSelect({
  label,
  placeholder,
  disabledHint,
  options,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  isError = false,
  onRetry,
  errorMessage,
}: AreaSelectProps) {
  const selectId = useId();
  const errorId = `${selectId}-error`;
  const hasFieldError = Boolean(errorMessage);

  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  /**
   * The chosen option is kept even when it does not match, as elsewhere: a `<select>` whose value
   * is absent from its options renders blank, and the reader would watch their own answer vanish
   * as they typed a search for the next level.
   */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return options ?? [];
    }
    return (options ?? []).filter(
      (option) => option.id === value || option.name_th.toLowerCase().includes(needle),
    );
  }, [options, query, value]);
  const matches = searching
    ? visible.filter((option) => option.name_th.toLowerCase().includes(query.trim().toLowerCase()))
        .length
    : (options?.length ?? 0);
  const canSearch = !disabled && !isLoading && !isError && (options?.length ?? 0) >= SEARCH_FROM;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-sm" htmlFor={selectId}>
        {label}
        <span className="ml-1 text-fail" aria-hidden="true">
          *
        </span>
        <span className="sr-only">({th.common.required})</span>
      </label>

      {canSearch && (
        <span className="relative block">
          <Search
            size={14}
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-ink-muted"
          />
          <input
            type="search"
            value={query}
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

      <div className="relative">
        <select
          id={selectId}
          className="w-full appearance-none rounded-card border bg-surface px-4 py-3 pr-10 text-base text-ink disabled:cursor-not-allowed disabled:opacity-55"
          style={{
            borderColor: hasFieldError ? "var(--color-fail)" : "var(--color-border-strong)",
          }}
          value={value}
          disabled={disabled || isLoading || isError}
          aria-invalid={hasFieldError}
          aria-describedby={hasFieldError ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">
            {disabled ? (disabledHint ?? placeholder) : isLoading ? th.common.loading : placeholder}
          </option>
          {visible.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name_th}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted">
          {isLoading ? (
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDown size={18} aria-hidden="true" />
          )}
        </span>
      </div>

      {searching && (
        <p className="text-ink-muted text-xs" aria-live="polite">
          {matches === 0
            ? th.optionSearch.none
            : th.optionSearch.count
                .replace("{n}", matches.toLocaleString("th-TH"))
                .replace("{total}", (options?.length ?? 0).toLocaleString("th-TH"))}
        </p>
      )}

      {isError && (
        <p className="flex flex-wrap items-center gap-2 text-fail text-sm">
          <TriangleAlert size={15} aria-hidden="true" />
          {th.error.loadAreasFailed}
          {onRetry && (
            <button type="button" onClick={onRetry} className="underline underline-offset-2">
              {th.error.retry}
            </button>
          )}
        </p>
      )}

      {hasFieldError && (
        <p id={errorId} className="text-fail text-sm">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
