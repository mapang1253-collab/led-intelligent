import {
  type ValuationMethodPack,
  type ValuationResult,
  valueConstruction,
  valueLand,
  verifyMethodIntegrity,
} from "@reis/analysis-engine";
import { th } from "@reis/i18n";
import { Calculator, Info, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import methodFile from "../../../../../../database/reviewed-packs/th-valuation-assessed-v1.json" with {
  type: "json",
};
import type { EvidenceGroup } from "./useAnalysisRun.js";

/**
 * Assessed-value calculator.
 *
 * The rates are not fetched: they are already on this page, as the Treasury evidence the run
 * collected for this province. Multiplying one of them by an area the reader types is arithmetic,
 * so it happens here rather than in a round trip, using the same reviewed method the server would.
 *
 * Two things this screen must never let happen. It must not present an assessed value as a market
 * price — the caveat sits with the figure, not in a footnote. And it must not compute at all from an
 * unreviewed or edited method, which is why integrity is checked before the form is usable.
 */

const METHOD = methodFile as unknown as ValuationMethodPack;

const CONSTRUCTION_REQUIREMENT = "economic.construction_cost_reference";
const LAND_REQUIREMENT = "economic.land_price_reference";

function formatBaht(value: string): string {
  const [whole, fraction] = value.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction && fraction !== "00" ? `${grouped}.${fraction}` : grouped;
}

function ValuationResultView({
  result,
  extraWarningTh,
}: {
  result: Extract<ValuationResult, { outcome: "COMPUTED" }>;
  extraWarningTh?: string;
}) {
  return (
    <div className="mt-5 rounded-card bg-surface-sunken p-5">
      <p className="font-medium text-ink-muted text-sm">{th.valuation.resultHeading}</p>
      <p className="mt-1 font-bold text-3xl tabular-nums tracking-tight">
        {formatBaht(result.value)}{" "}
        <span className="font-medium text-base text-ink-muted">{th.valuation.baht}</span>
      </p>

      {/* The arithmetic is shown so the reader can check it, not trust it. */}
      <p className="mt-4 font-medium text-ink-muted text-xs">{th.valuation.stepsHeading}</p>
      <ul className="mt-1.5">
        {result.steps.map((step) => (
          <li
            key={step.label_th}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-border border-b py-2 last:border-b-0"
          >
            <span className="text-sm">
              {step.label_th}
              <span className="block text-ink-muted text-xs">{step.expression_th}</span>
            </span>
            {/* Already grouped by the method; grouping it again would insert a second comma. */}
            <span className="font-semibold tabular-nums">
              {step.value} <span className="font-medium text-ink-muted text-xs">{step.unit}</span>
            </span>
          </li>
        ))}
      </ul>

      <p
        className="mt-4 flex items-start gap-2 rounded-card p-3 text-sm leading-relaxed"
        style={{
          backgroundColor: "var(--color-partial-soft)",
          color: "var(--color-partial)",
        }}
      >
        <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {th.valuation.notMarketValue}
          {extraWarningTh && ` · ${extraWarningTh}`}
        </span>
      </p>

      <p className="mt-3 font-medium text-ink-muted text-xs">{th.valuation.limitationsHeading}</p>
      <ul className="mt-1 list-disc pl-5 text-ink-muted text-xs leading-relaxed">
        {result.limitations_th.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-ink-muted text-xs">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {th.valuation.methodLabel}: {METHOD.method_id} v{result.method_version}
        {METHOD.review && ` · ${th.valuation.reviewedBy} ${METHOD.review.reviewers.join(", ")}`}
      </p>
    </div>
  );
}

/**
 * Land valuation. Separate from the building form because its inputs, its unit and above all its
 * scope are different: this schedule covers land held on documents other than a title deed, and a
 * reader with a โฉนด must be told that before they read a total.
 */
function LandValuation({
  groups,
  enabled,
}: {
  groups: readonly EvidenceGroup[] | undefined;
  enabled: boolean;
}) {
  const [unitId, setUnitId] = useState("");
  const [rai, setRai] = useState("");
  const [ngan, setNgan] = useState("");
  const [wa, setWa] = useState("");

  const rates = useMemo(
    () =>
      (groups ?? []).filter((g) => g.requirement_id === LAND_REQUIREMENT).flatMap((g) => g.items),
    [groups],
  );
  const selected = rates.find((item) => item.observation_id === unitId);

  const result = useMemo(() => {
    // A spread cannot be multiplied: the source did not say which block a plot is in, so there is
    // no single rate to apply. The row is still offered, and the reason is stated instead.
    if (!selected?.value || !enabled) {
      return null;
    }
    const area = {
      rai: Number(rai) || 0,
      ngan: Number(ngan) || 0,
      wa: Number(wa) || 0,
    };
    return valueLand(METHOD, {
      ratePerSquareWa: selected.value,
      area,
      positionTh: selected.population_th,
    });
  }, [selected, enabled, rai, ngan, wa]);

  if (rates.length === 0) {
    return (
      <>
        <h3 className="mt-8 font-semibold">{th.valuation.landHeading}</h3>
        <p className="mt-2 text-ink-muted text-sm">{th.valuation.noLandRates}</p>
      </>
    );
  }

  return (
    <>
      <h3 className="mt-8 font-semibold">{th.valuation.landHeading}</h3>
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.valuation.landIntro}</p>

      {/* Scope before numbers: most urban land is titled and therefore absent from this schedule. */}
      <p
        className="mt-3 flex items-start gap-2 rounded-card p-3 text-sm leading-relaxed"
        style={{ backgroundColor: "var(--color-partial-soft)", color: "var(--color-partial)" }}
      >
        <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        {th.valuation.landNotTitleDeed}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-medium text-sm">{th.valuation.landUnitLabel}</span>
          <select
            value={unitId}
            disabled={!enabled}
            onChange={(event) => setUnitId(event.target.value)}
            className="mt-1.5 w-full rounded-card border border-border-strong bg-surface-sunken px-3 py-2.5 text-sm"
          >
            <option value="">{th.valuation.landUnitPlaceholder}</option>
            {rates.map((item) => (
              <option key={item.observation_id} value={item.observation_id}>
                {item.population_th}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="font-medium text-sm">{th.valuation.landAreaLabel}</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(
              [
                [rai, setRai, th.valuation.rai],
                [ngan, setNgan, th.valuation.ngan],
                [wa, setWa, th.valuation.wa],
              ] as const
            ).map(([value, set, label]) => (
              <label key={label} className="block">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={value}
                  disabled={!enabled}
                  onChange={(event) => set(event.target.value)}
                  className="w-full rounded-card border border-border-strong bg-surface-sunken px-3 py-2.5 text-sm tabular-nums"
                />
                <span className="mt-1 block text-center text-ink-muted text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {selected && !selected.value && (
        <p className="mt-4 text-ink-muted text-sm leading-relaxed">{th.valuation.landRangeNote}</p>
      )}

      {result?.outcome === "COMPUTED" && (
        <ValuationResultView result={result} extraWarningTh={th.valuation.landNotTitleDeed} />
      )}
      {result?.outcome === "NOT_COMPUTED" && (
        <p className="mt-4 text-ink-muted text-sm">
          {(th.valuation.reason as Record<string, string>)[result.reason] ?? result.reason}
        </p>
      )}
    </>
  );
}

export function ValuationPanel({ groups }: { groups: readonly EvidenceGroup[] | undefined }) {
  const [methodOk, setMethodOk] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [typeId, setTypeId] = useState("");
  const [floorArea, setFloorArea] = useState("");

  useEffect(() => {
    let cancelled = false;
    verifyMethodIntegrity(METHOD).then((verdict) => {
      if (cancelled) return;
      setMethodOk(verdict.ok ? { ok: true } : { ok: false, reason: verdict.reason_th });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The province's own published rates, exactly as the evidence panel above shows them.
  const rates = useMemo(() => {
    const group = groups?.find((g) => g.requirement_id === CONSTRUCTION_REQUIREMENT);
    return (group?.items ?? []).filter((item) => item.value !== undefined);
  }, [groups]);

  const selected = rates.find((item) => item.observation_id === typeId);
  const area = Number(floorArea);

  const result = useMemo(() => {
    if (!selected?.value || !Number.isFinite(area) || area <= 0) {
      return null;
    }
    return valueConstruction(METHOD, {
      ratePerSqm: selected.value,
      floorAreaSqm: area,
      buildingTypeTh: selected.population_th,
    });
  }, [selected, area]);

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Calculator size={19} aria-hidden="true" />
        {th.valuation.heading}
      </h2>
      <p className="mt-1 text-ink-muted text-sm leading-relaxed">{th.valuation.intro}</p>

      {methodOk?.ok === false && (
        <p
          className="mt-4 flex items-start gap-2 rounded-card p-3 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--color-fail-soft)", color: "var(--color-fail)" }}
        >
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {methodOk.reason}
        </p>
      )}

      {rates.length === 0 ? (
        <p className="mt-4 text-ink-muted text-sm">{th.valuation.noRates}</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="block">
              <span className="font-medium text-sm">{th.valuation.buildingTypeLabel}</span>
              <select
                value={typeId}
                disabled={!methodOk?.ok}
                onChange={(event) => setTypeId(event.target.value)}
                className="mt-1.5 w-full rounded-card border border-border-strong bg-surface-sunken px-3 py-2.5 text-sm"
              >
                <option value="">{th.valuation.buildingTypePlaceholder}</option>
                {rates.map((item) => (
                  <option key={item.observation_id} value={item.observation_id}>
                    {item.population_th}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-medium text-sm">{th.valuation.floorAreaLabel}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={floorArea}
                disabled={!methodOk?.ok}
                placeholder={th.valuation.floorAreaPlaceholder}
                onChange={(event) => setFloorArea(event.target.value)}
                className="mt-1.5 w-full rounded-card border border-border-strong bg-surface-sunken px-3 py-2.5 text-sm tabular-nums"
              />
            </label>
          </div>

          {result?.outcome === "COMPUTED" && <ValuationResultView result={result} />}

          {result?.outcome === "NOT_COMPUTED" && (
            <p className="mt-4 text-ink-muted text-sm">
              {(th.valuation.reason as Record<string, string>)[result.reason] ?? result.reason}
            </p>
          )}
        </>
      )}

      <LandValuation groups={groups} enabled={methodOk?.ok === true} />
    </section>
  );
}
