import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info, LoaderCircle, Map as MapIcon, TriangleAlert } from "lucide-react";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * The city plan covering the pin (docs/adr/0008).
 *
 * The screen has one job beyond showing the zone: keeping "what this land is zoned for" separate
 * from "what you may build here". They read as the same sentence to anyone who has not spent time
 * with กฎกระทรวงผังเมืองรวม, and they are not. So the regulation's words are quoted and labelled
 * as a quotation, the prohibitions are shown next to the permissions rather than folded out of
 * sight, and the limit sits under both rather than in a footnote.
 *
 * Three empty answers render differently, because they mean opposite things to a reader: the
 * province publishes no plan, the pin falls outside every published plan, and the lookup failed.
 */

interface ZoningPlan {
  plan_id: string;
  zone_code: string;
  zone_name_th: string;
  block_th: string | null;
  colour: string | null;
  permitted_th: string | null;
  prohibited_th: string[];
}

interface ZoningLegendEntry {
  zone_code: string;
  zone_name_th: string;
  colour: string | null;
}

interface ZoningResponse {
  covered: boolean;
  data: ZoningPlan[];
  /**
   * Optional on purpose. Answers are cached at the edge for a month, so a deployment that adds a
   * field meets responses stored before it existed — and reading `.length` off one of those took
   * the whole page down to a blank screen, not just this panel. Every field this component reads
   * from the envelope has to survive being absent.
   */
  legend?: ZoningLegendEntry[];
  attribution_th: string;
  publisher_url: string;
}

/**
 * The response shape this component expects, carried in the URL.
 *
 * Answers are cached for a month in three places — the edge, the browser's own HTTP cache, and
 * TanStack Query — and a URL that does not change cannot shake any of them. Adding `legend` and
 * deploying was not enough: the server returned it, and the screen kept showing a month-old copy
 * without it. Bumping this is what actually reaches a reader. Raise it whenever the response
 * grows or loses a field.
 */
const ZONING_SHAPE = 2;

