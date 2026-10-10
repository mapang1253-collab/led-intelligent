import { th } from "@reis/i18n";
import type { LucideIcon } from "lucide-react";
import { BookCheck, Database, MapPinned, Ruler, Scale } from "lucide-react";
import { Link } from "react-router";
import { type Pack, useSystemFigures } from "./useSystemFigures.js";

/**
 * What this system holds, below the form that uses it.
 *
 * Every figure is read from the system at load time rather than written into the page. A landing
 * section that states a coverage number is making a promise, and a promise that drifts from the
 * database is exactly what an examiner is right to catch — so the page asks the same endpoints the
 * status screen does, and prints what comes back.
 *
 * Nothing here is a claim the product cannot support. The counts are observations the sources
 * actually published, the rule pack says when it was reviewed, and the step list says plainly that a run
 * expires and that the analysis reports what it could not settle.
 */

const num = (value: number) => value.toLocaleString("th-TH");

function ColumnHeading({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-ink-muted text-xs">
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-card"
        style={{
          backgroundColor: "var(--color-signature-wash)",
          color: "var(--color-signature-text)",
        }}
      >
        <Icon size={13} aria-hidden="true" />
      </span>
      {children}
    </h3>
  );
}

function Figure({ value, note }: { value: string; note: string }) {
  return (
    <li className="border-border border-b py-2.5 last:border-b-0">
      <span className="block font-semibold text-sm">{value}</span>
      <span className="mt-0.5 block text-ink-muted text-xs leading-relaxed">{note}</span>
    </li>
  );
}

export function LandingSections() {
  /*
    One source for the counts.

    These panels and the hero above them print the same figures, and they used to read them
    through queries of their own that shared the hero's cache keys while returning a different
    shape — so whichever mounted first decided what the other saw, and the front page announced
    "0 จังหวัดทั่วประเทศ". One hook, one shape.
  */
  const {
    status,
    isLoading,
    isError,
    activeSources: active,
    observations,
    provinces,
    searchableProvinces,
    areas,
  } = useSystemFigures();

  /** The busiest area sets the scale, so every bar is read against the same thing. */
  const topTotal = Math.max(
    1,
    ...areas.map((area) => area.condominium_figures + area.land_figures),
  );

  return (
    <>
      {/* What it holds, in three columns, from the system rather than from this file. */}
      <section className="mt-12">
        <h2 className="font-bold text-2xl tracking-tight">{th.landing.dataHeading}</h2>
        <p className="mt-2 text-ink-muted text-sm leading-relaxed">{th.landing.dataIntro}</p>

        {isError ? (
          <p className="mt-4 text-ink-muted text-sm">{th.landing.dataFailed}</p>
        ) : isLoading ? (
          <p className="mt-4 text-ink-muted text-sm">{th.landing.dataLoading}</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {/* Boxed, not three bare columns. The step cards above carried the shape and the
                owners kept them for it; the steps themselves said what the form already shows. */}
            <div className="glass rounded-card p-5">
              <ColumnHeading icon={MapPinned}>{th.landing.dataColumnCoverage}</ColumnHeading>
              <ul className="mt-2">
                <Figure
                  value={th.landing.coverageProvinces.replace("{n}", num(provinces))}
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
              <ColumnHeading icon={Database}>{th.landing.dataColumnSources}</ColumnHeading>
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
              <ColumnHeading icon={Scale}>{th.landing.dataColumnMethods}</ColumnHeading>
              <ul className="mt-2">
                {[status?.legal_pack, status?.valuation_method]
                  .filter((pack): pack is Pack => Boolean(pack))
                  .map((pack) => (
                    <Figure
                      key={pack.title_th}
                      value={pack.title_th}
                      note={th.landing.methodReviewed.replace("{date}", pack.reviewed_on)}
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
      {areas.length > 0 && (
        <section className="mt-14">
          <h2 className="font-bold text-2xl tracking-tight">{th.landing.areasHeading}</h2>
          <p className="mt-2 text-ink-muted text-sm leading-relaxed">{th.landing.areasIntro}</p>

          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {/* A list, not a set of links. The form above already has a picker that selects one of
                these, and a second control that does the same thing from further down the page
                would be two ways to answer one question — the thing step one was reorganised to
                stop. */}
            {areas.map((area, index) => {
              const total = area.condominium_figures + area.land_figures;
              return (
                <li
                  key={area.subdistrict_id}
                  className="glass flex items-start gap-3 rounded-card p-4"
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-card font-bold text-xs tabular-nums"
                    style={{
                      backgroundColor: "var(--color-signature-wash)",
                      color: "var(--color-signature-text)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-sm">
                      <MapPinned size={14} className="shrink-0" aria-hidden="true" />
                      ต.{area.subdistrict_name_th}
                    </span>
                    <span className="mt-0.5 block text-ink-muted text-xs">
                      อ.{area.district_name_th} จ.{area.province_name_th}
                    </span>

                    {/* The two counts as figures rather than a sentence, and a bar showing how
                        this place compares with the best-documented one. The bar measures
                        published figures and nothing else — which is why the caption under the
                        list says in as many words that more of them is not a better place to
                        invest. */}
                    <span className="mt-2 flex gap-4">
                      {(
                        [
                          [Database, area.condominium_figures, th.landing.areasCondoLabel],
                          [Ruler, area.land_figures, th.landing.areasLandLabel],
                        ] as const
                      ).map(([Icon, value, label]) => (
                        <span key={label} className="flex items-center gap-1.5">
                          <Icon size={13} className="text-ink-muted" aria-hidden="true" />
                          <span className="font-bold text-sm tabular-nums">{num(value)}</span>
                          <span className="text-ink-muted text-xs">{label}</span>
                        </span>
                      ))}
                    </span>

                    <span
                      className="mt-2 block h-1 overflow-hidden rounded-pill"
                      style={{ backgroundColor: "var(--color-border)" }}
                    >
                      <span
                        className="block h-full rounded-pill"
                        style={{
                          width: `${topTotal > 0 ? Math.max(6, (total / topTotal) * 100) : 0}%`,
                          background:
                            "linear-gradient(90deg, var(--grad-vivid-from), var(--grad-vivid-via))",
                        }}
                      />
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="mt-3 text-ink-muted text-xs leading-relaxed">{th.landing.areasPickNote}</p>
        </section>
      )}
    </>
  );
}
