import type { AdministrativeAreaOption } from "@reis/contracts";
import { th } from "@reis/i18n";
import { ChevronDown, LoaderCircle, TriangleAlert } from "lucide-react";
import { useId } from "react";

/**
 * One level of the dependent administrative hierarchy. A native select is deliberate: it is
 * keyboard-operable and screen-reader-correct without custom ARIA, and it gets the platform picker
 * on mobile — which matters more here than styling, since option counts stay small (77 provinces,
 * then tens of districts and subdistricts).
 *
 * Free text is never accepted; docs/project-overview.md §7 requires normalized administrative IDs.
 */
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

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-sm" htmlFor={selectId}>
        {label}
        <span className="ml-1 text-fail" aria-hidden="true">
          *
        </span>
        <span className="sr-only">({th.common.required})</span>
      </label>

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
          {options?.map((option) => (
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