export function ZoningPanel({
  point,
  provinceCode,
  legendOpen = false,
}: {
  point: PinnedPoint | null;
  /** Two digits, from the province the reader already chose. */
  provinceCode: string | null;
  /**
   * Whether the key starts unfolded.
   *
   * Folded is right beside the form, where the zone under the pin is the answer and the rest of
   * the plan is context. It is wrong under a map drawn in those colours, which without the key is
   * a page of pink and green.
   */
  legendOpen?: boolean;
}) {
  const zoning = useQuery({
    queryKey: ["zoning", ZONING_SHAPE, provinceCode, point?.latitude, point?.longitude],
    enabled: point !== null && provinceCode !== null,
    // A ministerial regulation does not change while a form is open.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async (): Promise<ZoningResponse> => {
      const response = await fetch(
        `/api/v1/zoning?lat=${point?.latitude}&lon=${point?.longitude}&province_code=${provinceCode}&v=${ZONING_SHAPE}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`zoning lookup failed: ${response.status}`);
      }
      return (await response.json()) as ZoningResponse;
    },
  });

  if (!point || !provinceCode) {
    return null;
  }

  return (
    <div className="mt-4 rounded-card bg-surface-sunken p-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm">
        <MapIcon size={15} aria-hidden="true" />
        {th.zoning.heading}
      </h3>

      {zoning.isLoading && (
        <p className="mt-2 flex items-center gap-2 text-ink-muted text-xs">
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
          {th.zoning.loading}
        </p>
      )}

      {zoning.isError && (
        <div className="mt-2">
          <p
            className="flex items-start gap-2 text-xs leading-relaxed"
            style={{ color: "var(--color-partial)" }}
          >
            <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.zoning.failed}
          </p>
          <button
            type="button"
            onClick={() => zoning.refetch()}
            className="mt-2 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            {th.zoning.retry}
          </button>
        </div>
      )}

      {zoning.data && (
        <>
          {!zoning.data.covered && (
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">
              {th.zoning.outsideCoverage}
            </p>
          )}

          {zoning.data.covered && (zoning.data.data?.length ?? 0) === 0 && (
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">{th.zoning.noPlanAtPoint}</p>
          )}

          {(zoning.data.data?.length ?? 0) > 1 && (
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">{th.zoning.multiplePlans}</p>
          )}

          {(zoning.data.data ?? []).map((plan) => (
            <article
              key={`${plan.plan_id}-${plan.zone_code}-${plan.block_th ?? ""}`}
              className="mt-3 rounded-card border border-border bg-surface p-3"
            >
              <header className="flex items-start gap-2.5">
                {/* The publisher's own colour. An unfilled zone gets an outline, not an invented
                    fill, so the swatch never claims a colour the plan does not use. */}
                <span
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 rounded border border-border-strong"
                  style={{ background: plan.colour ?? "transparent" }}
                />
                <div>
                  <p className="font-semibold text-sm leading-snug">{plan.zone_name_th}</p>
                  <p className="mt-0.5 text-ink-muted text-xs">
                    {plan.block_th && `${th.zoning.blockLabel} ${plan.block_th} · `}
                    {th.zoning.planLabel} {plan.plan_id}
                  </p>
                </div>
              </header>

              <h4 className="mt-3 font-semibold text-xs">{th.zoning.permittedHeading}</h4>
              {/* Quoted law, and long: the จ.ปทุมธานี residential zone runs to several hundred
                  words. Capped to a reading measure so the wider page does not turn it into
                  lines the eye cannot find its way back along. */}
              <p className="mt-1 max-w-prose text-sm leading-relaxed">
                {plan.permitted_th ?? (
                  <span className="text-ink-muted text-xs">{th.zoning.noPermitted}</span>
                )}
              </p>

              <h4 className="mt-3 font-semibold text-xs">{th.zoning.prohibitedHeading}</h4>
              {plan.prohibited_th.length === 0 ? (
                <p className="mt-1 text-ink-muted text-xs leading-relaxed">
                  {th.zoning.noProhibited}
                </p>
              ) : (
                <ul className="mt-1">
                  {plan.prohibited_th.map((clause) => (
                    <li
                      key={clause}
                      className="max-w-prose border-border border-b py-1.5 text-sm leading-relaxed last:border-b-0"
                    >
                      {clause}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-2 text-ink-muted text-xs leading-relaxed">{th.zoning.quoteNote}</p>
            </article>
          ))}

          {/*
            The key to the overlay, folded.

            The map can be filled with the department's colours, and until now nothing said what
            any of them meant — pink beside green beside red. It is folded because the zone under
            this plot is the answer the reader came for and the rest of the plan is context, but it
            is one click away rather than absent.
          */}
          {(zoning.data.legend?.length ?? 0) > 0 && (
            <details className="mt-3" open={legendOpen}>
              <summary className="cursor-pointer font-medium text-sm">
                {th.zoning.legendOpen}
              </summary>
              <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.zoning.legendNote}</p>
              <ul className="mt-2">
                {(zoning.data.legend ?? []).map((entry) => (
                  <li
                    key={entry.zone_code}
                    className="flex items-center gap-2.5 border-border border-b py-1.5 text-sm last:border-b-0"
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded border border-border-strong"
                      style={{ background: entry.colour ?? "transparent" }}
                    />
                    <span>{entry.zone_name_th}</span>
                    {entry.colour === null && (
                      <span className="text-ink-muted text-xs">({th.zoning.legendUnfilled})</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Under every outcome, including the empty ones: a reader who found no zone still needs
              to know that finding one would not have been permission. */}
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.zoning.notClearance}
          </p>
          <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.zoning.contextOnly}</p>
          <p className="mt-1 text-ink-muted text-xs">{zoning.data.attribution_th}</p>
          <a
            href={zoning.data.publisher_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            <ExternalLink size={13} aria-hidden="true" />
            {th.zoning.verifyAt}
          </a>
        </>
      )}
    </div>
  );
}
