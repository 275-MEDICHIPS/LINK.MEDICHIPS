"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_VERIFIED"
  | "TASK_REJECTED"
  | "QUIZ_GRADED"
  | "BADGE_EARNED"
  | "STREAK_WARNING"
  | "COURSE_UPDATE"
  | "MESSAGE"
  | "SYSTEM"
  | "REMINDER";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  /** Whether the notification has been read */
  read: boolean;
  /** Optional action URL */
  actionUrl?: string;
  /** Optional icon identifier */
  icon?: string;
  /** Related entity for navigation */
  entityType?: string;
  entityId?: string;
  /** Sender info (for messages) */
  senderName?: string;
  senderAvatarUrl?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  /** Whether notifications have been fetched at least once */
  initialized: boolean;

  // Actions
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countUnread(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  initialized: false,

  addNotification: (notification) => {
    set((state) => {
      // Prevent duplicates
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    });
  },

  addNotifications: (newNotifications) => {
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const unique = newNotifications.filter((n) => !existingIds.has(n.id));
      const updated = [...unique, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    });
  },

  markRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    });

    // Fire-and-forget server update
    fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], read: true }),
    }).catch(() => {
      // Will retry on next sync
    });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {
      // Will retry on next sync
    });
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    });
  },

  fetchNotifications: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const res = await fetch("/api/v1/notifications");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to fetch notifications");
      }

      const json = await res.json();
      const notifications = (json.data ?? []) as Notification[];

      set({
        notifications,
        unreadCount: countUnread(notifications),
        isLoading: false,
        initialized: true,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      initialized: false,
    }),
}));
