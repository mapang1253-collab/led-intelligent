import { th } from "@reis/i18n";
import { ArrowRight, Building2, Info, LoaderCircle, Star } from "lucide-react";
import { useNavigate } from "react-router";
import { useCreateRun } from "../run/useAnalysisRun.js";
import { AreaComparison } from "./AreaComparison.js";
import { type Favourite, useFavourites } from "./useFavourites.js";

/**
 * The shortlist, on a screen of its own.
 *
 * It used to live only at the top of the area picker, which meant it existed until you searched
 * for something and then vanished, and could not be reached at all from a result. A list whose
 * whole purpose is comparing four places over an afternoon needs somewhere it stays put, so it has
 * a rail entry and a route, and the picker no longer keeps a second copy — one list, one home.
 *
 * Starting an analysis from here is the same call the intake form makes with nothing but an area
 * filled in, which is what a saved entry holds. The optional site facts are not asked for again;
 * anyone who wants to add a road width can go through the form.
 */

function placeLabel(entry: Favourite): { name: string; within: string } {
  const bangkok = entry.province_name_th === "กรุงเทพมหานคร";
  return {
    name: `${bangkok ? "แขวง" : "ต."}${entry.subdistrict_name_th}`,
    within: bangkok
      ? `เขต${entry.district_name_th} ${entry.province_name_th}`
      : `อ.${entry.district_name_th} จ.${entry.province_name_th}`,
  };
}

export function SavedAreasPage() {
  const favourites = useFavourites();
  const navigate = useNavigate();
  const createRun = useCreateRun();

  function analyse(entry: Favourite) {
    const intake = {
      province_id: entry.province_id,
      district_id: entry.district_id,
      subdistrict_id: entry.subdistrict_id,
    };
    createRun.mutate(intake, {
      onSuccess: (run) => navigate(`/runs/${run.run_id}`, { state: { intake } }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:py-12">
      <h1 className="flex items-center gap-2.5 font-bold text-3xl tracking-tight">
        <Star size={26} aria-hidden="true" />
        {th.picker.favouritesHeading}
      </h1>

      {favourites.list.length === 0 ? (
        <p className="mt-4 text-ink-muted text-sm leading-relaxed">{th.picker.favouritesEmpty}</p>
      ) : (
        <>
          <p className="mt-2 text-ink-muted text-sm leading-relaxed">
            {th.picker.favouritesPageIntro}
          </p>
          {/* Where this list lives, said on the screen that holds it. */}
          <p className="mt-2 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.picker.favouritesNote}
          </p>

          {/* The figures side by side come first: holding four places in your head across four
              result screens is the work this page exists to remove. The cards below are for
              acting on one of them once the comparison has told you which. */}
          <AreaComparison favourites={favourites.list} />

          <ul className="mt-5">
            {favourites.list.map((entry) => {
              const { name, within } = placeLabel(entry);
              const badges: string[] = [];
              // Counts, with the unit after the number — never mistakable for a baht figure.
              const count = (n: number) =>
                `${n.toLocaleString("th-TH")} ${th.picker.figureCountUnit}`;
              if (entry.condominium_figures > 0) {
                badges.push(`${th.picker.condoBadge} ${count(entry.condominium_figures)}`);
              }
              if (entry.land_figures > 0) {
                badges.push(`${th.picker.landBadge} ${count(entry.land_figures)}`);
              }
              return (
                <li
                  key={entry.subdistrict_id}
                  className="glass mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{name}</p>
                    <p className="text-ink-muted text-xs">{within}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-ink-muted text-xs">
                      <Building2 size={12} aria-hidden="true" />
                      {badges.length > 0 ? badges.join(" · ") : th.picker.noPropertyData}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => analyse(entry)}
                      disabled={createRun.isPending}
                      className="flex items-center gap-1.5 rounded-pill px-4 py-2 font-semibold text-sm"
                      style={{
                        backgroundColor: "var(--color-signature)",
                        color: "var(--color-signature-on)",
                      }}
                    >
                      {createRun.isPending ? (
                        <>
                          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                          {th.picker.favouriteStarting}
                        </>
                      ) : (
                        <>
                          {th.picker.favouriteAnalyse}
                          <ArrowRight size={15} aria-hidden="true" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        favourites.toggle({
                          ...entry,
                          has_own_population: false,
                          matched_building_th: null,
                        })
                      }
                      aria-label={th.picker.favouriteRemove}
                      title={th.picker.favouriteRemove}
                      className="rounded-card p-2"
                      style={{ color: "var(--color-signature-text)" }}
                    >
                      <Star size={16} fill="currentColor" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
