import { th } from "@reis/i18n";
import {
  type FeasibilityMethodPack,
  type FeasibilityResult,
  computeFeasibility,
} from "@reis/scenario-engine";
import { Calculator, Info, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import methodFile from "../../../../../../database/reviewed-packs/th-feasibility-assumption-v1.json" with {
  type: "json",
};
import { Caveat } from "./Caveat.js";
import { FilterableSelect } from "./FilterableSelect.js";
import { Notice } from "./Notice.js";
import type { EvidenceGroup } from "./useAnalysisRun.js";

/**
 * Preliminary feasibility, from assumptions the reader types in.
 *
 * Every field on this screen except the land value is a number nobody published: Thailand has no
 * systematic public source for construction cost per square metre or for rent by area. Rather than
 * divide one assessed tax base by another and call the quotient a return, the panel asks, labels
 * every answer as the reader's own assumption, and shows the arithmetic line by line so the result
 * can be checked rather than believed.
 *
 * The land value arrives pre-filled from the assessed land valuation when one has been computed —
 * marked as coming from the state's schedule, and editable, because an assessed value is a tax base
 * and a purchase price is not.
 *
 * The sensitivity table is the part that matters most. A single payback figure from six guesses
 * invites more confidence than six guesses deserve; the table says what happens when each guess is
 * wrong by a fifth, which is the honest shape of the answer.
 */

const METHOD = methodFile as unknown as FeasibilityMethodPack;
const REASONS = th.feasibility.reason as Record<string, string>;

const baht = (value: string) => Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 });

function Field({
  label,
  value,
  onChange,
  suffix,
  fromEvidence,
  help,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
  /** True when the app filled this in from published figures rather than the reader. */
  fromEvidence?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-center gap-x-2 font-medium text-sm">
        {label}
        <span
          className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-medium text-xs"
          style={{
            backgroundColor: fromEvidence ? "var(--color-pass-soft)" : "var(--color-unknown-soft)",
            color: fromEvidence ? "var(--color-pass)" : "var(--color-unknown)",
          }}
        >
          <Pencil size={10} aria-hidden="true" />
          {fromEvidence ? th.feasibility.evidenceBadge : th.feasibility.assumptionBadge}
        </span>
      </span>
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-card border border-border-strong bg-surface px-3 py-2.5 text-base tabular-nums"
        />
        {suffix && <span className="shrink-0 text-ink-muted text-sm">{suffix}</span>}
      </span>
      {help && <span className="mt-1 block text-ink-muted text-xs leading-relaxed">{help}</span>}
    </label>
  );
}

/** The measure the evidence model files published construction figures under. */
const CONSTRUCTION_REQUIREMENT = "economic.construction_cost_reference";

