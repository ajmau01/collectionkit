# Implementing a New Domain

This guide walks through building a complete domain for CollectionKit — from type
definition through sync service and view modes to wiring it into the app shell.

The reference implementation is `src/domain/vinyl/`. Read it alongside this guide.

---

## Overview

A domain provides four things:

1. **A type** — `YourItem extends CollectionItem`
2. **View modes** — groupers, sorters, key ordering, optional filter
3. **An item card** — React component for rendering one item in the list
4. **A sync service** — fetches items from the remote API and upserts to SQLite
5. **A config object** — `CollectionConfig<YourItem>` that wires everything together

---

## Step 1 — Define your item type

Create `src/domain/your-domain/types.ts`:

```typescript
import { CollectionItem } from '../../core/types/CollectionItem';

export interface YourItem extends CollectionItem {
  // Add domain-specific fields here.
  // CollectionItem already provides: id, title, creator, thumbUrl, addedAt, tags, isSaved
  releaseDate?: string;
  label?: string;
}
```

**Field mapping rules:**
- Map the API's "primary name" to `title`, "primary creator/artist/author" to `creator`.
- Use `tags: string[]` for any categorical field you want to group by (genre, category, etc.).
- Use `addedAt: number` (Unix timestamp in seconds) for date-added ordering.
- Add domain-specific fields as typed properties — never a generic metadata bag.

---

## Step 2 — Declare schema extensions

In your `config.ts` (Step 5), you will provide `schemaExtensions: ColumnDefinition[]`.
Any field beyond the base schema that needs to be persisted must appear here.

```typescript
import { ColumnDefinition } from '../../core/types/ColumnDefinition';

const schemaExtensions: ColumnDefinition[] = [
  { name: 'releaseDate', type: 'TEXT' },
  { name: 'label',       type: 'TEXT' },
  // For locally-edited fields (bookmarks, ratings), use preserveOnSync.
  { name: 'isStarred',   type: 'INTEGER', defaultValue: 0, preserveOnSync: true, isBoolean: true },
  { name: 'playCount',   type: 'INTEGER', defaultValue: 0, preserveOnSync: true },
];
```

**Key flags:**
- `preserveOnSync: true` — existing local value survives a re-sync (uses SQLite COALESCE). Use for anything the user edits locally.
- `isBoolean: true` — required for any `INTEGER` column that stores `true`/`false`. Without it, reads return `0`/`1` instead of booleans.

Base schema columns (`id`, `title`, `creator`, `thumbUrl`, `addedAt`, `tags`, `isSaved`) must **not** be redeclared.

---

## Step 3 — Write view modes

Each view mode is a `ViewModeDefinition<YourItem>` — create one file per mode in
`src/domain/your-domain/viewModes/`.

```typescript
// src/domain/your-domain/viewModes/byLabel.ts
import { ViewModeDefinition } from '../../../core/types/ViewModeDefinition';
import { alphabetical } from '../../../core/utils/comparators';
import { YourItem } from '../types';

export const byLabel: ViewModeDefinition<YourItem> = {
  key: 'label',
  label: 'Label',

  // Group each item into a section. Return string[] for multi-section membership.
  grouper: (item) => item.label ?? 'Unknown',

  // Sort items within a section.
  sorter: (a, b) => a.title.localeCompare(b.title),

  // Sort section headers. REQUIRED — there is no default.
  // Use a comparator from core/utils/comparators or write your own.
  keyOrder: alphabetical,

  // Optional: exclude items from this view mode entirely.
  // filter: (item) => item.label !== undefined,
};
```

**Available comparators** (from `src/core/utils/comparators`):
- `alphabetical` — A → Z
- `reverseAlphabetical` — Z → A
- `numericDescending` — largest first (e.g. year descending)
- `numericAscending` — smallest first
- `fixedOrder(keys)` — explicit ordered list of section keys
- `alphabeticalWithLast(key)` — alphabetical, but one specific key sorts last (e.g. "Unknown")

**Multi-group:** if an item belongs to multiple sections, return `string[]` from `grouper`.
The item will appear once in each matching section. See `new.ts` in `domain/vinyl/` for an example.

---

## Step 4 — Build the item card

Create `src/domain/your-domain/YourItemCard.tsx`:

```typescript
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { YourItem } from './types';

interface Props {
  item: YourItem;
  onPress: (item: YourItem) => void;
}

export function YourItemCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity onPress={() => onPress(item)} style={styles.container}>
      {item.thumbUrl ? (
        <Image source={{ uri: item.thumbUrl }} style={styles.thumb} />
      ) : null}
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.creator}>{item.creator}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  thumb:     { width: 56, height: 56, borderRadius: 4, marginRight: 12 },
  info:      { flex: 1 },
  title:     { fontSize: 15, fontWeight: '600' },
  creator:   { fontSize: 13, opacity: 0.7, marginTop: 2 },
});
```

