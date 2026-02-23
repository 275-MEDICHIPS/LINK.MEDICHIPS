"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark" | "system";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Auto-dismiss duration in ms (0 = manual dismiss only) */
  duration: number;
  /** Timestamp for ordering */
  createdAt: number;
}

interface UiState {
  /** Sidebar collapsed / expanded */
  sidebarOpen: boolean;
  /** Theme preference */
  theme: Theme;
  /** UI locale (BCP-47 tag) */
  locale: string;
  /** Active toast notifications */
  toasts: Toast[];
  /** Mobile navigation sheet open */
  mobileNavOpen: boolean;
  /** Command palette / search open */
  commandOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: string) => void;
  addToast: (
    toast: Omit<Toast, "id" | "createdAt" | "duration"> & {
      duration?: number;
    }
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let toastCounter = 0;

function generateToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

const MAX_TOASTS = 5;
const DEFAULT_TOAST_DURATION = 5000;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "system",
      locale: "en",
      toasts: [],
      mobileNavOpen: false,
      commandOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setTheme: (theme) => {
        set({ theme });
        // Apply to document for CSS variables
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          root.classList.remove("light", "dark");
          if (theme === "system") {
            const prefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches;
            root.classList.add(prefersDark ? "dark" : "light");
          } else {
            root.classList.add(theme);
          }
        }
      },

      setLocale: (locale) => set({ locale }),

      addToast: (toast) => {
        const id = generateToastId();
        const duration = toast.duration ?? DEFAULT_TOAST_DURATION;

        set((state) => {
          // Keep only the most recent toasts
          const existing = state.toasts.slice(-(MAX_TOASTS - 1));
          return {
            toasts: [
              ...existing,
              { ...toast, id, duration, createdAt: Date.now() },
            ],
          };
        });

        // Auto-dismiss
        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }));
          }, duration);
        }

        return id;
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

      setCommandOpen: (open) => set({ commandOpen: open }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        locale: state.locale,
      }),
    }
  )
);
