import { useQuery } from "@tanstack/react-query";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * One city-plan lookup, shared by the panel that reads it and the two maps that draw it.
 *
 * Deliberately a single definition. The panel and the maps ask the same question about the same
 * point, and two query definitions under one key is a bug this codebase has already paid for once
 * — the landing page printed zeroes because a second definition returned a different shape under
 * a key the first had filled.
 *
 * The maps need it for more than the colours: กรุงเทพมหานคร and นนทบุรี have no published plan
 * service at all (verified 2026-10-10 — the department's `PLLU10` and `PLLU12` endpoints answer
 * "Could not find service", while the other 75 provinces answer normally). Without the coverage
 * flag a reader there got an empty map and a button offering to show colours that do not exist.
 */

export interface ZoningPlan {
  plan_id: string;
  zone_code: string;
  zone_name_th: string;
  block_th: string | null;
  colour: string | null;
  permitted_th: string | null;
  prohibited_th: string[];
}

export interface ZoningLegendEntry {
  zone_code: string;
  zone_name_th: string;
  colour: string | null;
}

export interface ZoningResponse {
  covered: boolean;
  data: ZoningPlan[];
  /**
   * Optional on purpose. Answers are cached at the edge for a month, so a deployment that adds a
   * field meets responses stored before it existed — and reading `.length` off one of those took
   * the whole page down to a blank screen, not just this panel. Every field a component reads
   * from the envelope has to survive being absent.
   */
  legend?: ZoningLegendEntry[];
  attribution_th: string;
  publisher_url: string;
}

/**
 * The response shape the callers expect, carried in the URL.
 *
 * Answers are cached for a month in three places — the edge, the browser's own HTTP cache, and
 * TanStack Query — and a URL that does not change cannot shake any of them. Adding `legend` and
 * deploying was not enough: the server returned it, and the screen kept showing a month-old copy
 * without it. Bumping this is what actually reaches a reader. Raise it whenever the response
 * grows or loses a field — or, as at v3, when the same shape starts carrying a fuller answer:
 * the legend now covers every plan the overlay paints, and a month-old entry would still describe
 * only the plan the pin fell in.
 */
export const ZONING_SHAPE = 4;

export function useZoning(point: PinnedPoint | null, provinceCode: string | null) {
  return useQuery({
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
}

/**
 * True only when the department has told us this province has no published plan.
 *
 * Not "we do not know yet" and not "the lookup failed": both of those leave the overlay alone,
 * because hiding the control on a timeout would tell a reader their province is unplanned when it
 * is merely slow.
 */
export function planNotPublished(query: ReturnType<typeof useZoning>): boolean {
  return query.data !== undefined && query.data.covered === false;
}
