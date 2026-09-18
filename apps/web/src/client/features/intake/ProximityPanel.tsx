import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Info, LoaderCircle, Ruler, TriangleAlert } from "lucide-react";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * What is near the pin, from OpenStreetMap (docs/adr/0006).
 *
 * Context, and labelled as context twice: once because a straight line is not a walk, and once
 * because these distances never entered the analysis. A reader who takes "โรงเรียน 150 เมตร" for
 * something a rule relied on has been misled by the screen.
 *
 * "Nothing within the radius" and "the lookup failed" render differently on purpose. Overpass is
 * the least reliable service this product talks to, and an outage that renders as an empty
 * neighbourhood would be a lie told by omission.
 */

const CATEGORY_LABELS = th.map.category as Record<string, string>;

interface ProximityFeature {
  category: string;
  metres: number;
  name: string | null;
}

interface ProximityResponse {
  data: ProximityFeature[];
  radius_metres: number;
  attribution_th: string;
}

export function ProximityPanel({ point }: { point: PinnedPoint | null }) {
  const proximity = useQuery({
    queryKey: ["proximity", point?.latitude, point?.longitude],
    enabled: point !== null,
    // The pin does not move on its own, and Overpass is a shared public service.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async (): Promise<ProximityResponse> => {
      const response = await fetch(
        `/api/v1/proximity?lat=${point?.latitude}&lon=${point?.longitude}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`proximity lookup failed: ${response.status}`);
      }
      return (await response.json()) as ProximityResponse;
    },
  });

  if (!point) {
    return null;
  }

  const radiusNote = (radius: number) =>
    th.map.proximityRadius.replace("{n}", radius.toLocaleString("th-TH"));

  return (
    <div className="mt-4 rounded-card bg-surface-sunken p-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm">
        <Ruler size={15} aria-hidden="true" />
        {th.map.proximityHeading}
      </h3>

      {proximity.isLoading && (
        <p className="mt-2 flex items-center gap-2 text-ink-muted text-xs">
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
          {th.map.proximityLoading}
        </p>
      )}

      {proximity.isError && (
        <div className="mt-2">
          <p
            className="flex items-start gap-2 text-xs leading-relaxed"
            style={{ color: "var(--color-partial)" }}
          >
            <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.map.proximityFailed}
          </p>
          <button
            type="button"
            onClick={() => proximity.refetch()}
            className="mt-2 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            {th.map.proximityRetry}
          </button>
        </div>
      )}

      {proximity.data && (
        <>
          {proximity.data.data.length === 0 ? (
            <p className="mt-2 text-ink-muted text-xs leading-relaxed">
              {th.map.proximityEmpty} · {radiusNote(proximity.data.radius_metres)}
            </p>
          ) : (
            <ul className="mt-2">
              {proximity.data.data.map((feature) => (
                <li
                  key={feature.category}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 border-border border-b py-2 text-sm last:border-b-0"
                >
                  <span>
                    {CATEGORY_LABELS[feature.category] ?? feature.category}
                    <span className="block text-ink-muted text-xs">
                      {feature.name ?? th.map.proximityUnnamed}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {feature.metres.toLocaleString("th-TH")}{" "}
                    <span className="font-normal text-ink-muted text-xs">{th.map.metres}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2.5 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.map.proximityStraightLine}
          </p>
          <p className="mt-1 text-ink-muted text-xs leading-relaxed">
            {th.map.proximityContextOnly}
          </p>
          <p className="mt-1 text-ink-muted text-xs">{proximity.data.attribution_th}</p>
        </>
      )}
    </div>
  );
}
