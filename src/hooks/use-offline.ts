"use client";

import { useEffect, useCallback, useState } from "react";
import { syncManager } from "@/lib/offline/sync-manager";
import { requestPersistentStorage, getStorageEstimate } from "@/lib/offline/db";
import { useAuthStore } from "@/stores/auth-store";
import { useOfflineStore } from "@/stores/offline-store";

/**
 * Hook for offline sync functionality.
 */
export function useOfflineSync() {
  const user = useAuthStore((s) => s.user);
  const { isOnline, setPendingSyncCount, setSyncing, setLastSyncAt } =
    useOfflineStore();
  const [initialized, setInitialized] = useState(false);

  // Request persistent storage on mount
  useEffect(() => {
    if (!initialized) {
      requestPersistentStorage();
      setInitialized(true);
    }
  }, [initialized]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user?.id) {
      triggerSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user?.id]);

  // Listen for service worker sync messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_TRIGGERED" && user?.id) {
        triggerSync();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update pending count periodically
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const count = await syncManager.getPendingCount(user.id);
      setPendingSyncCount(count);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id, setPendingSyncCount]);

  const triggerSync = useCallback(async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      await syncManager.processQueue(user.id);
      setLastSyncAt(new Date());
      const count = await syncManager.getPendingCount(user.id);
      setPendingSyncCount(count);
    } finally {
      setSyncing(false);
    }
  }, [user?.id, setSyncing, setLastSyncAt, setPendingSyncCount]);

  return { triggerSync };
}

/**
 * Hook for storage usage info.
 */
export function useStorageInfo() {
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });

  useEffect(() => {
    getStorageEstimate().then(setStorage);
  }, []);

  return {
    usageMB: Math.round(storage.usage / (1024 * 1024)),
    quotaMB: Math.round(storage.quota / (1024 * 1024)),
    usagePercent:
      storage.quota > 0
        ? Math.round((storage.usage / storage.quota) * 100)
        : 0,
  };
}
