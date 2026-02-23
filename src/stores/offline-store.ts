import { create } from "zustand";

type ConnectionQuality = "high" | "medium" | "low" | "offline";

interface OfflineState {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  setOnline: (isOnline: boolean) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setPendingSyncCount: (count: number) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncAt: (date: Date) => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  connectionQuality: "high",
  pendingSyncCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  setOnline: (isOnline) => set({ isOnline }),
  setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}));
