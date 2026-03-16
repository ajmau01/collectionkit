import { SyncServiceBase, SyncResult } from '../../core/services/SyncServiceBase';
import { DatabaseService } from '../../core/services/DatabaseService';
import { CollectionConfig } from '../../core/types/CollectionConfig';
import { VinylItem } from './types';

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendAlbum {
  releaseId: number;
  instanceId?: number;    // camelCase (some sources)
  instance_id?: number;   // snake_case (backend)
  title: string;
  artist: string;
  coverImage: string;
  year?: string;
  label?: string;
  format?: string;
  tracks?: unknown[];
  genres?: string[];      // injected during flatten
  date_added?: string;    // ISO date string
  addedTimestamp?: number; // ms from backend
  isNotable?: boolean;
  isSaved?: boolean;
  spinCount?: number;
  totalDuration?: number;
}

interface ScanResponse {
  albums: BackendAlbum[];
  count: number;
  username: string;
  avatarUrl?: string;
}

interface ScanJobStartResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

interface ScanJobStatusResponse {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
  message?: string;
}

export interface VinylSyncCallbacks {
  onProgress?: (pct: number) => void;
  onStatusChange?: (status: 'syncing' | 'complete' | 'error') => void;
}

// ─── Generic folders that should not be treated as meaningful genres ──────────

const GENERIC_FOLDERS = new Set([
  'all', 'uncategorized', 'vinyl', 'albums', 'unsorted', 'collection',
]);

/**
 * VinylSyncService
 *
 * Extends SyncServiceBase<VinylItem> and overrides sync() to implement
 * Social Vinyl's multi-step async scan pattern:
 *   1. POST startScan → receive jobId
 *   2. Poll scanStatus until COMPLETED or FAILED
 *   3. GET format=json → albums grouped by genre (flatten + deduplicate)
 *   4. Parse and upsert via config.parseApiItem + db.upsertMany
 *
 * Mirrors CollectionSyncService.syncCollection() from Social Vinyl.
 */
export class VinylSyncService extends SyncServiceBase<VinylItem> {
  private readonly baseUrl: string;
  private abortController: AbortController | null = null;
  private _syncing = false;

  constructor(
    db: DatabaseService,
    config: CollectionConfig<VinylItem>,
    userId: string,
    baseUrl: string,
  ) {
    super(db, config, userId);
    this.baseUrl = baseUrl.replace(/\/$/, ''); // strip trailing slash
  }

  // ---------------------------------------------------------------------------
  // SyncServiceBase.fetchFromRemote — used by the default sync() path
  // ---------------------------------------------------------------------------

  /**
   * Fetches the collection from the Social Vinyl backend (format=json).
   * Returns a flat, deduplicated array of raw BackendAlbum objects.
   *
   * The backend returns albums grouped by genre:
   *   { "Rock": [...], "Jazz": [...], ... }
   * We flatten and deduplicate by instanceId here so the default sync() path
   * (fetch → parse → upsert) works correctly.
   */
  async fetchFromRemote(): Promise<unknown[]> {
    const scanResponse = await this._fetchScan();
    if (!scanResponse || scanResponse.albums.length === 0) {
      return [];
    }
    return scanResponse.albums as unknown[];
  }

  // ---------------------------------------------------------------------------
  // Override sync() — multi-step scan job pattern
  // ---------------------------------------------------------------------------

  async sync(callbacks?: VinylSyncCallbacks): Promise<SyncResult> {
    if (this._syncing) {
      throw new Error('Sync already in progress for this user');
    }

    this._syncing = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    callbacks?.onStatusChange?.('syncing');
    callbacks?.onProgress?.(0);

    try {
      // ── Step 1: Start the async scan job ──────────────────────────────────
      const startUrl = `${this.baseUrl}/collection?mode=startScan&username=${encodeURIComponent(this.userId)}`;
      const startRes = await fetch(startUrl, { method: 'POST', signal });

      if (!startRes.ok) {
        const errText = await startRes.text();
        throw new Error(`Failed to start scan: ${startRes.status} ${errText}`);
      }

      const startData: ScanJobStartResponse = await startRes.json();
      if (!startData.success || !startData.jobId) {
        throw new Error(startData.error ?? 'Failed to start scan job');
      }

      const jobId = startData.jobId;

      // ── Step 2: Poll for completion (up to 5 minutes) ────────────────────
      const MAX_POLLS = 300;
      const MAX_CONSECUTIVE_FAILURES = 5;
      let pollingAttempts = 0;
      let consecutiveFailures = 0;
      let isComplete = false;
      let lastUiProgress = 0;

      while (!isComplete && pollingAttempts < MAX_POLLS) {
        if (signal.aborted) throw new Error('Sync cancelled');

        await new Promise(resolve => setTimeout(resolve, 1000));
        pollingAttempts++;

        const statusUrl = `${this.baseUrl}/collection?mode=scanStatus&jobId=${encodeURIComponent(jobId)}`;

        let statusData: ScanJobStatusResponse | undefined;
        try {
          const statusRes = await fetch(statusUrl, { signal });

          if (!statusRes.ok) {
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              throw new Error(`Sync failed: too many consecutive errors (${statusRes.status})`);
            }
            continue;
          }

          consecutiveFailures = 0;
          statusData = await statusRes.json();

          // Mirror Social Vinyl's 0–85% progress for the scan phase.
          if (statusData?.progress !== undefined) {
            const uiProgress = Math.floor(statusData.progress * 0.85);
            if (uiProgress > lastUiProgress) {
              lastUiProgress = uiProgress;
              callbacks?.onProgress?.(uiProgress);
            }
          }

          if (statusData?.status === 'FAILED') {
            throw new Error(statusData.error ?? statusData.message ?? 'Scan job failed');
          }

          if (statusData?.status === 'COMPLETED') {
            isComplete = true;
          }
        } catch (pollError: unknown) {
          const err = pollError as Error;
          if (
            err.name === 'AbortError' ||
            err.message === 'Sync cancelled' ||
            err.message.includes('Scan job failed')
          ) {
            throw err;
          }

          consecutiveFailures++;
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) throw err;
        }
      }

