import { useCallback } from 'react';
import { SyncStatus } from '../types';
import { SyncServiceBase } from '../services/SyncServiceBase';
import { useAppStore } from '../store/useAppStore';

/**
 * useSyncCollection
 *
 * Thin hook that drives a SyncServiceBase through a sync lifecycle and
 * keeps useAppStore up to date with status and progress.
 *
 * Errors are caught and surfaced as syncStatus = 'error' — never thrown
 * to the caller. The sync function itself returns void; consumers should
 * watch syncStatus to react to completion or failure.
 */
export function useSyncCollection(syncService: SyncServiceBase): {
  sync: () => Promise<void>;
  syncStatus: SyncStatus;
  syncProgress: number;
} {
  const { setSyncStatus, setSyncProgress } = useAppStore.getState();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const syncProgress = useAppStore((s) => s.syncProgress);

  const sync = useCallback(async () => {
    const { setSyncStatus: setStatus, setSyncProgress: setProgress } =
      useAppStore.getState();

    setStatus('syncing');
    setProgress(0);

    try {
      await syncService.sync({
        onProgress: (progress: number) => {
          useAppStore.getState().setSyncProgress(progress);
        },
        onStatusChange: (status: SyncStatus) => {
          useAppStore.getState().setSyncStatus(status);
        },
      });
    } catch (_error) {
      useAppStore.getState().setSyncStatus('error');
      useAppStore.getState().setSyncProgress(0);
    }
  }, [syncService]);

  return { sync, syncStatus, syncProgress };
}
