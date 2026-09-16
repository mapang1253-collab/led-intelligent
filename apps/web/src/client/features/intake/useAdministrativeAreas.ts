import type { AdministrativeAreaOption, AdministrativeAreaResponse } from "@reis/contracts";
import { useQuery } from "@tanstack/react-query";

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
