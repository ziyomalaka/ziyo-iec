"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { getCourseFilters } from "@/lib/api/courses";
import { getCatalogCourses } from "@/lib/dashboard/qualification-catalog";
import type { CourseListQuery, FilterOption } from "@/lib/api/types/courses";
import { mapCourseCard } from "@/lib/dashboard/mappers/courses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import { displayEducationCategoryName } from "@/lib/dashboard/education-level";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export type CourseFilterValues = {
  direction: string;
  subject: string;
  courseType: string;
  hours: string;
  module: string;
  status: string;
};

export const emptyFilters: CourseFilterValues = {
  direction: "",
  subject: "",
  courseType: "",
  hours: "",
  module: "",
  status: "",
};

const placeholders = {
  direction: "Yo'nalish",
  subject: "Fan",
  courseType: "Kurs turi",
  hours: "Soat",
  module: "Modul",
  status: "Holati",
} as const;

function withEducationLabels(items: FilterOption[] | undefined): FilterOption[] {
  return (items ?? []).map((item) => ({
    ...item,
    label: displayEducationCategoryName(item.label, item.value) || item.label,
  }));
}

function withPlaceholder(items: FilterOption[] | undefined, label: string): FilterOption[] {
  return [{ value: "", label }, ...(items ?? [])];
}

export function useCourses(
  search: string,
  filters: CourseFilterValues,
  page: number,
  perPage: number
) {
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [options, setOptions] = useState({
    direction: withPlaceholder([], placeholders.direction),
    subject: withPlaceholder([], placeholders.subject),
    courseType: withPlaceholder([], placeholders.courseType),
    hours: withPlaceholder([], placeholders.hours),
    module: withPlaceholder([], placeholders.module),
    status: withPlaceholder([], placeholders.status),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadFilters = useCallback(async () => {
    try {
      const data = await getCourseFilters();
      setOptions({
        direction: withPlaceholder(withEducationLabels(data.directions), placeholders.direction),
        subject: withPlaceholder(data.subjects, placeholders.subject),
        courseType: withPlaceholder(data.course_types, placeholders.courseType),
        hours: withPlaceholder(data.hours, placeholders.hours),
        module: withPlaceholder(data.modules, placeholders.module),
        status: withPlaceholder(data.statuses, placeholders.status),
      });
    } catch {
      /* filtrlar bo'lmasa ham katalog ishlayveradi */
    }
  }, []);

  const loadCourses = useCallback(
    async (silent = false) => {
      const params: CourseListQuery = {
        q: query,
        category_id: filters.direction || undefined,
        subject: filters.subject || undefined,
        course_type: filters.courseType || undefined,
        hours: filters.hours || undefined,
        modules: filters.module || undefined,
        status: filters.status || undefined,
        page,
        per_page: perPage,
      };

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await getCatalogCourses(params);
        setCourses((data.items ?? []).map(mapCourseCard));
        setTotalPages(Math.max(1, data.total_pages ?? 1));
        setError(null);
      } catch (err) {
        if (silent) return;
        setCourses([]);
        setError(err instanceof ApiError ? err.message : "Kurslarni yuklab bo'lmadi.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [query, filters, page, perPage]
  );

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    void loadCourses(false);
  }, [loadCourses]);

  useLiveRefresh(() => {
    void loadFilters();
    void loadCourses(true);
  });

  return { courses, totalPages, options, loading, error, emptyFilters };
}
