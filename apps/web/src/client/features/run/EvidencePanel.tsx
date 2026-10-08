import { th } from "@reis/i18n";
import { ChevronDown, ChevronRight, Database, Info, MapPin } from "lucide-react";
import { useState } from "react";
import { Caveat } from "./Caveat.js";
import { GroupHeading, PanelHeading } from "./PanelHeading.js";
import { splitDisclosures, withoutAlreadyShown, withoutRowIdentity } from "./sharedDisclosure.js";
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
  clauses,
  limitsShownBelow,
  mapsHref,
}: {
  item: EvidenceGroup["items"][number];
  /**
   * This figure's own clauses, already stripped of the ones every figure in the group repeats.
   * Those are printed once, uncollapsed, beneath the rows.
   */
  clauses: readonly string[];
  limitsShownBelow: boolean;
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
  const detail = [
    ...clauses,
    // A spread's meaning belongs to the figure that is a spread, not to the group.
    ...(isRange && item.value_low !== item.value_high ? [th.evidence.rangeNote] : []),
  ];

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      {/*
        A grid, not a wrapping flex row.

        The source names its cohorts in full — "ผู้ถือครองทำการเกษตร/เพาะเลี้ยง /
        ปลูกพืช/เลี้ยงสัตว์/เพาะเลี้ยง_ส่วนใหญ่เช่าที่ดิน/ทำฟรี" is one of them, and shortening it
        would be editing the evidence. Wrapped, that label pushed its own figure onto the next line
        and left-aligned it, so a column of numbers became numbers scattered down the page. Two
        columns keep the label free to wrap and the figure where the eye is already looking.
      */}
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
        <span className="text-sm leading-snug">{item.population_th}</span>
        <span className="whitespace-nowrap text-right font-bold tabular-nums">
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
        {detail.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-signature-text"
          >
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {open
              ? th.evidence.hideDetail
              : limitsShownBelow
                ? th.evidence.showRowDetail
                : th.evidence.showDetail}
          </button>
        )}
      </div>

      {/*
        Every clause still reaches the reader of this figure: what is specific to it is here, and
        what it shares with the rest of the group is printed once below the rows, in the same card,
        without anything to open. One clause per line, because this used to be five clauses joined
        by dots into a paragraph nobody finished.
      */}
      {open && (
        <ul className="mt-2 list-disc space-y-1 rounded-card bg-surface-sunken py-3 pr-3 pl-8 text-ink-muted text-xs leading-relaxed marker:text-ink-muted">
          {detail.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ul>
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

  /*
    The split is over the whole group, not over the rows currently on screen, so expanding a long
    table never moves a clause from the shared block back into the rows.

    The group heading already prints the geography note and the card's foot already prints the
    attribution, so a shared clause repeating either of those is dropped rather than moved: putting
    it here would be the same sentence twice in one card, which is the thing being fixed.
  */
  const { shared, own } = splitDisclosures(items);
  const sharedNotes = withoutAlreadyShown(shared, [
    group.geography_note_th,
    group.attribution_th,
    group.source_title_th,
  ]);

  return (
    <>
      <ul className="mt-2">
        {shown.map((item) => (
          <EvidenceRow
            key={item.observation_id}
            item={item}
            clauses={withoutRowIdentity(own.get(item.observation_id) ?? [], {
              measureNameTh: group.measure_name_th,
              cohortTh: item.population_th,
            })}
            limitsShownBelow={sharedNotes.length > 0}
            {...(mappable
              ? { mapsHref: mapsSearchUrl(item.population_th, group.area_label_th) }
              : {})}
          />
        ))}
      </ul>

      {sharedNotes.length > 0 && (
        <div className="mt-3 rounded-card border border-border border-l-2 border-l-signature bg-surface-sunken p-3">
          <p className="font-semibold text-ink text-xs">{th.evidence.sharedNotesHeading}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-muted text-xs leading-relaxed marker:text-ink-muted">
            {sharedNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
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
        <PanelHeading icon={Database}>{th.evidence.heading}</PanelHeading>
        <p className="mt-3 text-ink-muted text-sm leading-relaxed">{th.evidence.intro}</p>

        {/*
          One card per group.

          This was a flat run of sections: a `font-semibold` heading two pixels off the panel's own
          `text-lg bold`, the area tacked on after a dot, a caveat, then rows — all on one
          background, repeated. The owners called it ลายตา and they were right; nothing told the eye
          where one measure ended and the next began. A card does that before a word is read, which
          then lets the heading be plainly the biggest thing inside it.
        */}
        {groups.map((group) => (
          <article
            key={group.group_id}
            className="mt-5 rounded-card bg-surface-sunken p-5 first:mt-4"
          >
            <GroupHeading icon={MapPin} subtitle={group.area_label_th}>
              {group.measure_name_th}
            </GroupHeading>

            {/* Scope first: what this evidence is about, before any number is read. Quiet, because
                there is one of these under every group and a screen of amber panels is a screen
                nobody reads. */}
            <Caveat>
              {group.geography_note_th}
              {" · "}
              {FITNESS_LABELS[group.purpose_fitness] ?? group.purpose_fitness}
            </Caveat>

            <EvidenceItems group={group} />

            <p className="mt-3 border-border border-t pt-3 text-ink-muted text-xs leading-relaxed">
              {th.evidence.sourceLabel}: {group.source_title_th} · {group.attribution_th}
            </p>
          </article>
        ))}
      </section>
    );
  }

  // No evidence: say which of the two reasons applies. They are not the same situation.
  const degraded = stageState === "DEGRADED";
  return (
    <section className="glass mt-5 rounded-card p-6">
      <PanelHeading icon={Database}>{th.evidence.heading}</PanelHeading>
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
