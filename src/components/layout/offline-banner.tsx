"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Cloud } from "lucide-react";
import { useOfflineStore } from "@/stores/offline-store";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const {
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncAt,
  } = useOfflineStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline || pendingSyncCount > 0) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSyncCount]);

  if (!visible) return null;

  const formatLastSync = () => {
    if (!lastSyncAt) return "Never synced";
    const diff = Date.now() - new Date(lastSyncAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm transition-colors",
        !isOnline
          ? "bg-healthcare-amber text-white"
          : isSyncing
            ? "bg-brand-500 text-white"
            : pendingSyncCount > 0
              ? "bg-healthcare-amber/90 text-white"
              : "bg-accent-500 text-white"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              You are offline. Changes will sync when reconnected.
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Syncing changes...</span>
          </>
        ) : pendingSyncCount > 0 ? (
          <>
            <Cloud className="h-4 w-4" />
            <span>
              {pendingSyncCount} pending {pendingSyncCount === 1 ? "change" : "changes"} to sync
            </span>
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4" />
            <span>All changes synced</span>
          </>
        )}
      </div>
      <span className="hidden text-xs opacity-80 sm:inline">
        Last sync: {formatLastSync()}
      </span>
    </div>
  );
}
