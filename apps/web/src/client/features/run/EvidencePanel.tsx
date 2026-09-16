import { th } from "@reis/i18n";
import { ChevronDown, ChevronRight, Database, Info, MapPin, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { EvidenceGroup } from "./useAnalysisRun.js";

/**
 * Evidence display (docs/output-policy.md, docs/data-architecture.md §5).
 *
 * Two rules drive the layout. Every figure is shown with the cohort it describes, because this
 * source publishes no all-households average and inventing one is forbidden
 * (docs/adr/0002-no-fabricated-provincial-averages.md). And the scope caveat sits above the numbers
 * rather than under them, so nobody reads the figures as local before reading what they are.
 */

const TEMPORAL_LABELS = th.evidence.temporal as Record<string, string>;
const FITNESS_LABELS = th.evidence.fitness as Record<string, string>;

/**
 * The one requirement whose cohort names a building rather than a category, and therefore the one
 * where offering a map link makes sense.
 */
const CONDOMINIUM_REQUIREMENT = "economic.condominium_price_reference";

/**
 * A maps search for a named building in a named area.
 *
 * A search, not a pin: the source publishes no coordinates, so claiming to know where the building
 * stands would assert more than the evidence does. Only the building name and the administrative
 * area go into the URL — never anything the reader typed about their own property, which would send
 * their deed number or address to a third party.
 */
function mapsSearchUrl(cohortTh: string, areaLabelTh: string): string {
  const buildingName = (cohortTh.split("·")[0] ?? cohortTh).trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${buildingName} ${areaLabelTh}`)}`;
}

/** Thai digit grouping, with the decimals the source actually published. */
function formatValue(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  const decimals = value.includes(".") ? (value.split(".")[1]?.replace(/0+$/, "").length ?? 0) : 0;
  return parsed.toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * A published reference table can be long — the Treasury lists 69 building types per province.
 * Showing the first few keeps the rest of the page reachable, while the whole table stays one click
 * away: the figures are the source's, and trimming them permanently would be editing the evidence.
 */
const ITEMS_BEFORE_COLLAPSE = 8;

function EvidenceRow({
  item,
  mapsHref,
}: {
  item: EvidenceGroup["items"][number];
  mapsHref?: string;
}) {
  const [open, setOpen] = useState(false);
  // A spread keeps both bounds. Showing its middle, or either end alone, would state a price the
  // source never published.
  const isRange = item.value === null && item.value_low !== null && item.value_high !== null;
  const shown =
    item.value !== null
      ? formatValue(item.value)
      : isRange && item.value_low !== item.value_high
        ? `${formatValue(item.value_low as string)}–${formatValue(item.value_high as string)}`
        : formatValue((item.value_low ?? "") as string);

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm">{item.population_th}</span>
        <span className="font-bold tabular-nums">
          {shown} <span className="font-medium text-ink-muted text-sm">{item.unit_name_th}</span>
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted text-xs">
        <span>{item.period_th}</span>
        <span>{TEMPORAL_LABELS[item.temporal_match] ?? item.temporal_match}</span>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-signature-text"
          >
            <MapPin size={13} aria-hidden="true" />
            {th.evidence.openInMaps}
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-signature-text"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {open ? th.evidence.hideDetail : th.evidence.showDetail}
        </button>
      </div>

      {/* The full disclosure travels with the individual figure, never only with the group. */}
      {open && (
        <p className="mt-2 rounded-card bg-surface-sunken p-3 text-ink-muted text-xs leading-relaxed">
          {item.disclosure_th}
          {isRange && item.value_low !== item.value_high && ` · ${th.evidence.rangeNote}`}
        </p>
      )}
    </li>
  );
}

function EvidenceItems({ group }: { group: EvidenceGroup }) {
  const [expanded, setExpanded] = useState(false);
  const items = group.items;
  const collapsible = items.length > ITEMS_BEFORE_COLLAPSE;
  const shown = collapsible && !expanded ? items.slice(0, ITEMS_BEFORE_COLLAPSE) : items;
  const mappable = group.requirement_id === CONDOMINIUM_REQUIREMENT;

  return (
    <>
      <ul className="mt-2">
        {shown.map((item) => (
          <EvidenceRow
            key={item.observation_id}
            item={item}
            {...(mappable
              ? { mapsHref: mapsSearchUrl(item.population_th, group.area_label_th) }
              : {})}
          />
        ))}
      </ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 font-medium text-signature-text text-sm"
        >
          {expanded
            ? th.evidence.showFewerItems
            : `${th.evidence.showAllItems} (${items.length} ${th.evidence.moreItems})`}
        </button>
      )}
    </>
  );
}

export function EvidencePanel({
  groups,
  stageState,
}: {
  groups: readonly EvidenceGroup[] | undefined;
  stageState: string | undefined;
}) {
  if (groups && groups.length > 0) {
    return (
      <section className="glass mt-5 rounded-card p-6">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <Database size={19} aria-hidden="true" />
          {th.evidence.heading}
        </h2>
        <p className="mt-1 text-ink-muted text-sm">{th.evidence.intro}</p>

        {groups.map((group) => (
          <div key={group.group_id} className="mt-5">
            <h3 className="font-semibold">
              {group.measure_name_th}
              {/* The area is part of the heading: two groups can share a measure and describe
                  different places. */}
              <span className="font-medium text-ink-muted text-sm">
                {" · "}
                {group.area_label_th}
              </span>
            </h3>

            {/* Scope first: what this evidence is about, before any number is read. */}
            <p
              className="mt-2 flex items-start gap-2 rounded-card p-3 text-sm leading-relaxed"
              style={{
                backgroundColor: "var(--color-partial-soft)",
                color: "var(--color-partial)",
              }}
            >
              <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {group.geography_note_th}
                {" · "}
                {FITNESS_LABELS[group.purpose_fitness] ?? group.purpose_fitness}
              </span>
            </p>

            <EvidenceItems group={group} />

            <p className="mt-3 text-ink-muted text-xs">
              {th.evidence.sourceLabel}: {group.source_title_th} · {group.attribution_th}
            </p>
          </div>
        ))}
      </section>
    );
  }

  // No evidence: say which of the two reasons applies. They are not the same situation.
  const degraded = stageState === "DEGRADED";
  return (
    <section className="glass mt-5 rounded-card p-6">
      <h2 className="flex items-center gap-2 font-bold text-lg">
        <Database size={19} aria-hidden="true" />
        {th.evidence.heading}
      </h2>
      <p className="mt-3 font-semibold">
        {degraded ? th.evidence.noneHeading : th.evidence.notActivatedHeading}
      </p>
      <p className="mt-1 flex items-start gap-2 text-ink-muted text-sm leading-relaxed">
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        {degraded ? th.evidence.noneBody : th.evidence.notActivatedBody}
      </p>
    </section>
  );
}
