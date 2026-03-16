import { useState, useEffect, useCallback, useRef } from 'react';
import { CollectionItem } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { useAppStore } from '../store/useAppStore';

/**
 * useCollectionData
 *
 * Generic hook that loads a typed collection from local SQLite via DatabaseService.
 * Single-user only — multi-user session layer is not part of the CollectionKit template.
 *
 * Auto-reloads when syncStatus transitions to 'complete' (100ms delay to allow
 * all DB writes to commit before reading).
 *
 * Re-entrant load guard (loadingRef) prevents overlapping SQLite reads when
 * the sync watcher and a manual refresh fire in close succession.
 */
export function useCollectionData<T extends CollectionItem>({
  userId,
  db,
}: {
  userId: string;
  db: DatabaseService<T>;
}): {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
} {
  const [items, setItems] = useState<T[]>([]);
  // Start true: a SQLite read is scheduled immediately on mount, so the
  // consumer should treat the collection as "not yet loaded" right away.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);

  const loadData = useCallback(
    async (isRefresh: boolean = false) => {
      // Nothing to load without a userId.
      if (!userId) {
        setLoading(false);
        return;
      }

      // Guard: bail if a load is already in flight.
      if (loadingRef.current) {
        return;
      }

      // Guard: if a sync is actively writing, defer the read.
      // The syncStatus watcher will call loadData(true) once 'complete' fires.
      const isSyncing = useAppStore.getState().syncStatus === 'syncing';
      if (!isRefresh && isSyncing) {
        setLoading(false);
        return;
      }

      setLoading(true);
      loadingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const result = await db.getItems(userId);
        setItems(result);
      } catch (_error) {
        // Intentional: errors are surfaced through the empty-state UI.
        // Callers that need error details can wrap this hook.
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    [userId, db],
  );

  // Initial load on mount (and whenever userId or db instance changes).
  useEffect(() => {
    loadData();
  }, [loadData]);

  // AUTO-REFRESH: Reload when a sync completes.
  // 100ms delay allows DB writes to commit before reading.
  const syncStatus = useAppStore((s) => s.syncStatus);
  useEffect(() => {
    if (syncStatus === 'complete') {
      const timer = setTimeout(() => loadData(true), 100);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, loadData]);

  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  return { items, loading, refreshing, refresh };
}
