import { useMemo } from 'react';
import { CollectionItem, CollectionConfig, CollectionSection } from '../types';

/**
 * useGroupedCollection
 *
 * The heart of CollectionKit. Transforms a flat list of items into a
 * filtered, sorted, and grouped SectionList-ready structure.
 *
 * Generic over T extends CollectionItem — no domain-specific field
 * references live here. All filtering, grouping, sorting, and key ordering
 * are delegated to the CollectionConfig and ViewModeDefinition contracts.
 */
export function useGroupedCollection<T extends CollectionItem>({
  items,
  config,
  groupByKey,
  sortBy,
  searchQuery,
}: {
  items: T[];
  config: CollectionConfig<T>;
  groupByKey: string;
  sortBy: 'title' | 'creator' | 'addedAt';
  searchQuery: string;
}): {
  sections: CollectionSection<T>[];
  filteredItems: T[];
  isEmpty: boolean;
} {
  return useMemo(() => {
    // 1. Search filter — fully delegated to config.searchFilter.
    //    core/ never inspects domain fields directly.
    const trimmedQuery = searchQuery.trim();
    const filtered: T[] = trimmedQuery
      ? items.filter((item) => config.searchFilter(item, trimmedQuery))
      : items;

    // 2. Pre-group sort on the flat filtered list.
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'creator':
          return a.creator.toLowerCase().localeCompare(b.creator.toLowerCase());
        case 'title':
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        case 'addedAt':
          // Newest first
          return b.addedAt - a.addedAt;
        default:
          return 0;
      }
    });

    // 3. Resolve the ViewModeDefinition for groupByKey.
    const viewMode = config.viewModes.find((vm) => vm.key === groupByKey);

    // 4a. No matching view mode — return a single section with all items.
    if (!viewMode) {
      const sections: CollectionSection<T>[] =
        sorted.length > 0 ? [{ title: 'All Items', data: sorted }] : [];
      return { sections, filteredItems: sorted, isEmpty: sections.length === 0 };
    }

    // 4b. Apply the view mode's optional pre-filter.
    const modeFiltered = viewMode.filter ? sorted.filter(viewMode.filter) : sorted;

    // 5. Group items.
    //    grouper returns string | string[] — an item may appear in multiple sections.
    const groups = new Map<string, T[]>();

    for (const item of modeFiltered) {
      const rawKey = viewMode.grouper(item);
      const keys: string[] = Array.isArray(rawKey) ? rawKey : [rawKey];

      for (const key of keys) {
        const existing = groups.get(key);
        if (existing) {
          existing.push(item);
        } else {
          groups.set(key, [item]);
        }
      }
    }

    // 6. Sort section keys using viewMode.keyOrder.
    const sortedKeys = Array.from(groups.keys()).sort(viewMode.keyOrder);

    // 7. Sort items within each section using viewMode.sorter.
    const sections: CollectionSection<T>[] = sortedKeys.map((key) => ({
      title: key,
      data: (groups.get(key) ?? []).slice().sort(viewMode.sorter),
    }));

    return {
      sections,
      filteredItems: sorted,
      isEmpty: sections.length === 0,
    };
  }, [items, config, groupByKey, sortBy, searchQuery]);
}
