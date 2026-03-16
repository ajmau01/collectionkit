import { VinylItem } from '../types';
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { fixedOrder } from '../../../core/utils/comparators';

const SPIN_KEY_ORDER = fixedOrder([
  'Heavy Rotation',
  'Regular Play',
  'Occasional Play',
  'Never Played',
]);

function getSpinBucket(spinCount: number | undefined): string {
  const count = spinCount ?? 0;
  if (count >= 10) return 'Heavy Rotation';
  if (count >= 3) return 'Regular Play';
  if (count >= 1) return 'Occasional Play';
  return 'Never Played';
}

export const spinViewMode: ViewModeDefinition<VinylItem> = {
  key: 'spin',
  label: 'Spin',
  grouper: (item) => getSpinBucket(item.spinCount),
  sorter: (a, b) => {
    const countDiff = (b.spinCount ?? 0) - (a.spinCount ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.creator.localeCompare(b.creator);
  },
  keyOrder: SPIN_KEY_ORDER,
};