The component signature (`item: T`, `onPress: (item: T) => void`) must match
`CollectionConfig.ItemCard` exactly.

---

## Step 5 — Implement the sync service

Create `src/domain/your-domain/YourSyncService.ts`:

```typescript
import { SyncServiceBase } from '../../core/services/SyncServiceBase';
import { DatabaseService } from '../../core/services/DatabaseService';
import { CollectionConfig } from '../../core/types/CollectionConfig';
import { YourItem } from './types';

export class YourSyncService extends SyncServiceBase<YourItem> {
  constructor(
    db: DatabaseService,
    config: CollectionConfig<YourItem>,
    userId: string,
    private readonly accessToken: string,
  ) {
    super(db, config, userId);
  }

  /**
   * Fetch raw data from your API. Return an array of raw objects — core will
   * call config.parseApiItem on each one.
   */
  async fetchFromRemote(): Promise<unknown[]> {
    const response = await fetch('https://api.your-service.com/collection', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.items ?? [];
  }

  // The default sync() from SyncServiceBase handles: fetchFromRemote → parseApiItem → upsertMany.
  // Only override sync() if you need multi-step fetching, pagination, or progress callbacks.
}
```

For complex flows (pagination, multi-step jobs, polling), override `sync()`. See
`VinylSyncService.ts` in `domain/vinyl/` for a full example.

---

## Step 6 — Assemble the config

Create `src/domain/your-domain/config.ts`:

```typescript
import { CollectionConfig } from '../../core/types/CollectionConfig';
import { YourItem } from './types';
import { YourItemCard } from './YourItemCard';
import { byLabel } from './viewModes/byLabel';
import { byDate } from './viewModes/byDate';
// import other view modes...

export const yourConfig: CollectionConfig<YourItem> = {
  viewModes: [byLabel, byDate],
  defaultViewMode: 'label',

  creatorLabel: 'Artist',   // Displayed in UI where "Artist" is the appropriate label

  searchFilter: (item, query) => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.creator.toLowerCase().includes(q)
    );
  },

  ItemCard: YourItemCard,

  schemaExtensions: [
    { name: 'releaseDate', type: 'TEXT' },
    { name: 'label',       type: 'TEXT' },
  ],

  parseApiItem: (raw): YourItem => {
    const r = raw as Record<string, unknown>;
    return {
      id:          String(r.id),
      title:       String(r.title ?? ''),
      creator:     String(r.artist ?? r.creator ?? ''),
      thumbUrl:    typeof r.cover_url === 'string' ? r.cover_url : null,
      addedAt:     typeof r.added_at === 'number' ? r.added_at : Date.now() / 1000,
      tags:        Array.isArray(r.genres) ? (r.genres as string[]) : [],
      isSaved:     r.is_saved === true,
      releaseDate: typeof r.release_date === 'string' ? r.release_date : undefined,
      label:       typeof r.label === 'string' ? r.label : undefined,
    };
  },
};
```

---

## Step 7 — Wire into the app shell

In `App.tsx` (or your root navigator), construct the database and sync service and
pass the config to `CollectionSectionView`:

```typescript
import { yourConfig } from './src/domain/your-domain/config';
import { YourSyncService } from './src/domain/your-domain/YourSyncService';
import { DatabaseService } from './src/core/services/DatabaseService';

const db = new DatabaseService(yourConfig.schemaExtensions);
const syncService = new YourSyncService(db, yourConfig, userId, accessToken);
```

Then pass `config={yourConfig}` to the `CollectionSectionView` component.

---

## Checklist

Before shipping a new domain:

- [ ] `YourItem extends CollectionItem` — no extra base fields
- [ ] All boolean INTEGER columns declare `isBoolean: true` in `schemaExtensions`
- [ ] All locally-editable fields declare `preserveOnSync: true`
- [ ] Every `ViewModeDefinition` has an explicit `keyOrder` — no section ordering is assumed
- [ ] `parseApiItem` handles missing or null fields gracefully (never throws)
- [ ] `fetchFromRemote` throws on non-2xx responses
- [ ] `creatorLabel` is set to the domain-appropriate term (Artist, Author, Director, etc.)
- [ ] Domain directory contains no imports from `src/domain/vinyl/` or any other domain

---

## Reference

- `src/core/types/CollectionItem.ts` — base type
- `src/core/types/CollectionConfig.ts` — plugin contract
- `src/core/types/ViewModeDefinition.ts` — view mode shape
- `src/core/types/ColumnDefinition.ts` — schema extension shape
- `src/core/utils/comparators.ts` — built-in key ordering utilities
- `src/domain/vinyl/` — complete reference implementation
