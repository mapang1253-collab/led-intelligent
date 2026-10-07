import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Info, LoaderCircle, Ruler, TriangleAlert } from "lucide-react";
import { useState } from "react";
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
  /** Roads are searched closer than destinations; saying so keeps "none found" honest. */
  road_radius_metres: number;
  poi_radius_metres: number;
  attribution_th: string;
}

export function ProximityPanel({ point }: { point: PinnedPoint | null }) {
  /**
   * Asked for, not attempted on sight.
   *
   * Overpass is a free community service and it refuses under load: on 6 and 7 October 2026 every
   * public mirror timed out for minutes at a time. A panel that fetched as soon as a pin appeared
   * met readers with an amber failure they had never asked for, sitting beside a city plan and a
   * price range that were both perfectly fine — and the whole screen read as broken.
   *
   * One click instead. Nothing is lost: these distances are context that never entered the
   * analysis, so a reader who does not press the button has missed nothing the result depends on.
   */
  const [asked, setAsked] = useState(false);

  const proximity = useQuery({
    queryKey: ["proximity", point?.latitude, point?.longitude],
    enabled: point !== null && asked,
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

  const radiusNote = (response: ProximityResponse) =>
    th.map.proximityRadius
      .replace("{poi}", response.poi_radius_metres.toLocaleString("th-TH"))
      .replace("{road}", response.road_radius_metres.toLocaleString("th-TH"));

  return (
    <div className="mt-4 rounded-card bg-surface-sunken p-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm">
        <Ruler size={15} aria-hidden="true" />
        {th.map.proximityHeading}
      </h3>

      {!asked && (
        <>
          <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.map.proximityAskNote}</p>
          <button
            type="button"
            onClick={() => setAsked(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            <Ruler size={13} aria-hidden="true" />
            {th.map.proximityAsk}
          </button>
        </>
      )}

      {asked && proximity.isLoading && (
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
              {th.map.proximityEmpty} · {radiusNote(proximity.data)}
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

          {/* How far the search went, on every result and not only on an empty one: a nearest
              school of 1,400 m means something different once you know it stopped at 1,500. */}
          <p className="mt-2.5 text-ink-muted text-xs leading-relaxed">
            {radiusNote(proximity.data)}
          </p>
          <p className="mt-1 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
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
