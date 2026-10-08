import { th } from "@reis/i18n";
import {
  type FeasibilityMethodPack,
  type FeasibilityResult,
  computeFeasibility,
} from "@reis/scenario-engine";
import { Scale, TriangleAlert } from "lucide-react";
import { useState } from "react";
import methodFile from "../../../../../../database/reviewed-packs/th-feasibility-assumption-v1.json" with {
  type: "json",
};
import { Notice } from "./Notice.js";
import { PanelHeading } from "./PanelHeading.js";
import type { ConceptCard } from "./useAnalysisRun.js";

/**
 * The same reviewed method, run across every proposed concept at once.
 *
 * A single concept's payback answers "could this work". Four concepts side by side answer the
 * question the product is named after — which use is highest and best — and that is the comparison a
 * reader was doing on paper, one tab visit at a time, with six assumptions they had to retype
 * identically each time or the comparison meant nothing. Shared assumptions are entered once here
 * precisely so the columns are comparable.
 *
 * Three things keep this from becoming the ranking the architecture forbids.
 *
 * Rows stay in proposal order and the best figure is never marked. Every number in the money columns
 * descends from guesses the reader typed, so a league table of them ranks the guesses; changing the
 * rent assumption by a fifth reorders it.
 *
 * The legal result sits in the same row as the return, not on another tab. Reading a yield of 9%
 * beside "ยังสรุปไม่ได้" is the whole point: the specific way an investor loses money here is buying
 * for the return and discovering the use cannot be cleared.
 *
 * And when the per-concept inputs have not been differentiated, the panel says so rather than
 * presenting four identical rows as a finding. Identical inputs producing identical outputs is
 * arithmetic, not analysis.
 *
 * No new arithmetic lives here: every figure comes from `computeFeasibility`, the same
 * ACADEMIC_REVIEWED, hash-bound method the single-concept panel runs, called once per concept.
 */

const METHOD = methodFile as unknown as FeasibilityMethodPack;
const VALIDATION_LABELS = th.validationStatus as Record<string, string>;

/** Per-concept assumptions. Shared ones live on the panel, because the land is the same land. */
interface ConceptAssumptions {
  floorArea: string;
  cost: string;
  rent: string;
}

const EMPTY: ConceptAssumptions = { floorArea: "", cost: "", rent: "" };

const baht = (value: string) => Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 });

/** The colour a legal status earns. Only a real FAIL gets the failure colour. */
function statusColour(status: string): string {
  switch (status) {
    case "PASS":
      return "var(--color-pass)";
    case "FAIL":
      return "var(--color-fail)";
    case "PARTIAL":
      return "var(--color-partial)";
    default:
      return "var(--color-unknown)";
  }
}

function NumberCell({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Read out by a screen reader. In the grid the column heading is the only visible name. */
  label: string;
  /** Set where a visible caption exists, so the caption is the control's label rather than aria. */
  id?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      value={value}
      {...(id ? { id } : {})}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-card border border-border-strong bg-surface px-2 py-1.5 text-sm tabular-nums"
    />
  );
}

/** A shared assumption: one visible caption, tied to its own control. */
function SharedField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="block">
      <label htmlFor={id} className="text-ink-muted text-xs">
        {label}
      </label>
      <NumberCell id={id} value={value} onChange={onChange} label={label} />
    </div>
  );
}

