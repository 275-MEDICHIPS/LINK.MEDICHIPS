"use client";

import { create } from "zustand";
import type {
  Course,
  CourseWithModules,
  Module,
  Lesson,
  CourseFilters,
} from "@/types/course";

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface CourseState {
  /** Full course list (paginated, loaded via fetchCourses) */
  courseList: Course[];
  /** Currently viewed course with full module/lesson tree */
  currentCourse: CourseWithModules | null;
  /** Currently active module within the course */
  currentModule: Module | null;
  /** Currently active lesson within the module */
  currentLesson: Lesson | null;
  /** Loading flags */
  isLoading: boolean;
  isDetailLoading: boolean;
  /** Error state */
  error: string | null;
  /** Pagination metadata */
  totalCourses: number;
  currentPage: number;
  totalPages: number;

  // Actions
  setCourse: (course: CourseWithModules | null) => void;
  setModule: (module: Module | null) => void;
  setLesson: (lesson: Lesson | null) => void;
  fetchCourses: (filters?: CourseFilters) => Promise<void>;
  fetchCourseDetail: (courseId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCourseStore = create<CourseState>()((set, get) => ({
  courseList: [],
  currentCourse: null,
  currentModule: null,
  currentLesson: null,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  totalCourses: 0,
  currentPage: 1,
  totalPages: 1,

  setCourse: (course) =>
    set({ currentCourse: course, currentModule: null, currentLesson: null }),

  setModule: (module) => set({ currentModule: module, currentLesson: null }),

  setLesson: (lesson) => set({ currentLesson: lesson }),

  fetchCourses: async (filters) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.difficulty) params.set("difficulty", filters.difficulty);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.locale) params.set("locale", filters.locale);
      if (filters?.tags?.length) params.set("tags", filters.tags.join(","));
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

      const res = await fetch(`/api/v1/courses?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to fetch courses");
      }

      const json = await res.json();
      set({
        courseList: json.data ?? [],
        totalCourses: json.pagination?.total ?? 0,
        currentPage: json.pagination?.page ?? 1,
        totalPages: json.pagination?.totalPages ?? 1,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  fetchCourseDetail: async (courseId) => {
    if (get().isDetailLoading) return;
    set({ isDetailLoading: true, error: null });

    try {
      const res = await fetch(`/api/v1/courses/${courseId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to fetch course detail");
      }

      const json = await res.json();
      const course = json.data as CourseWithModules;

      set({
        currentCourse: course,
        // Auto-select first module/lesson if available
        currentModule: course.modules?.[0] ?? null,
        currentLesson: course.modules?.[0]?.lessons?.[0] ?? null,
        isDetailLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isDetailLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      courseList: [],
      currentCourse: null,
      currentModule: null,
      currentLesson: null,
      isLoading: false,
      isDetailLoading: false,
      error: null,
      totalCourses: 0,
      currentPage: 1,
      totalPages: 1,
    }),
}));
