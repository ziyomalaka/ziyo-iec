"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { getCatalogCourse } from "@/lib/dashboard/qualification-catalog";
import { ApiError } from "@/lib/api/errors";
import { mapCourseDetail } from "@/lib/dashboard/mappers/courses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import CourseDetailView from "@/components/dashboard/views/CourseDetailView";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export default function CourseDetailLoader({ id }: { id: string }) {
  const [course, setCourse] = useState<CourseCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await getCatalogCourse(id);
        setCourse(mapCourseDetail(data));
        setError(null);
      } catch (err) {
        setCourse(null);
        setError(err instanceof ApiError ? err.message : "Kurs topilmadi.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  if (loading) return <LoadingState className="p-6" />;
  if (error || !course) {
    return (
      <div className="p-6">
        <EmptyState
          icon={GraduationCap}
          title="Kurs topilmadi"
          description={error ?? "Bu kurs mavjud emas."}
        />
      </div>
    );
  }

  return <CourseDetailView course={course} />;
}