      if (!isComplete) {
        throw new Error('Sync timed out waiting for backend job');
      }

      // ── Step 3: Fetch the resulting data ─────────────────────────────────
      callbacks?.onProgress?.(85);
      const scanResponse = await this._fetchScan();
      callbacks?.onProgress?.(90);

      if (!scanResponse || scanResponse.albums.length === 0) {
        throw new Error('Discogs collection empty or user not found');
      }

      // ── Step 4: Parse and upsert ──────────────────────────────────────────
      callbacks?.onProgress?.(95);
      await this.db.clearUserItems(this.userId);

      const items = scanResponse.albums.map(raw =>
        this.config.parseApiItem(raw as unknown)
      );
      await this.db.upsertMany(items, this.userId);

      callbacks?.onStatusChange?.('complete');
      callbacks?.onProgress?.(100);

      return { count: items.length };
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError' && err.message !== 'Sync cancelled') {
        callbacks?.onStatusChange?.('error');
      }
      throw err;
    } finally {
      this._syncing = false;
      this.abortController = null;
    }
  }

  // ---------------------------------------------------------------------------
  // cancel()
  // ---------------------------------------------------------------------------

  cancel(): void {
    this.abortController?.abort();
  }

  isSyncing(): boolean {
    return this._syncing;
  }

  // ---------------------------------------------------------------------------
  // Internal: fetch + flatten
  // ---------------------------------------------------------------------------

  /**
   * Fetches /collection?format=json, handles the grouped-by-genre backend shape,
   * and returns a flat, deduplicated ScanResponse.
   *
   * Deduplication key: instanceId (not releaseId), because one user can own
   * multiple physical copies of the same release.
   */
  private async _fetchScan(): Promise<ScanResponse | null> {
    const url = `${this.baseUrl}/collection?format=json&username=${encodeURIComponent(this.userId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error fetching collection: ${response.status}`);
    }

    const rawData = await response.json();

    // Backend may return { albums: { "Rock": [...], "Jazz": [...] } }
    // (grouped by genre/folder) OR { albums: [...] } (already flat).
    if (rawData?.albums && !Array.isArray(rawData.albums)) {
      return this._flattenGrouped(rawData);
    }

    return rawData as ScanResponse;
  }

  /**
   * Flatten a genre-grouped response into a deduplicated flat array.
   * Mirrors CollectionSyncService.fetchScan's flatten + dedup logic exactly.
   */
  private _flattenGrouped(rawData: {
    albums: Record<string, BackendAlbum[]>;
    username?: string;
    avatarUrl?: string;
  }): ScanResponse {
    const uniqueAlbumsMap = new Map<number, BackendAlbum>();

    for (const [category, albumList] of Object.entries(rawData.albums)) {
      for (const album of albumList) {
        const rawInstanceId = album.instance_id ?? album.instanceId;
        const instanceId = rawInstanceId ? Number(rawInstanceId) : null;
        const dedupeKey = instanceId ?? album.releaseId;

        if (!uniqueAlbumsMap.has(dedupeKey)) {
          uniqueAlbumsMap.set(dedupeKey, {
            ...album,
            instanceId: instanceId ?? undefined,
            genres: [category],
          });
        } else {
          const existing = uniqueAlbumsMap.get(dedupeKey)!;
          if (existing.genres && !existing.genres.includes(category)) {
            // Specific genres go to the front; generic/catch-all folders to back.
            if (GENERIC_FOLDERS.has(category.toLowerCase())) {
              existing.genres.push(category);
            } else {
              existing.genres.unshift(category);
            }
          }
        }
      }
    }

    const flatAlbums = Array.from(uniqueAlbumsMap.values());

    return {
      albums: flatAlbums,
      count: flatAlbums.length,
      username: rawData.username ?? this.userId,
      avatarUrl: rawData.avatarUrl,
    };
  }
}