export function ConceptComparison({
  concepts,
  landValueBaht,
}: {
  concepts: readonly ConceptCard[] | undefined;
  landValueBaht?: string;
}) {
  const list = concepts ?? [];
  const [land, setLand] = useState(landValueBaht ?? "");
  const [occupancy, setOccupancy] = useState("80");
  const [operating, setOperating] = useState("30");
  const [perConcept, setPerConcept] = useState<Record<string, ConceptAssumptions>>({});
  const [results, setResults] = useState<Record<string, FeasibilityResult> | null>(null);

  if (list.length === 0) {
    return (
      <section className="glass mt-5 rounded-card p-6">
        <PanelHeading icon={Scale}>{th.compare.heading}</PanelHeading>
        <p className="mt-2 text-ink-muted text-sm">{th.compare.noConcepts}</p>
      </section>
    );
  }

  const forConcept = (id: string): ConceptAssumptions => perConcept[id] ?? EMPTY;
  const setField = (id: string, field: keyof ConceptAssumptions, next: string) =>
    setPerConcept((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY), [field]: next },
    }));

  function run() {
    const computed: Record<string, FeasibilityResult> = {};
    for (const concept of list) {
      const own = forConcept(concept.concept_id);
      computed[concept.concept_id] = computeFeasibility(METHOD, {
        landValueBaht: Number(land || 0),
        floorAreaSqm: Number(own.floorArea),
        constructionCostPerSqm: Number(own.cost),
        rentPerSqmPerMonth: Number(own.rent),
        occupancyRate: Number(occupancy) / 100,
        operatingCostRate: Number(operating) / 100,
      });
    }
    setResults(computed);
  }

  // Every concept given the same three numbers produces the same row. Worth saying out loud, since
  // four identical rows otherwise look like a finding that the uses are equivalent.
  const distinct = new Set(
    list.map((concept) => {
      const own = forConcept(concept.concept_id);
      return `${own.floorArea}|${own.cost}|${own.rent}`;
    }),
  );
  const allIdentical = list.length > 1 && distinct.size === 1;
  const anyUnclearedLegally =
    results !== null && list.some((concept) => (concept.legal?.status ?? "UNKNOWN") !== "PASS");

  return (
    <section className="glass mt-5 rounded-card p-6">
      <PanelHeading icon={Scale}>{th.compare.heading}</PanelHeading>
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.compare.intro}</p>

      <h3 className="mt-5 font-semibold text-sm">{th.compare.sharedHeading}</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <SharedField
          id="compare-land-value"
          label={th.feasibility.landValueLabel}
          value={land}
          onChange={setLand}
        />
        <SharedField
          id="compare-occupancy"
          label={th.feasibility.occupancyLabel}
          value={occupancy}
          onChange={setOccupancy}
        />
        <SharedField
          id="compare-operating"
          label={th.feasibility.operatingCostLabel}
          value={operating}
          onChange={setOperating}
        />
      </div>

      <h3 className="mt-5 font-semibold text-sm">{th.compare.perConceptHeading}</h3>
      <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.compare.perConceptNote}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b text-ink-muted text-xs">
              <th className="py-2 pr-3 text-left font-medium">{th.compare.columnConcept}</th>
              <th className="py-2 pr-3 text-left font-medium">{th.compare.floorArea}</th>
              <th className="py-2 pr-3 text-left font-medium">{th.compare.cost}</th>
              <th className="py-2 text-left font-medium">{th.compare.rent}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((concept) => {
              const own = forConcept(concept.concept_id);
              return (
                <tr key={concept.concept_id} className="border-border border-b last:border-b-0">
                  <td className="py-2 pr-3 align-middle font-medium">{concept.label_th}</td>
                  <td className="py-2 pr-3">
                    <NumberCell
                      value={own.floorArea}
                      onChange={(v) => setField(concept.concept_id, "floorArea", v)}
                      label={`${concept.label_th} ${th.compare.floorArea}`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <NumberCell
                      value={own.cost}
                      onChange={(v) => setField(concept.concept_id, "cost", v)}
                      label={`${concept.label_th} ${th.compare.cost}`}
                    />
                  </td>
                  <td className="py-2">
                    <NumberCell
                      value={own.rent}
                      onChange={(v) => setField(concept.concept_id, "rent", v)}
                      label={`${concept.label_th} ${th.compare.rent}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={run}
        className="mt-4 rounded-pill px-6 py-2.5 font-semibold text-sm"
        style={{
          backgroundColor: "var(--color-signature)",
          color: "var(--color-signature-on)",
        }}
      >
        {th.compare.compute}
      </button>

      {results !== null && (
        <>
          <h3 className="mt-6 font-semibold">{th.compare.resultHeading}</h3>
          {allIdentical && (
            <p
              className="mt-2 flex items-start gap-2 text-xs leading-relaxed"
              style={{ color: "var(--color-partial)" }}
            >
              <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.compare.identicalWarning}
            </p>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-ink-muted text-xs">
                  <th className="py-2 pr-3 text-left font-medium">{th.compare.columnConcept}</th>
                  <th className="py-2 pr-3 text-left font-medium">{th.compare.columnLegal}</th>
                  <th className="py-2 pr-3 text-right font-medium">{th.compare.columnCapital}</th>
                  <th className="py-2 pr-3 text-right font-medium">{th.compare.columnNet}</th>
                  <th className="py-2 pr-3 text-right font-medium">{th.compare.columnPayback}</th>
                  <th className="py-2 text-right font-medium">{th.compare.columnYield}</th>
                </tr>
              </thead>
              <tbody>
                {/* Proposal order, always. Sorting this table by return would be the ranking the
                    product refuses to make, produced from the reader's own assumptions. */}
                {list.map((concept) => {
                  const result = results[concept.concept_id];
                  const computed = result?.outcome === "COMPUTED" ? result : null;
                  const legalStatus = concept.legal?.status ?? "UNKNOWN";
                  return (
                    <tr key={concept.concept_id} className="border-border border-b last:border-b-0">
                      <td className="py-2.5 pr-3 align-top font-medium">{concept.label_th}</td>
                      <td className="py-2.5 pr-3 align-top">
                        <span className="text-xs" style={{ color: statusColour(legalStatus) }}>
                          {VALIDATION_LABELS[legalStatus] ?? legalStatus}
                        </span>
                      </td>
                      {computed === null ? (
                        <td className="py-2.5 text-ink-muted text-xs" colSpan={4}>
                          {th.compare.notComputedShort}
                        </td>
                      ) : (
                        <>
                          <td className="py-2.5 pr-3 text-right align-top tabular-nums">
                            {baht(computed.capital_total)}
                          </td>
                          <td className="py-2.5 pr-3 text-right align-top tabular-nums">
                            {baht(computed.net_annual_income)}
                          </td>
                          <td className="py-2.5 pr-3 text-right align-top tabular-nums">
                            {computed.payback_years ?? "—"}
                          </td>
                          <td className="py-2.5 text-right align-top tabular-nums">
                            {computed.simple_yield_percent === null
                              ? "—"
                              : `${computed.simple_yield_percent}%`}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Notice>{th.compare.notARanking}</Notice>
          {anyUnclearedLegally && (
            <p
              className="mt-2 flex items-start gap-2 text-xs leading-relaxed"
              style={{ color: "var(--color-partial)" }}
            >
              <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.compare.legalWarning}
            </p>
          )}
        </>
      )}
    </section>
  );
}
