/**
 * Splits a group's disclosures into the clauses every figure shares and the clauses each one owns.
 *
 * The policy behind a disclosure says the full statement must travel with the individual figure
 * rather than only with the group (docs/output-policy.md). It still does, and nothing here changes
 * what the worker sends or what a run records.
 *
 * What it changes is the repetition on screen. For a Treasury land table, four of the five clauses
 * are identical in every row — the source's own note, its declared limits, its attribution, and
 * the sentence saying the figures describe a containing area — so a group of twenty figures
 * printed the same two hundred words twenty times, and the reader stopped reading them on the
 * second. Printing the shared clauses once, in the same card, leaves every clause on screen for
 * every figure while giving the row-specific part somewhere to be noticed.
 *
 * A clause is shared only when every figure carries it and there is more than one figure, so a
 * group of one is untouched and a clause that genuinely applies to some rows stays on those rows.
 */

export interface SplitDisclosure {
  /** Clauses carried by every figure, in the order the first figure gave them. */
  readonly shared: readonly string[];
  /** Each figure's remaining clauses, keyed by observation id. */
  readonly own: ReadonlyMap<string, readonly string[]>;
}

export function splitDisclosures(
  items: readonly {
    readonly observation_id: string;
    readonly disclosure_parts_th: readonly string[];
  }[],
): SplitDisclosure {
  const parts = items.map((item) => ({
    id: item.observation_id,
    clauses: item.disclosure_parts_th.map((clause) => clause.trim()).filter((c) => c !== ""),
  }));

  const own = new Map<string, readonly string[]>();
  if (parts.length < 2) {
    for (const part of parts) {
      own.set(part.id, part.clauses);
    }
    return { shared: [], own };
  }

  const first = parts[0]?.clauses ?? [];
  const shared = first.filter((clause) => parts.every((part) => part.clauses.includes(clause)));
  const sharedSet = new Set(shared);
  for (const part of parts) {
    own.set(
      part.id,
      part.clauses.filter((clause) => !sharedSet.has(clause)),
    );
  }
  return { shared, own };
}

/**
 * Drops shared clauses the card already prints elsewhere.
 *
 * The group heading carries its geography note and the card's foot carries the attribution, so a
 * shared clause that repeats either of those would be the same sentence twice in one card — which
 * is the problem this is here to remove, not to relocate.
 */
export function withoutAlreadyShown(
  shared: readonly string[],
  alreadyShown: readonly (string | null | undefined)[],
): readonly string[] {
  const shown = alreadyShown.filter((text): text is string => Boolean(text)).map((t) => t.trim());
  return shared.filter(
    (clause) => !shown.some((text) => text.includes(clause) || clause.includes(text)),
  );
}

/**
 * Drops a figure's opening clause when the row around it already says the same thing.
 *
 * That clause names the measure, the cohort, the area's level and name, and the year — and the card
 * prints all five: the measure in the group heading, the area beneath it, the cohort as the row's
 * own label, the year beside the figure. Expanding a row to be told again what is already on the
 * line above it is the repetition the owners objected to, and it was the only thing most rows had
 * left to show. Nothing is lost by leaving it out, because nothing in it was only there.
 *
 * Scoped to the opening clause, which is the only one built from those fields, and only when both
 * the measure and the cohort appear in it — a later clause that happens to mention a price is not
 * this clause and keeps its place.
 */
export function withoutRowIdentity(
  clauses: readonly string[],
  shownOnTheRow: { readonly measureNameTh: string; readonly cohortTh: string },
): readonly string[] {
  const first = clauses[0];
  if (
    first === undefined ||
    !first.includes(shownOnTheRow.measureNameTh) ||
    !first.includes(shownOnTheRow.cohortTh)
  ) {
    return clauses;
  }
  return clauses.slice(1);
}
