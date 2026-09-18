import type { AdministrativeAreaOption, AdministrativeAreaResponse } from "@reis/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AreaChoice } from "./AreaPicker.js";

/**
 * Remote administrative-area lists. TanStack Query owns this state per
 * docs/technology-stack.md §5; the browser never touches the database directly.
 *
 * Districts and subdistricts are fetched by parent id rather than filtered client-side, so the
 * server stays the only thing that knows the hierarchy.
 */

async function fetchAreas(url: string): Promise<readonly AdministrativeAreaOption[]> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`administrative-areas request failed: ${response.status}`);
  }
  const body = (await response.json()) as AdministrativeAreaResponse;
  return body.data;
}

/** Areas change only when the reference data is re-seeded, so cache them for the session. */
const STATIC_AREA_CACHE = { staleTime: Number.POSITIVE_INFINITY, gcTime: Number.POSITIVE_INFINITY };

export function useProvinces() {
  return useQuery({
    queryKey: ["administrative-areas", "provinces"],
    queryFn: () => fetchAreas("/api/v1/administrative-areas/provinces"),
    ...STATIC_AREA_CACHE,
  });
}

export function useDistricts(provinceId: string | undefined) {
  return useQuery({
    queryKey: ["administrative-areas", "districts", provinceId],
    queryFn: () =>
      fetchAreas(
        `/api/v1/administrative-areas/districts?province_id=${encodeURIComponent(provinceId ?? "")}`,
      ),
    enabled: Boolean(provinceId),
    ...STATIC_AREA_CACHE,
  });
}

export function useSubdistricts(districtId: string | undefined) {
  return useQuery({
    queryKey: ["administrative-areas", "subdistricts", districtId],
    queryFn: () =>
      fetchAreas(
        `/api/v1/administrative-areas/subdistricts?district_id=${encodeURIComponent(districtId ?? "")}`,
      ),
    enabled: Boolean(districtId),
    ...STATIC_AREA_CACHE,
  });
}

/**
 * One subdistrict with what is known about it, for a form reopened on an area chosen elsewhere.
 *
 * Shares the `by-ids` endpoint and cache key shape with the picker's starting list, so returning to
 * a place the reader has already seen costs nothing. Returns undefined rather than a fabricated
 * empty area while it loads: the confirmation prints figure counts, and a placeholder zero would
 * read as "nothing is known here".
 */
export function useAreaChoice(subdistrictId: string | undefined) {
  return useQuery({
    queryKey: ["area-by-id", subdistrictId],
    queryFn: async (): Promise<AreaChoice | undefined> => {
      const response = await fetch(
        `/api/v1/administrative-areas/by-ids?ids=${encodeURIComponent(subdistrictId ?? "")}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`area lookup failed: ${response.status}`);
      }
      return ((await response.json()) as { data: AreaChoice[] }).data[0];
    },
    enabled: Boolean(subdistrictId),
    ...STATIC_AREA_CACHE,
  });
}
