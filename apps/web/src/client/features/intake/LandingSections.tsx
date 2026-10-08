import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { BookCheck, MapPinned } from "lucide-react";
import { Link } from "react-router";

/**
 * What this system holds, below the form that uses it.
 *
 * Every figure is read from the system at load time rather than written into the page. A landing
 * section that states a coverage number is making a promise, and a promise that drifts from the
 * database is exactly what an examiner is right to catch — so the page asks the same endpoints the
 * status screen does, and prints what comes back.
 *
 * Nothing here is a claim the product cannot support. The counts are observations the sources
 * actually published, the rule pack names its reviewers, and the step list says plainly that a run
 * expires and that the analysis reports what it could not settle.
 */

interface SourceStatus {
  product_id: string;
  title_th: string;
  activation_state: string;
  observations: number;
}

interface Pack {
  title_th: string;
  version: string;
  rule_count?: number;
  reviewers: string[];
  reviewed_on: string;
}

interface SystemStatus {
  sources: SourceStatus[];
  legal_pack: Pack | null;
  valuation_method: Pack | null;
}

interface WellDocumented {
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

const num = (value: number) => value.toLocaleString("th-TH");

function Figure({ value, note }: { value: string; note: string }) {
  return (
    <li className="border-border border-b py-2.5 last:border-b-0">
      <span className="block font-semibold text-sm">{value}</span>
      <span className="mt-0.5 block text-ink-muted text-xs leading-relaxed">{note}</span>
    </li>
  );
}

export function LandingSections() {
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
    queryFn: async (): Promise<unknown[]> => {
      const response = await fetch("/api/v1/administrative-areas/provinces", {
        headers: { Accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as { data: unknown[] }).data : [];
    },
  });

  const coverage = useQuery({
    queryKey: ["parcel-coverage", "landing"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<Coverage> => {
      const response = await fetch("/api/v1/parcels/coverage", {
        headers: { Accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as Coverage) : { data: [] };
    },
  });

  const areas = useQuery({
    queryKey: ["well-documented", "landing"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WellDocumented[]> => {
      const response = await fetch("/api/v1/administrative-areas/well-documented", {
        headers: { Accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as { data: WellDocumented[] }).data : [];
    },
  });

  const active = (status.data?.sources ?? []).filter(
    (source) => source.activation_state === "ACTIVE",
  );
  const observations = active.reduce((total, source) => total + (source.observations ?? 0), 0);
  const searchableProvinces =
    (coverage.data?.data ?? []).filter((province) => province.parcels > 0).length +
    (coverage.data?.live ?? []).length;

  return (
    <>
      {/* What it holds, in three columns, from the system rather than from this file. */}
      <section className="mt-12">
        <h2 className="font-bold text-2xl tracking-tight">{th.landing.dataHeading}</h2>
        <p className="mt-2 text-ink-muted text-sm leading-relaxed">{th.landing.dataIntro}</p>

        {status.isError ? (
          <p className="mt-4 text-ink-muted text-sm">{th.landing.dataFailed}</p>
        ) : status.isLoading ? (
          <p className="mt-4 text-ink-muted text-sm">{th.landing.dataLoading}</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {/* Boxed, not three bare columns. The step cards above carried the shape and the
                owners kept them for it; the steps themselves said what the form already shows. */}
            <div className="glass rounded-card p-5">
              <h3 className="font-semibold text-ink-muted text-xs">
                {th.landing.dataColumnCoverage}
              </h3>
              <ul className="mt-2">
                <Figure
                  value={th.landing.coverageProvinces.replace(
                    "{n}",
                    num(provinces.data?.length ?? 0),
                  )}
                  note={th.landing.coverageProvincesNote}
                />
                <Figure
                  value={th.landing.coverageParcels.replace("{n}", num(searchableProvinces))}
                  note={th.landing.coverageParcelsNote}
                />
                <Figure
                  value={th.landing.coverageObservations.replace("{n}", num(observations))}
                  note={th.landing.coverageObservationsNote}
                />
              </ul>
            </div>

            <div className="glass rounded-card p-5">
              <h3 className="font-semibold text-ink-muted text-xs">
                {th.landing.dataColumnSources}
              </h3>
              <ul className="mt-2">
                {active.map((source) => (
                  <Figure
                    key={source.product_id}
                    value={source.title_th}
                    note={th.landing.coverageObservations.replace("{n}", num(source.observations))}
                  />
                ))}
              </ul>
            </div>

            <div className="glass rounded-card p-5">
              <h3 className="font-semibold text-ink-muted text-xs">
                {th.landing.dataColumnMethods}
              </h3>
              <ul className="mt-2">
                {[status.data?.legal_pack, status.data?.valuation_method]
                  .filter((pack): pack is Pack => Boolean(pack))
                  .map((pack) => (
                    <Figure
                      key={pack.title_th}
                      value={pack.title_th}
                      note={th.landing.methodReviewed
                        .replace("{reviewers}", pack.reviewers.join(", "))
                        .replace("{date}", pack.reviewed_on)}
                    />
                  ))}
              </ul>
              <Link
                to="/status"
                className="mt-2.5 inline-flex items-center gap-1.5 font-medium text-signature-text text-xs"
              >
                <BookCheck size={13} aria-hidden="true" />
                {th.landing.dataStatusLink}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Where to start, ranked by how much the sources published there. The caveat is the point:
          a well-documented place is not a good place to invest, and the two are easy to confuse. */}
      {(areas.data?.length ?? 0) > 0 && (
        <section className="mt-14">
          <h2 className="font-bold text-2xl tracking-tight">{th.landing.areasHeading}</h2>
          <p className="mt-2 text-ink-muted text-sm leading-relaxed">{th.landing.areasIntro}</p>

          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {/* A list, not a set of links. The form above already has a picker that selects one of
                these, and a second control that does the same thing from further down the page
                would be two ways to answer one question — the thing step one was reorganised to
                stop. */}
            {(areas.data ?? []).map((area, index) => (
              <li
                key={area.subdistrict_id}
                className="glass flex items-start gap-3 rounded-card p-4"
              >
                <span className="font-bold text-ink-muted text-sm tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold text-sm">
                    <MapPinned size={14} className="shrink-0" aria-hidden="true" />
                    ต.{area.subdistrict_name_th}
                  </span>
                  <span className="mt-0.5 block text-ink-muted text-xs">
                    อ.{area.district_name_th} จ.{area.province_name_th}
                  </span>
                  <span className="mt-1 block text-ink-muted text-xs">
                    {th.landing.areasCondo.replace("{n}", num(area.condominium_figures))} ·{" "}
                    {th.landing.areasLand.replace("{n}", num(area.land_figures))}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-ink-muted text-xs leading-relaxed">{th.landing.areasPickNote}</p>
        </section>
      )}
    </>
  );
}
