export type { CollectionItem } from './CollectionItem';
export type { CollectionConfig } from './CollectionConfig';
export type { ViewModeDefinition } from './ViewModeDefinition';
export type { ColumnDefinition } from './ColumnDefinition';

export type SyncStatus = 'idle' | 'syncing' | 'complete' | 'error';

export interface SyncResult {
  count: number;
  errors?: string[];
}

export interface CollectionSection<T> {
  title: string;
  data: T[];
}
