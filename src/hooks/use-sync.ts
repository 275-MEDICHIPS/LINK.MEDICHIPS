"use client";

import { useCallback, useEffect, useState } from "react";
import { syncManager } from "@/lib/offline/sync-manager";
import { useAuthStore } from "@/stores/auth-store";
import { useOfflineStore } from "@/stores/offline-store";
import { useProgressStore } from "@/stores/progress-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseSyncReturn {
  /** Number of items waiting to be synced */
  pendingCount: number;
  /** Timestamp of last successful sync */
  lastSyncAt: Date | null;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Error from last sync attempt */
  error: string | null;
  /** Manually trigger a sync */
  triggerSync: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSync(): UseSyncReturn {
  const user = useAuthStore((s) => s.user);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingCount = useOfflineStore((s) => s.pendingSyncCount);
  const isSyncing = useOfflineStore((s) => s.isSyncing);
  const lastSyncAt = useOfflineStore((s) => s.lastSyncAt);
  const setPendingSyncCount = useOfflineStore((s) => s.setPendingSyncCount);
  const setSyncing = useOfflineStore((s) => s.setSyncing);
  const setLastSyncAt = useOfflineStore((s) => s.setLastSyncAt);

  const syncPending = useProgressStore((s) => s.syncPending);

  const [error, setError] = useState<string | null>(null);

  // Trigger sync process
  const triggerSync = useCallback(async () => {
    if (!user?.id || isSyncing) return;

    setSyncing(true);
    setError(null);

    try {
      const result = await syncManager.processQueue(user.id);

      if (result.failed > 0) {
        setError(`${result.failed} item(s) failed to sync`);
      }

      setLastSyncAt(new Date());
      const count = await syncManager.getPendingCount(user.id);
      setPendingSyncCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [
    user?.id,
    isSyncing,
    setSyncing,
    setLastSyncAt,
    setPendingSyncCount,
  ]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user?.id && pendingCount > 0) {
      triggerSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Auto-sync when progress store has dirty entries
  useEffect(() => {
    if (isOnline && user?.id && syncPending) {
      const timer = setTimeout(() => {
        triggerSync();
      }, 5000); // Debounce 5 seconds
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncPending, isOnline]);

  // Poll pending count
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      try {
        const count = await syncManager.getPendingCount(user.id);
        setPendingSyncCount(count);
      } catch {
        // Ignore errors in background polling
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id, setPendingSyncCount]);

  return {
    pendingCount,
    lastSyncAt,
    isSyncing,
    isOnline,
    error,
    triggerSync,
  };
}
