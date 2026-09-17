import { th } from "@reis/i18n";
import { Building2, Coins, Info, Lightbulb, Users } from "lucide-react";
import type { EvidenceGroup } from "./useAnalysisRun.js";

/**
 * The headline numbers, so the overview answers "what did you find here" in one screen.
 *
 * Two rules shape what may appear. It is a low–high span of figures the sources actually published,
 * never a mean: docs/adr/0002 forbids this product inventing an average it was not given, and a
 * range of real numbers is a summary while an average of them is a new claim. And it reads only
 * evidence about the target area itself — FIT and FIT_WITH_CAVEAT — because district and provincial
 * figures are context, and folding them into a headline for a subdistrict is exactly the promotion
 * of area evidence to property evidence the architecture forbids.
 *
 * Anything with no qualifying figures is left out rather than shown as zero. A zero is a
 * measurement; an absence is not.
 */

const CONDO_REQUIREMENT = "economic.condominium_price_reference";
const LAND_REQUIREMENT = "economic.land_price_reference";
const POPULATION_REQUIREMENT = "demand.resident_population";

/** Evidence about this place, as opposed to evidence about the district it sits in. */
const ABOUT_THIS_AREA = new Set(["FIT", "FIT_WITH_CAVEAT"]);

interface Span {
  readonly low: number;
  readonly high: number;
  readonly count: number;
  readonly unit: string;
}

/**
 * The lowest and highest figures published for one requirement here.
 *
 * A source may publish a single number or a band; both are read, because a band's ends are
 * published figures too and dropping them would narrow a span the source itself widened.
 */
function spanFor(groups: readonly EvidenceGroup[], requirementId: string): Span | null {
  const values: number[] = [];
  let unit = "";
  for (const group of groups) {
    if (group.requirement_id !== requirementId || !ABOUT_THIS_AREA.has(group.purpose_fitness)) {
      continue;
    }
    for (const item of group.items) {
      for (const raw of [item.value, item.value_low, item.value_high]) {
        const parsed = Number(raw);
        if (raw !== null && Number.isFinite(parsed)) {
          values.push(parsed);
          unit = unit || item.unit_name_th;
        }
      }
    }
  }
  if (values.length === 0) {
    return null;
  }
  return { low: Math.min(...values), high: Math.max(...values), count: values.length, unit };
}

const thNumber = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 0 });

function Tile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-card bg-surface-sunken p-4">
      <p className="flex items-center gap-1.5 text-ink-muted text-xs">
        <Icon size={13} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 font-bold text-lg leading-snug tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-ink-muted text-xs">{note}</p>}
    </div>
  );
}

export function OverviewSummary({
  evidence,
  conceptCount,
}: {
  evidence: readonly EvidenceGroup[] | undefined;
  conceptCount: number;
}) {
  const groups = evidence ?? [];
  const condo = spanFor(groups, CONDO_REQUIREMENT);
  const land = spanFor(groups, LAND_REQUIREMENT);
  const population = spanFor(groups, POPULATION_REQUIREMENT);

  const tiles: React.ReactNode[] = [];
  const fromItems = (n: number) => th.progress.summaryFromItems.replace("{n}", thNumber(n));

  if (condo) {
    tiles.push(
      <Tile
        key="condo"
        icon={Building2}
        label={th.progress.summaryCondo}
        value={`${thNumber(condo.low)}–${thNumber(condo.high)} ${condo.unit}`}
        note={fromItems(condo.count)}
      />,
    );
  }
  if (land) {
    tiles.push(
      <Tile
        key="land"
        icon={Coins}
        label={th.progress.summaryLand}
        value={`${thNumber(land.low)}–${thNumber(land.high)} ${land.unit}`}
        note={fromItems(land.count)}
      />,
    );
  }
  if (population) {
    // One figure, not a span: a subdistrict has one registered population, and printing "x–x"
    // would invent a range where the source gave a number.
    tiles.push(
      <Tile
        key="population"
        icon={Users}
        label={th.progress.summaryPopulation}
        value={`${thNumber(population.high)} ${population.unit}`}
      />,
    );
  }
  if (conceptCount > 0) {
    tiles.push(
      <Tile
        key="concepts"
        icon={Lightbulb}
        label={th.progress.summaryConcepts}
        value={`${thNumber(conceptCount)} ${th.progress.summaryConceptsUnit}`}
      />,
    );
  }

  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="font-semibold text-ink-muted text-sm">{th.progress.summaryHeading}</h2>
      {tiles.length === 0 ? (
        <p className="mt-2 text-ink-muted text-sm">{th.progress.summaryEmpty}</p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{tiles}</div>
          {/* What the span is and is not. A reader who takes this for a market average has been
              misled by the screen, not by the source. */}
          <p className="mt-3 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.progress.summaryNote}
          </p>
        </>
      )}
    </section>
  );
}
