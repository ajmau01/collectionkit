import React from 'react';
import { CollectionItem } from './CollectionItem';
import { ViewModeDefinition } from './ViewModeDefinition';
import { ColumnDefinition } from './ColumnDefinition';

/**
 * The single object every domain passes to core/ to configure the collection experience.
 * This is the complete plugin contract — core/ needs nothing else from domain/.
 *
 * Design decisions:
 * - creatorLabel: UI label for the creator field ("Artist", "Author", "Winery")
 * - searchFilter: domain owns search logic — core/ never assumes field names
 * - ItemCard: domain owns item rendering
 * - schemaExtensions: domain declares extra SQLite columns beyond CollectionItem base
 * - parseApiItem: domain owns API response parsing
 * - No session/multi-user layer — stripped entirely (Social Vinyl's differentiator, not a template primitive)
 */
export interface CollectionConfig<T extends CollectionItem> {
  /** All view modes available in this domain */
  viewModes: ViewModeDefinition<T>[];

  /** View mode key shown on first launch */
  defaultViewMode: string;

  /** UI label for the creator field e.g. 'Artist', 'Author', 'Winery' */
  creatorLabel: string;

  /**
   * Returns true if item matches a search query.
   * Domain owns this — core/ never assumes which fields to search.
   */
  searchFilter: (item: T, query: string) => boolean;

  /** React component to render one item in the list */
  ItemCard: React.ComponentType<{
    item: T;
    onPress: (item: T) => void;
  }>;

  /**
   * SQLite columns beyond the CollectionItem base columns.
   * core/DatabaseService creates these automatically.
   * Base columns (id, title, creator, thumbUrl, addedAt, tags, isSaved) are always created.
   */
  schemaExtensions: ColumnDefinition[];

  /** Parse a raw API response object into a typed domain item */
  parseApiItem: (raw: unknown) => T;
}
