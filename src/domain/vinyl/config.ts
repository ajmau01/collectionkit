import { CollectionConfig } from '../../core/types/CollectionConfig';
import { VinylItem } from './types';
import { artistViewMode } from './viewModes/artist';
import { genreViewMode } from './viewModes/genre';
import { decadeViewMode } from './viewModes/decade';
import { newViewMode } from './viewModes/new';
import { savedViewMode } from './viewModes/saved';
import { spinViewMode } from './viewModes/spin';
import VinylItemCard from './VinylItemCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip diacritics from a string (NFD decompose → remove combining marks).
 * Mirrors Social Vinyl's removeDiacritics utility.
 */
function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Backend album shape (as returned by Social Vinyl's /collection endpoint) ─

interface RawBackendAlbum {
  releaseId?: number;
  instanceId?: number;
  instance_id?: number;
  title?: string;
  artist?: string;
  coverImage?: string;
  year?: string;
  label?: string;
  format?: string;
  tracks?: unknown;
  genres?: string[];       // injected by VinylSyncService during flatten
  date_added?: string;
  addedTimestamp?: number; // ms
  isNotable?: boolean;
  isSaved?: boolean;
  spinCount?: number;
  totalDuration?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const vinylConfig: CollectionConfig<VinylItem> = {
  // ── View modes ─────────────────────────────────────────────────────────────
  viewModes: [
    artistViewMode,
    genreViewMode,
    decadeViewMode,
    newViewMode,
    savedViewMode,
    spinViewMode,
  ],

  defaultViewMode: 'artist',

  creatorLabel: 'Artist',

  // ── Search ─────────────────────────────────────────────────────────────────
  /**
   * Diacritic-insensitive search across creator and title.
   *
   * Matches if:
   *   (a) the trimmed query matches the raw creator/title (exact diacritics), OR
   *   (b) the normalised query matches the normalised creator/title
   *
   * Mirrors Social Vinyl's useGroupedReleases search filter exactly.
   */
  searchFilter: (item: VinylItem, query: string): boolean => {
    const trimmed = query.toLowerCase().trim();
    if (!trimmed) return true;

    const normalizedQuery = removeDiacritics(trimmed);

    const creator = (item.creator ?? '').toLowerCase();
    const title = (item.title ?? '').toLowerCase();
    const normalizedCreator = removeDiacritics(creator);
    const normalizedTitle = removeDiacritics(title);

    return (
      creator.includes(trimmed) ||
      title.includes(trimmed) ||
      normalizedCreator.includes(normalizedQuery) ||
      normalizedTitle.includes(normalizedQuery)
    );
  },

  // ── Item card ──────────────────────────────────────────────────────────────
  ItemCard: VinylItemCard,

  // ── Schema extensions ─────────────────────────────────────────────────────
  /**
   * Extra SQLite columns beyond the CollectionItem base.
   * Columns marked preserveOnSync keep their local value across sync cycles
   * (user-edited or curation-flag fields).
   */
  schemaExtensions: [
    { name: 'instanceId',     type: 'INTEGER' },
    { name: 'year',           type: 'TEXT' },
    { name: 'label',          type: 'TEXT' },
    { name: 'format',         type: 'TEXT' },
    { name: 'tracks',         type: 'TEXT' },
    { name: 'isNotable',      type: 'INTEGER', defaultValue: 0, preserveOnSync: true, isBoolean: true },
    { name: 'spinCount',      type: 'INTEGER', defaultValue: 0, preserveOnSync: true },
    { name: 'totalDuration',  type: 'INTEGER', defaultValue: 0 },
  ],

  // ── API parser ─────────────────────────────────────────────────────────────
  /**
   * Map a raw backend album object (post-flatten) to a VinylItem.
   *
   * Key mappings (mirroring CollectionSyncService.saveReleases):
   *   releaseId           → id
   *   instanceId / instance_id → instanceId
   *   artist              → creator
   *   coverImage          → thumbUrl
   *   genres[]            → tags
   *   addedTimestamp (ms) → addedAt (seconds)  [priority 1]
   *   date_added (ISO)    → addedAt (seconds)  [priority 2]
   *   now                 → addedAt            [fallback]
   */
  parseApiItem: (raw: unknown): VinylItem => {
    const album = raw as RawBackendAlbum;

    // ── addedAt resolution ─────────────────────────────────────────────────
    let addedAt = Math.floor(Date.now() / 1000);

    if (album.addedTimestamp && album.addedTimestamp > 0) {
      addedAt = Math.floor(album.addedTimestamp / 1000);
    } else if (album.date_added) {
      const dateMs = new Date(album.date_added).getTime();
      if (!isNaN(dateMs)) {
        addedAt = Math.floor(dateMs / 1000);
      }
    }

    // ── instanceId ─────────────────────────────────────────────────────────
    const rawInstanceId = album.instance_id ?? album.instanceId;
    const instanceId = rawInstanceId ? Number(rawInstanceId) : undefined;

    // ── tracks ─────────────────────────────────────────────────────────────
    let tracks: string | undefined;
    if (album.tracks !== undefined && album.tracks !== null) {
      tracks = typeof album.tracks === 'string'
        ? album.tracks
        : JSON.stringify(album.tracks);
    }

    return {
      // CollectionItem base
      id: album.releaseId ?? 0,
      title: album.title ?? '',
      creator: album.artist ?? '',
      thumbUrl: album.coverImage ?? null,
      addedAt,
      tags: album.genres ?? [],
      isSaved: album.isSaved ?? false,

      // VinylItem extensions
      instanceId,
      year: album.year,
      label: album.label,
      format: album.format,
      tracks,
      isNotable: album.isNotable ?? false,
      spinCount: album.spinCount ?? 0,
      totalDuration: album.totalDuration ?? 0,
    };
  },
};
