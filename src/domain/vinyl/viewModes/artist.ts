import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { alphabeticalWithLast } from '../../../core/utils/comparators';

const LEADING_ARTICLES = /^(the|a|an)\s+/i;

/**
 * Strip leading articles ("The ", "A ", "An ") and return the remainder.
 * Used to derive a sort key that ignores common English articles.
 */
function getArtistSortKey(creator: string): string {
  return creator.replace(LEADING_ARTICLES, '');
}

export const artistViewMode: ViewModeDefinition<VinylItem> = {
  key: 'artist',
  label: 'Artist',

  grouper: (item) => {
    const sortKey = getArtistSortKey(item.creator ?? '');
    const firstChar = sortKey.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(firstChar) ? firstChar : '#';
  },

  sorter: (a, b) => {
    const keyA = getArtistSortKey(a.creator ?? '').toLowerCase();
    const keyB = getArtistSortKey(b.creator ?? '').toLowerCase();
    return keyA.localeCompare(keyB);
  },

  keyOrder: alphabeticalWithLast(['#', 'Unknown']),
};
