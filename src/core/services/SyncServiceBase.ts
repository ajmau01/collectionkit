import { CollectionItem } from '../types/CollectionItem';
import { CollectionConfig } from '../types/CollectionConfig';
import { SyncResult } from '../types';
import { DatabaseService } from './DatabaseService';

export type { SyncResult };

/**
 * Abstract base class for domain sync services.
 *
 * Usage pattern:
 *   1. Domain subclass implements fetchFromRemote() — calls its own API.
 *   2. The default sync() orchestrates fetch → parse → upsert.
 *   3. Domain may override sync() entirely for multi-step or complex flows.
 *
 * @template T  Domain item type (must extend CollectionItem)
 */
export abstract class SyncServiceBase<T extends CollectionItem> {
  constructor(
    protected db: DatabaseService,
    protected config: CollectionConfig<T>,
    protected userId: string
  ) {}

  /**
   * Fetch raw data from the remote API.
   * Domain owns the API URL, auth headers, response shape — core knows nothing
   * about the remote.
   */
  abstract fetchFromRemote(): Promise<unknown[]>;

  /**
   * Full sync cycle: fetch → parse → upsert.
   *
   * Override this in the domain subclass when a simple linear flow is
   * insufficient (e.g. multi-step jobs, polling, progress callbacks).
   */
  async sync(): Promise<SyncResult> {
    const raw = await this.fetchFromRemote();
    const items = raw.map(this.config.parseApiItem);
    await this.db.upsertMany(items, this.userId);
    return { count: items.length };
  }
}
