import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_S = 24 * 60 * 60;
const DAYS_180_S = 180 * DAY_S;

/**
 * Fixed section order. Year-based keys (e.g. 'New: 2025') are not in this list
 * and are handled by the keyOrder comparator's fallback branch.
 */
const FIXED_ORDER = [
  'Notable',
  'New: Today',
  'New: This Week',
  'New: This Month',
  'New: Earlier This Year',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a 'New: <bucket>' label for the given addedAt Unix timestamp (seconds).
 * Returns null if the item is older than 180 days.
 *
 * Time buckets mirror Social Vinyl's useGroupedReleases 'new' branch exactly:
 *   < 1 day   → 'New: Today'
 *   < 7 days  → 'New: This Week'
 *   < 30 days → 'New: This Month'
 *   < 180 days, same calendar year → 'New: Earlier This Year'
 *   < 180 days, prior calendar year → 'New: <YYYY>'  (e.g. 'New: 2025')
 */
function getNewBucket(addedAt: number, nowS: number): string | null {
  const diffS = nowS - addedAt;

  if (diffS < 0) {
    // Future-dated — treat as Today
    return 'New: Today';
  }
  if (diffS > DAYS_180_S) {
    return null;
  }

  if (diffS < DAY_S) return 'New: Today';
  if (diffS < 7 * DAY_S) return 'New: This Week';
  if (diffS < 30 * DAY_S) return 'New: This Month';

  // Within 180 days — check calendar year
  const addedYear = new Date(addedAt * 1000).getFullYear();
  const currentYear = new Date(nowS * 1000).getFullYear();

  if (addedYear === currentYear) return 'New: Earlier This Year';
  return `New: ${addedYear}`;
}

// ─── keyOrder ─────────────────────────────────────────────────────────────────

/**
 * Section title comparator for the 'new' view mode.
 *
 * Ordering rules:
 *   1. Both keys are in FIXED_ORDER → sort by position in that list.
 *   2. One key is in FIXED_ORDER → it wins (sorts first).
 *   3. Neither is in FIXED_ORDER → both are year-based ('New: YYYY').
 *      Parse the year and sort descending (newest year first).
 *   4. Year parse fails → fall back to reverse-alphabetical (safe default).
 */
function newKeyOrder(a: string, b: string): number {
  const ia = FIXED_ORDER.indexOf(a);
  const ib = FIXED_ORDER.indexOf(b);

  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;

  // Both are year-based — 'New: YYYY' → parse year, sort descending
  const yearA = parseInt(a.replace('New: ', ''), 10);
  const yearB = parseInt(b.replace('New: ', ''), 10);

  if (!isNaN(yearA) && !isNaN(yearB)) return yearB - yearA;

  // Fallback: should never be reached, but keep sections stable
  return b.localeCompare(a);
}

// ─── View Mode Definition ─────────────────────────────────────────────────────

/**
 * "New & Notable" view mode.
 *
 * Multi-group: a single item can appear in MORE THAN ONE section.
 * grouper() returns string[] — the engine places the item in each named section.
 *
 * Filter: only items that are isNotable OR were added within the last 180 days
 * are shown. Items that are neither notable nor recent are excluded entirely.
 *
 * Grouping:
 *   - If item.isNotable === true → include in 'Notable'
 *   - If item.addedAt is within 180 days → include in the matching time bucket
 *     ('New: Today' | 'New: This Week' | 'New: This Month' |
 *      'New: Earlier This Year' | 'New: <YYYY>')
 *   An item may be in both 'Notable' and a time bucket simultaneously.
 *
 * Sorter: addedAt descending (most recently added first) within each section.
 *
 * keyOrder: FIXED_ORDER first (Notable → Today → Week → Month → This Year),
 *           then prior years descending (2025, 2024, …).
 */
export const newViewMode: ViewModeDefinition<VinylItem> = {
  key: 'new',
  label: 'New',

  filter: (item) => {
    const nowS = Date.now() / 1000;
    const isRecent = nowS - item.addedAt <= DAYS_180_S;
    return item.isNotable === true || isRecent;
  },

  grouper: (item) => {
    const nowS = Date.now() / 1000;
    const keys: string[] = [];

    if (item.isNotable === true) {
      keys.push('Notable');
    }

    const bucket = getNewBucket(item.addedAt, nowS);
    if (bucket !== null) {
      keys.push(bucket);
    }

    return keys;
  },

  sorter: (a, b) => b.addedAt - a.addedAt,

  keyOrder: newKeyOrder,
};
