import { useQuery } from "@tanstack/react-query";

/**
 * The figures the front page prints, read from the running system.
 *
 * One hook rather than a set of queries copied into each section, because the hero's callouts and
 * the panels below them state the same counts and must never disagree about them. A landing page
 * that states a coverage number is making a promise, and a promise written into the page drifts
 * from the database the first time the database changes — so nothing here is a literal.
 */

export interface SourceStatus {
  product_id: string;
  title_th: string;
  activation_state: string;
  observations: number;
}

export interface Pack {
  title_th: string;
  version: string;
  rule_count?: number;
  reviewers: string[];
  reviewed_on: string;
}

export interface SystemStatus {
  sources: SourceStatus[];
  legal_pack: Pack | null;
  valuation_method: Pack | null;
}

export interface WellDocumented {
  subdistrict_id: string;
  subdistrict_name_th: string;
  district_name_th: string;
  province_name_th: string;
  condominium_figures: number;
  land_figures: number;
}

interface Coverage {
  data: { province_code: string; parcels: number }[];
  live?: { province_code: string }[];
}

/**
 * A read that cannot take the page down with it.
 *
 * The front page prints these counts and must still render without them: a failed fetch, or a
 * body in a shape this file did not expect, is a figure that is missing, never a blank screen.
 */
async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return fallback;
    }
    const body = (await response.json()) as T;
    return body ?? fallback;
  } catch {
    return fallback;
  }
}

/** Whatever came back, as a list — an unexpected body costs a count, not the page. */
function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export interface SystemFigures {
  readonly status: SystemStatus | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  /** Sources that have passed their activation gate — the only ones a run may use. */
  readonly activeSources: SourceStatus[];
  readonly observations: number;
  readonly provinces: number;
  /** Provinces whose parcels can be found by ระวาง and เลขที่ดิน, stored or looked up live. */
  readonly searchableProvinces: number;
  readonly areas: WellDocumented[];
}

export function useSystemFigures(): SystemFigures {
  const status = useQuery({
    queryKey: ["system-status", "landing"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SystemStatus> => {
      const response = await fetch("/api/v1/system-status", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`status failed: ${response.status}`);
      }
      return (await response.json()) as SystemStatus;
    },
  });

  const provinces = useQuery({
    queryKey: ["provinces", "landing"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: () =>
      getJson<{ data: unknown[] }>("/api/v1/administrative-areas/provinces", { data: [] }),
  });

  const coverage = useQuery({
    queryKey: ["parcel-coverage", "landing"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: () => getJson<Coverage>("/api/v1/parcels/coverage", { data: [] }),
  });

  const areas = useQuery({
    queryKey: ["well-documented", "landing"],
    staleTime: 5 * 60_000,
    queryFn: () =>
      getJson<{ data: WellDocumented[] }>("/api/v1/administrative-areas/well-documented", {
        data: [],
      }),
  });

  const activeSources = (listOf(status.data?.sources) as SourceStatus[]).filter(
    (source) => source.activation_state === "ACTIVE",
  );

  return {
    status: status.data,
    isLoading: status.isLoading,
    isError: status.isError,
    activeSources,
    observations: activeSources.reduce((total, source) => total + (source.observations ?? 0), 0),
    provinces: listOf(provinces.data?.data).length,
    searchableProvinces:
      listOf(coverage.data?.data).filter((province) => {
        // A province is in the stored set but holds no parcels until its geometry is loaded, so
        // the row existing is not the same as the lookup working there.
        const { parcels } = province as { parcels?: number };
        return (parcels ?? 0) > 0;
      }).length + listOf(coverage.data?.live).length,
    areas: listOf(areas.data?.data) as WellDocumented[],
  };
}
