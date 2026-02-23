"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LessonProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface LessonProgressData {
  status: LessonProgressStatus;
  score: number | null;
  timeSpentSec: number;
  completedAt: string | null;
  lastAccessedAt: string;
  /** Whether this entry needs to be synced to server */
  dirty: boolean;
}

interface ProgressState {
  /** Map of lessonId to progress data */
  lessonProgress: Record<string, LessonProgressData>;
  /** Map of courseId to overall completion percentage */
  courseProgress: Record<string, number>;
  /** Whether there are unsaved changes waiting for sync */
  syncPending: boolean;
  /** Timestamp of last successful sync */
  lastSyncedAt: string | null;

  // Actions
  updateLessonProgress: (
    lessonId: string,
    data: Partial<Omit<LessonProgressData, "dirty">>
  ) => void;
  markLessonComplete: (lessonId: string, score?: number) => void;
  updateCourseProgress: (courseId: string, percentage: number) => void;
  recalculateCourseProgress: (
    courseId: string,
    lessonIds: string[]
  ) => void;
  /** Mark all dirty entries as clean (after successful sync) */
  markSynced: (lessonIds: string[]) => void;
  /** Bulk load from server response */
  hydrate: (
    lessons: Record<string, LessonProgressData>,
    courses: Record<string, number>
  ) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lessonProgress: {},
      courseProgress: {},
      syncPending: false,
      lastSyncedAt: null,

      updateLessonProgress: (lessonId, data) => {
        const current = get().lessonProgress[lessonId];
        const now = new Date().toISOString();

        const base: LessonProgressData = {
          status: current?.status ?? "NOT_STARTED",
          score: current?.score ?? null,
          timeSpentSec: current?.timeSpentSec ?? 0,
          completedAt: current?.completedAt ?? null,
          lastAccessedAt: current?.lastAccessedAt ?? now,
          dirty: true,
        };

        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              ...base,
              ...data,
              lastAccessedAt: now,
              dirty: true,
            },
          },
          syncPending: true,
        }));
      },

      markLessonComplete: (lessonId, score) => {
        const current = get().lessonProgress[lessonId];
        const now = new Date().toISOString();

        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              status: "COMPLETED" as const,
              score: score ?? current?.score ?? null,
              timeSpentSec: current?.timeSpentSec ?? 0,
              completedAt: now,
              lastAccessedAt: now,
              dirty: true,
            },
          },
          syncPending: true,
        }));
      },

      updateCourseProgress: (courseId, percentage) => {
        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: Math.min(100, Math.max(0, percentage)),
          },
        }));
      },

      recalculateCourseProgress: (courseId, lessonIds) => {
        const progress = get().lessonProgress;
        if (lessonIds.length === 0) return;

        const completedCount = lessonIds.filter(
          (id) => progress[id]?.status === "COMPLETED"
        ).length;

        const percentage = Math.round(
          (completedCount / lessonIds.length) * 100
        );

        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: percentage,
          },
        }));
      },

      markSynced: (lessonIds) => {
        const now = new Date().toISOString();
        set((state) => {
          const updated = { ...state.lessonProgress };
          for (const id of lessonIds) {
            if (updated[id]) {
              updated[id] = { ...updated[id], dirty: false };
            }
          }
          const stillDirty = Object.values(updated).some((p) => p.dirty);
          return {
            lessonProgress: updated,
            syncPending: stillDirty,
            lastSyncedAt: now,
          };
        });
      },

      hydrate: (lessons, courses) => {
        set({
          lessonProgress: lessons,
          courseProgress: courses,
          syncPending: false,
        });
      },

      reset: () =>
        set({
          lessonProgress: {},
          courseProgress: {},
          syncPending: false,
          lastSyncedAt: null,
        }),
    }),
    {
      name: "progress-store",
      partialize: (state) => ({
        lessonProgress: state.lessonProgress,
        courseProgress: state.courseProgress,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
