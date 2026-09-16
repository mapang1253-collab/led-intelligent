/**
 * Renders a published figure for reading.
 *
 * A source that priced every floor of a building published a spread, not a number. Rendering that
 * spread as one value — its middle, its lowest, its highest — would state something the publisher
 * did not, so the two forms are rendered differently and the range keeps both of its bounds.
 */

export interface PublishedFigure {
  readonly value: string | null;
  readonly value_low?: string | null;
  readonly value_high?: string | null;
}

/** Thai reading uses the same en dash for a numeric range as the source's own tables. */
const RANGE_SEPARATOR = "–";

export function figureTh(figure: PublishedFigure): string | null {
  if (figure.value !== null && figure.value !== undefined) {
    return figure.value;
  }
  const { value_low: low, value_high: high } = figure;
  if (low === null || low === undefined || high === null || high === undefined) {
    return null;
  }
  return low === high ? low : `${low}${RANGE_SEPARATOR}${high}`;
}

/** True when the figure is a spread, so a caller can say so rather than imply a single price. */
export function isRange(figure: PublishedFigure): boolean {
  return (
    figure.value === null &&
    figure.value_low !== null &&
    figure.value_low !== undefined &&
    figure.value_low !== figure.value_high
  );
}