export function FeasibilityPanel({
  landValueBaht,
  groups,
}: {
  landValueBaht?: string;
  /**
   * The run's own evidence, so the published construction figures can be offered beside the field
   * that wants one. They were already on the screen above this panel and the calculator still
   * asked the reader to go and find a number.
   */
  groups?: readonly EvidenceGroup[] | undefined;
}) {
  const [land, setLand] = useState(landValueBaht ?? "");

  /**
   * Take the land value when it arrives, but never over the reader's own number.
   *
   * It arrives late by nature: the valuation above this panel cannot produce one until a land
   * type is chosen, which is long after this component first renders. `useState` reads its
   * argument once, so the field stayed empty under help text promising it would be filled.
   *
   * The guard is what makes this safe to do at all. The field is only overwritten while it still
   * holds the value this effect last put there — the moment someone types a real purchase price,
   * which the help text explicitly invites, their number stands.
   */
  const applied = useRef<string | undefined>(landValueBaht);
  useEffect(() => {
    if (!landValueBaht || landValueBaht === applied.current) {
      return;
    }
    setLand((current) => (current === "" || current === applied.current ? landValueBaht : current));
    applied.current = landValueBaht;
  }, [landValueBaht]);
  const [floorArea, setFloorArea] = useState("");
  const [cost, setCost] = useState("");
  const [rent, setRent] = useState("");
  const [occupancy, setOccupancy] = useState("80");
  const [operating, setOperating] = useState("30");
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [suggestionId, setSuggestionId] = useState("");

  /**
   * Published figures that carry one number rather than a spread.
   *
   * A range cannot be dropped into a field that multiplies: the source did not say which of the
   * two ends applies to this building, and picking one silently would invent the difference. The
   * same rule the land valuation already follows.
   */
  const suggestions = (groups ?? [])
    .filter((group) => group.requirement_id === CONSTRUCTION_REQUIREMENT)
    .flatMap((group) => group.items)
    .filter((item) => item.value);
  const suggestion = suggestions.find((item) => item.observation_id === suggestionId);

  function run() {
    setResult(
      computeFeasibility(METHOD, {
        landValueBaht: Number(land || 0),
        floorAreaSqm: Number(floorArea),
        constructionCostPerSqm: Number(cost),
        rentPerSqmPerMonth: Number(rent),
        // Entered as a percentage because that is how anyone says it; the method takes a share.
        occupancyRate: Number(occupancy) / 100,
        operatingCostRate: Number(operating) / 100,
      }),
    );
  }

  const computed = result?.outcome === "COMPUTED" ? result : null;

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Calculator size={19} aria-hidden="true" />
        {th.feasibility.heading}
      </h2>
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.feasibility.intro}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label={th.feasibility.landValueLabel}
          value={land}
          onChange={setLand}
          fromEvidence={Boolean(landValueBaht) && land === landValueBaht}
          help={th.feasibility.landValueHelp}
        />
        <Field label={th.feasibility.floorAreaLabel} value={floorArea} onChange={setFloorArea} />
        <Field
          label={th.feasibility.constructionCostLabel}
          value={cost}
          onChange={setCost}
          fromEvidence={Boolean(suggestion?.value) && cost === suggestion?.value}
        />
        <Field label={th.feasibility.rentLabel} value={rent} onChange={setRent} />
        <Field
          label={th.feasibility.occupancyLabel}
          value={occupancy}
          onChange={setOccupancy}
          suffix="%"
        />
        <Field
          label={th.feasibility.operatingCostLabel}
          value={operating}
          onChange={setOperating}
          suffix="%"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-card bg-surface-sunken p-4">
          <h3 className="font-semibold text-sm">{th.feasibility.constructionSuggestHeading}</h3>
          <p className="mt-1 text-ink-muted text-xs leading-relaxed">
            {th.feasibility.constructionSuggestNote}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex-1" style={{ minWidth: "16rem" }}>
              <FilterableSelect
                label={th.feasibility.constructionSuggestPick}
                value={suggestionId}
                onChange={setSuggestionId}
                placeholder={th.feasibility.constructionSuggestPick}
                labelClassName="block text-ink-muted text-xs"
                selectClassName="mt-1 w-full rounded-card border border-border-strong bg-surface px-3 py-2 text-sm"
                options={suggestions.map((item) => ({
                  value: item.observation_id,
                  label: `${item.population_th} · ${Number(item.value).toLocaleString("th-TH")} ${item.unit_name_th}`,
                }))}
              />
            </div>
            <button
              type="button"
              disabled={!suggestion?.value}
              onClick={() => suggestion?.value && setCost(suggestion.value)}
              className="rounded-pill border border-border-strong px-4 py-2 font-medium text-xs disabled:opacity-40"
            >
              {th.feasibility.constructionSuggestUse}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={run}
        className="mt-5 rounded-pill px-6 py-2.5 font-semibold text-sm"
        style={{
          backgroundColor: "var(--color-signature)",
          color: "var(--color-signature-on)",
        }}
      >
        {th.feasibility.compute}
      </button>

      {result?.outcome === "NOT_COMPUTED" && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-fail)" }}>
          {REASONS[result.reason] ?? result.reason}
        </p>
      )}

      {computed && (
        <>
          <h3 className="mt-6 font-semibold">{th.feasibility.resultHeading}</h3>

          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              [th.feasibility.capitalTotal, `${baht(computed.capital_total)} บาท`],
              [th.feasibility.grossRevenue, `${baht(computed.gross_annual_revenue)} บาท/ปี`],
              [th.feasibility.operatingCost, `${baht(computed.operating_cost)} บาท/ปี`],
              [th.feasibility.netIncome, `${baht(computed.net_annual_income)} บาท/ปี`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-surface-sunken p-3">
                <dt className="text-ink-muted text-xs">{label}</dt>
                <dd className="mt-0.5 font-semibold text-sm tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {computed.payback_years === null ? (
            <Caveat>{th.feasibility.noPayback}</Caveat>
          ) : (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                [th.feasibility.payback, `${computed.payback_years} ${th.feasibility.paybackUnit}`],
                [
                  th.feasibility.simpleYield,
                  `${computed.simple_yield_percent} ${th.feasibility.simpleYieldUnit}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-card p-3"
                  style={{ backgroundColor: "var(--color-signature-wash)" }}
                >
                  <dt className="text-ink-muted text-xs">{label}</dt>
                  <dd
                    className="mt-0.5 font-bold text-lg tabular-nums"
                    style={{ color: "var(--color-signature-text)" }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <Notice>{th.feasibility.notMarketAdvice}</Notice>

          <details className="mt-4">
            <summary className="cursor-pointer font-medium text-signature-text text-sm">
              {th.feasibility.stepsHeading}
            </summary>
            <ul className="mt-2">
              {computed.steps.map((step) => (
                <li
                  key={step.label_th}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 border-border border-b py-2 text-sm last:border-b-0"
                >
                  <span>
                    {step.label_th}
                    <span className="block text-ink-muted text-xs">{step.expression_th}</span>
                  </span>
                  <span className="tabular-nums">
                    {step.value} <span className="text-ink-muted text-xs">{step.unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <h3 className="mt-6 font-semibold text-sm">{th.feasibility.sensitivityHeading}</h3>
          <p className="mt-1 text-ink-muted text-xs leading-relaxed">
            {th.feasibility.sensitivityNote}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-ink-muted text-xs">
                  <th className="py-2 text-left font-medium">{th.feasibility.sensitivityColumn}</th>
                  <th className="py-2 text-right font-medium">
                    {th.feasibility.sensitivityChange}
                  </th>
                  <th className="py-2 text-right font-medium">{th.feasibility.payback}</th>
                  <th className="py-2 text-right font-medium">{th.feasibility.simpleYield}</th>
                </tr>
              </thead>
              <tbody>
                {computed.sensitivity.map((row) => (
                  <tr
                    key={`${row.input_id}-${row.variation_percent}`}
                    className="border-border border-b last:border-b-0"
                  >
                    <td className="py-2">{row.label_th}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.variation_percent > 0 ? "+" : ""}
                      {row.variation_percent}%
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.payback_years ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.simple_yield_percent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 font-medium text-ink-muted text-xs">
            {th.feasibility.neverProducesHeading}
          </p>
          <ul className="mt-1 list-disc pl-5 text-ink-muted text-xs leading-relaxed">
            {METHOD.never_produces_th.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <p className="mt-3 font-medium text-ink-muted text-xs">
            {th.feasibility.limitationsHeading}
          </p>
          <ul className="mt-1 list-disc pl-5 text-ink-muted text-xs leading-relaxed">
            {computed.limitations_th.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}

      {!computed && result === null && (
        <p className="mt-4 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {th.feasibility.notMarketAdvice}
        </p>
      )}
    </section>
  );
}
