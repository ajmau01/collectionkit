/**
 * Utility comparators for ViewModeDefinition.keyOrder.
 * These are helpers — not defaults. Every ViewModeDefinition must explicitly
 * declare its keyOrder. Import and use these as needed.
 */

/** Standard A-Z alphabetical */
export const alphabetical = (a: string, b: string): number =>
  a.localeCompare(b);

/** Reverse Z-A alphabetical */
export const reverseAlphabetical = (a: string, b: string): number =>
  b.localeCompare(a);

/**
 * Fixed explicit order. Keys not in the list sort alphabetically at the end.
 *
 * Usage:
 *   keyOrder: fixedOrder(['Heavy Rotation', 'Regular Play', 'Occasional Play', 'Never Played'])
 *   keyOrder: fixedOrder(['Drink Now', 'Ready Soon', 'Hold'])
 */
export const fixedOrder =
  (order: string[]) =>
  (a: string, b: string): number => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  };

/**
 * Numeric strings descending — highest number first.
 * Usage: decade view ("2020s" before "1980s"), year sort
 *   keyOrder: numericDescending
 */
export const numericDescending = (a: string, b: string): number =>
  parseInt(b, 10) - parseInt(a, 10);

/**
 * Numeric strings ascending — lowest number first.
 */
export const numericAscending = (a: string, b: string): number =>
  parseInt(a, 10) - parseInt(b, 10);

/**
 * Alphabetical with specified strings always sorted last.
 * Usage: artist view where '#' and 'Unknown' sort after Z
 *   keyOrder: alphabeticalWithLast(['#', 'Unknown'])
 */
export const alphabeticalWithLast =
  (last: string[]) =>
  (a: string, b: string): number => {
    const aLast = last.includes(a);
    const bLast = last.includes(b);
    if (aLast && bLast) return a.localeCompare(b);
    if (aLast) return 1;
    if (bLast) return -1;
    return a.localeCompare(b);
  };
