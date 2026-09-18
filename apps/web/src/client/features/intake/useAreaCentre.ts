import { useQuery } from "@tanstack/react-query";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * Where to open the map once an area is chosen (docs/adr/0006).
 *
 * Cached for the session on top of the Worker's own month-long cache, because Nominatim is a
 * shared public service and an administrative area's centre does not move.
 *
 * A failed or missing lookup returns null rather than throwing. The map then opens on the whole
 * country, which costs the reader a pan and nothing else — the centre is never measured from.
 */
export function useAreaCentre(subdistrictId: string | undefined) {
  return useQuery({
    queryKey: ["area-centre", subdistrictId],
    enabled: Boolean(subdistrictId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async (): Promise<PinnedPoint | null> => {
      const response = await fetch(
        `/api/v1/area-centre?subdistrict_id=${encodeURIComponent(subdistrictId ?? "")}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { data: PinnedPoint | null };
      return body.data;
    },
  });
}
