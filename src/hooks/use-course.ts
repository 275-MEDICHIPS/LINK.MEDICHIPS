"use client";

import { useCallback, useEffect, useState } from "react";
import { useCourseStore } from "@/stores/course-store";
import type {
  Course,
  CourseWithModules,
  CourseFilters,
  Enrollment,
} from "@/types/course";

// ---------------------------------------------------------------------------
// useCourseList -- fetches and returns a paginated course list
// ---------------------------------------------------------------------------

interface UseCourseListReturn {
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  totalCourses: number;
  currentPage: number;
  totalPages: number;
  refetch: (filters?: CourseFilters) => Promise<void>;
}

export function useCourseList(filters?: CourseFilters): UseCourseListReturn {
  const courseList = useCourseStore((s) => s.courseList);
  const isLoading = useCourseStore((s) => s.isLoading);
  const error = useCourseStore((s) => s.error);
  const totalCourses = useCourseStore((s) => s.totalCourses);
  const currentPage = useCourseStore((s) => s.currentPage);
  const totalPages = useCourseStore((s) => s.totalPages);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);

  useEffect(() => {
    fetchCourses(filters);
    // Stringify filters for stable dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const refetch = useCallback(
    (overrideFilters?: CourseFilters) =>
      fetchCourses(overrideFilters ?? filters),
    [fetchCourses, filters]
  );

  return {
    courses: courseList,
    isLoading,
    error,
    totalCourses,
    currentPage,
    totalPages,
    refetch,
  };
}

// ---------------------------------------------------------------------------
// useCourseDetail -- fetches a single course with modules/lessons
// ---------------------------------------------------------------------------

interface UseCourseDetailReturn {
  course: CourseWithModules | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourseDetail(courseId: string | null): UseCourseDetailReturn {
  const currentCourse = useCourseStore((s) => s.currentCourse);
  const isLoading = useCourseStore((s) => s.isDetailLoading);
  const error = useCourseStore((s) => s.error);
  const fetchCourseDetail = useCourseStore((s) => s.fetchCourseDetail);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetail(courseId);
    }
  }, [courseId, fetchCourseDetail]);

  const refetch = useCallback(
    () => (courseId ? fetchCourseDetail(courseId) : Promise.resolve()),
    [courseId, fetchCourseDetail]
  );

  return { course: currentCourse, isLoading, error, refetch };
}

// ---------------------------------------------------------------------------
// useEnroll -- enrollment mutation
// ---------------------------------------------------------------------------

interface UseEnrollReturn {
  enroll: () => Promise<Enrollment>;
  isEnrolling: boolean;
  error: string | null;
}

export function useEnroll(courseId: string): UseEnrollReturn {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = useCallback(async (): Promise<Enrollment> => {
    setIsEnrolling(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Enrollment failed");
      }

      const json = await res.json();
      return json.data as Enrollment;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enrollment failed";
      setError(message);
      throw err;
    } finally {
      setIsEnrolling(false);
    }
  }, [courseId]);

  return { enroll, isEnrolling, error };
}
