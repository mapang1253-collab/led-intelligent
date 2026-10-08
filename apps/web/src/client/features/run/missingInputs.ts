/**
 * Groups what a legal screen is still waiting for by where the reader would have to get it.
 *
 * The rule pack asks a building's question — setbacks, open space, storey heights — and the
 * product is handed a plot of land with no building on it, so most rules return UNKNOWN and name
 * the measurements they lacked. Listed rule by rule that came to twenty-nine entries of surveying
 * vocabulary, and a reader could not tell from it whether the answer was a week away or a year.
 *
 * Grouped by `obtained_from_th` it collapses to four lines, because that is how many distinct
 * sources the pack actually names: a site layout drawing, an architectural drawing, a measurement
 * taken on site, and a map. That is the honest headline — not "the system does not know" but
 * "this many rules are waiting on a drawing nobody has made yet" — and it is the shape
 * docs/output-policy.md asks for, a verification action the reader can act on.
 *
 * Nothing is dropped: each rule still lists its own inputs where the rules are listed.
 */

export interface MissingInputGroup {
  /** Where the reader would obtain these, exactly as the pack words it. */
  readonly source_th: string;
  /** How many rules are held up for want of something from this source. */
  readonly rule_count: number;
  /** The distinct measurements wanted, in the order the rules ask for them. */
  readonly labels_th: readonly string[];
}

interface Outcome {
  readonly rule_id: string;
  readonly missing_inputs: readonly {
    readonly label_th: string;
    readonly obtained_from_th: string;
  }[];
}

export function groupMissingInputs(outcomes: readonly Outcome[]): MissingInputGroup[] {
  const bySource = new Map<string, { rules: Set<string>; labels: string[] }>();
  for (const outcome of outcomes) {
    for (const input of outcome.missing_inputs) {
      const source = input.obtained_from_th.trim();
      if (source === "") {
        continue;
      }
      const group = bySource.get(source) ?? { rules: new Set<string>(), labels: [] };
      group.rules.add(outcome.rule_id);
      if (!group.labels.includes(input.label_th)) {
        group.labels.push(input.label_th);
      }
      bySource.set(source, group);
    }
  }

  // Most-blocking first: the source that unblocks the most rules is the one worth chasing.
  return [...bySource.entries()]
    .map(([source_th, group]) => ({
      source_th,
      rule_count: group.rules.size,
      labels_th: group.labels,
    }))
    .sort((a, b) => b.rule_count - a.rule_count || a.source_th.localeCompare(b.source_th, "th"));
}
