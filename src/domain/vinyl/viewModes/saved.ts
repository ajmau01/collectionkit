import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { alphabetical } from '../../../core/utils/comparators';

export const savedViewMode: ViewModeDefinition<VinylItem> = {
  key: 'saved',
  label: 'Saved',
  filter: (item) => item.isSaved === true,
  grouper: (_item) => 'Saved Albums',
  sorter: (a, b) => {
    const creatorCmp = (a.creator ?? '').localeCompare(b.creator ?? '');
    if (creatorCmp !== 0) return creatorCmp;
    return (a.title ?? '').localeCompare(b.title ?? '');
  },
  keyOrder: alphabetical,
};
