import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { numericDescending } from '../../../core/utils/comparators';

/**
 * Returns the decade group key for a given year string.
 * - Valid year  → "1980s", "2020s", etc.
 * - Missing / non-numeric → "Unknown"
 */
function getDecadeKey(year: string | undefined): string {
  if (year === undefined || year === null || year === '') {
    return 'Unknown';
  }
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return 'Unknown';
  }
  const decade = Math.floor(yearNum / 10) * 10;
  return `${decade}s`;
}

/**
 * decade view mode — groups VinylItems by the decade of their release year.
 *
 * Grouping:  "1980s", "1990s", … or "Unknown" when year is absent/invalid.
 * Item sort: year ascending within each decade (earliest first); items with
 *            no valid year sort last within the Unknown group.
 * Key order: newest decade first (e.g. "2020s" before "1980s"); "Unknown" last.
 *
 * keyOrder strategy: strip the trailing "s" so `numericDescending` can parse
 * the bare decade number, then special-case "Unknown" to always sort last.
 */
export const decadeViewMode: ViewModeDefinition<VinylItem> = {
  key: 'decade',
  label: 'Decade',

  grouper: (item) => getDecadeKey(item.year),

  sorter: (a, b) => {
    // Within a decade, sort by year ascending; missing year sorts last.
    const yearA = a.year !== undefined && a.year !== null && a.year !== ''
      ? parseInt(a.year, 10)
      : undefined;
    const yearB = b.year !== undefined && b.year !== null && b.year !== ''
      ? parseInt(b.year, 10)
      : undefined;

    const numA = yearA !== undefined && !isNaN(yearA) ? yearA : Infinity;
    const numB = yearB !== undefined && !isNaN(yearB) ? yearB : Infinity;

    return numA - numB;
  },

  keyOrder: (a, b) => {
    // "Unknown" always sorts last.
    if (a === 'Unknown' && b === 'Unknown') return 0;
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;

    // Strip the trailing "s" (e.g. "1980s" → "1980") and sort numerically
    // descending so that newer decades appear first.
    const strippedA = a.endsWith('s') ? a.slice(0, -1) : a;
    const strippedB = b.endsWith('s') ? b.slice(0, -1) : b;
    return numericDescending(strippedA, strippedB);
  },
};
