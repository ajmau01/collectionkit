import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { alphabeticalWithLast } from '../../../core/utils/comparators';

export const genreViewMode: ViewModeDefinition<VinylItem> = {
  key: 'genre',
  label: 'Genre',
  grouper: (item) => {
    if (item.tags && item.tags.length > 0) {
      return item.tags[0];
    }
    return 'Unknown';
  },
  sorter: (a, b) => a.title.localeCompare(b.title),
  keyOrder: alphabeticalWithLast(['Unknown']),
};
