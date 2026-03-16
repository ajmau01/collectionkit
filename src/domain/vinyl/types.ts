import { CollectionItem } from '../../core/types/CollectionItem';

/**
 * VinylItem — domain type for the vinyl reference implementation.
 *
 * Extends CollectionItem with vinyl/music-specific fields.
 * Field mapping from Social Vinyl's Release type:
 *   artist      → creator   (CollectionItem base)
 *   thumb_url   → thumbUrl  (CollectionItem base)
 *   added_at    → addedAt   (CollectionItem base)
 *   genres (comma-separated string) → tags (string[]) (CollectionItem base)
 *   isSaved     → isSaved   (CollectionItem base)
 *   title       → title     (CollectionItem base)
 *   id          → id        (CollectionItem base)
 */
export interface VinylItem extends CollectionItem {
  instanceId?: number;      // Unique instance PK (Discogs instanceId)
  year?: string;            // Release year as string (parsed to number for sorting/grouping)
  label?: string;           // Record label
  format?: string;          // e.g. "Vinyl, LP, Album"
  tracks?: string;          // JSON stringified Track[]
  isNotable?: boolean;      // Host-curated flag — preserved across syncs
  spinCount?: number;       // Play count — preserved across syncs
  totalDuration?: number;   // Total duration in seconds
}
