import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Info, Table2 } from "lucide-react";
import type { Favourite } from "./useFavourites.js";

/**
 * The shortlist's reason for existing: several places, one screen, figures lined up.
 *
 * Holding four areas in your head across four visits to four result screens is the thing a reader
 * was doing by hand, on paper, before this table. What it compares is deliberately narrow — the
 * assessed price spans and the population — because those are the figures that exist for every
 * subdistrict in the country and can therefore be lined up without gaps that mean nothing.
 *
 * Three honesty rules shape it, and each one is visible on the screen rather than only here:
 *
 * A span is a low and a high of figures the state actually published, never a mean of them
 * (docs/adr/0002).
 *
 * The subdistrict's own figures are preferred, and the district's are used only where it has none —
 * which is the ordinary case for land, published district by district. Every cell says which of the
 * two it is. A comparison is the worst place to borrow a containing area's number silently: two
 * subdistricts of one district then show an identical land price, and a reader who was not told the
 * level reads one figure as two findings.
 *
 * The count of figures behind each span is printed beside it, because a span drawn from four
 * figures and a span drawn from four hundred look identical and are not the same evidence.
 */

interface ComparisonRow {
  subdistrict_id: string;
  subdistrict_name_th: string;
  district_name_th: string;
  province_name_th: string;
  condominium_low: string | null;
  condominium_high: string | null;
  condominium_count: number;
  condominium_level: "SUBDISTRICT" | "DISTRICT" | null;
  land_low: string | null;
  land_high: string | null;
  land_count: number;
  land_level: "SUBDISTRICT" | "DISTRICT" | null;
  population: string | null;
}

/** Below this, a span says more about the thinness of the data than about the place. */
const THIN_EVIDENCE = 5;

const thNumber = (value: string | null) =>
  value === null ? null : Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 });

function Span({
  low,
  high,
  count,
  level,
}: {
  low: string | null;
  high: string | null;
  count: number;
  level: "SUBDISTRICT" | "DISTRICT" | null;
}) {
  const lowText = thNumber(low);
  const highText = thNumber(high);
  if (lowText === null || highText === null) {
    // Not a zero and not a dash: an absence of published figures is its own fact.
    return <span className="text-ink-muted text-xs">{th.picker.compareNoFigure}</span>;
  }
  const borrowed = level === "DISTRICT";
  return (
    <span className="block">
      <span className="font-semibold tabular-nums">
        {lowText === highText ? lowText : `${lowText}–${highText}`}
      </span>
      <span
        className="mt-0.5 block text-xs tabular-nums"
        style={{
          color: count < THIN_EVIDENCE ? "var(--color-partial)" : "var(--color-ink-muted)",
        }}
      >
        {count.toLocaleString("th-TH")} {th.picker.compareRecords}
      </span>
      {/* Which place the figure is about. Left on every cell rather than only the borrowed ones,
          because "this subdistrict" is the fact a reader is relying on when they read across. */}
      <span
        className="mt-0.5 block text-xs"
        style={{ color: borrowed ? "var(--color-partial)" : "var(--color-ink-muted)" }}
      >
        {borrowed ? th.picker.compareLevelDistrict : th.picker.compareLevelSubdistrict}
      </span>
    </span>
  );
}

export function AreaComparison({ favourites }: { favourites: readonly Favourite[] }) {
  const ids = favourites.map((entry) => entry.subdistrict_id);
  const comparison = useQuery({
    queryKey: ["area-comparison", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<ComparisonRow[]> => {
      const response = await fetch(`/api/v1/administrative-areas/compare?ids=${ids.join(",")}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`comparison failed: ${response.status}`);
      }
      return ((await response.json()) as { data: ComparisonRow[] }).data;
    },
  });

  if (ids.length === 0) {
    return null;
  }

  const rows = comparison.data ?? [];
  const anyThin = rows.some(
    (row) =>
      (row.condominium_count > 0 && row.condominium_count < THIN_EVIDENCE) ||
      (row.land_count > 0 && row.land_count < THIN_EVIDENCE),
  );

  return (
    <section className="glass mt-6 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Table2 size={19} aria-hidden="true" />
        {th.picker.compareHeading}
      </h2>

      {comparison.isLoading && (
        <p className="mt-3 text-ink-muted text-sm">{th.picker.compareLoading}</p>
      )}
      {comparison.isError && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-fail)" }}>
          {th.picker.compareFailed}
        </p>
      )}

      {rows.length > 0 && (
        <>
          {/* Tables are the one thing allowed to scroll sideways on a narrow screen; the page
              itself must not. */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-ink-muted text-xs">
                  <th className="py-2 pr-4 text-left font-medium">{th.picker.compareArea}</th>
                  <th className="py-2 pr-4 text-right font-medium">{th.picker.compareCondo}</th>
                  <th className="py-2 pr-4 text-right font-medium">{th.picker.compareLand}</th>
                  <th className="py-2 text-right font-medium">{th.picker.comparePopulation}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const bangkok = row.province_name_th === "กรุงเทพมหานคร";
                  return (
                    <tr key={row.subdistrict_id} className="border-border border-b last:border-b-0">
                      <td className="py-3 pr-4 align-top">
                        <span className="font-medium">
                          {bangkok ? "แขวง" : "ต."}
                          {row.subdistrict_name_th}
                        </span>
                        <span className="block text-ink-muted text-xs">
                          {bangkok
                            ? `เขต${row.district_name_th} ${row.province_name_th}`
                            : `อ.${row.district_name_th} จ.${row.province_name_th}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right align-top">
                        <Span
                          low={row.condominium_low}
                          high={row.condominium_high}
                          count={row.condominium_count}
                          level={row.condominium_level}
                        />
                      </td>
                      <td className="py-3 pr-4 text-right align-top">
                        <Span
                          low={row.land_low}
                          high={row.land_high}
                          count={row.land_count}
                          level={row.land_level}
                        />
                      </td>
                      <td className="py-3 text-right align-top tabular-nums">
                        {thNumber(row.population) ?? (
                          <span className="text-ink-muted text-xs">
                            {th.picker.compareNoFigure}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.picker.compareNote}
          </p>
          {anyThin && (
            <p
              className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed"
              style={{ color: "var(--color-partial)" }}
            >
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.picker.compareThinWarning}
            </p>
          )}
        </>
      )}
    </section>
  );
}
