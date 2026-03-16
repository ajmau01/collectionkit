import { CollectionItem } from './CollectionItem';

/**
 * Defines one grouping/sorting perspective on the collection.
 * Every domain view mode implements this interface.
 *
 * Design decisions:
 * - grouper returns string | string[] to support multi-group membership
 *   (e.g. an item appearing in both "Notable" and "New: This Week")
 * - keyOrder is REQUIRED — no default. Alphabetical default would silently
 *   produce wrong output for ordered domains (spin buckets, drinking windows).
 *   Use utility comparators from core/utils/comparators.ts
 */
export interface ViewModeDefinition<T extends CollectionItem> {
  /** Unique identifier e.g. 'artist', 'decade', 'spin' */
  key: string;

  /** UI chip label e.g. 'Artist', 'Decade', 'Spin' */
  label: string;

  /**
   * Returns one OR multiple group keys for this item.
   * Return string[] when item should appear in multiple sections.
   */
  grouper: (item: T) => string | string[];

  /** Sort items within each group */
  sorter: (a: T, b: T) => number;

  /**
   * Sort the section title keys themselves.
   * REQUIRED — no default provided by core/.
   * Import helpers from core/utils/comparators.ts
   */
  keyOrder: (a: string, b: string) => number;

  /**
   * Optional pre-filter applied before grouping.
   * e.g. saved mode: item => item.isSaved === true
   */
  filter?: (item: T) => boolean;
}
