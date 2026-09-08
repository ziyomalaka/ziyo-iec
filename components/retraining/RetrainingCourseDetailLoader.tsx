"use client";

import { useCallback, useEffect, useState } from "react";
import { getRetrainingCourse } from "@/lib/retraining/catalog";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import RetrainingCourseDetailView from "@/components/retraining/RetrainingCourseDetailView";

export default function RetrainingCourseDetailLoader({ id }: { id: string }) {
  const [course, setCourse] = useState<CourseCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getRetrainingCourse(id);
      setCourse(next);
      if (!next) setError(new Error("Ma'lumot topilmadi."));
    } catch (caught) {
      setCourse(null);
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !course) return <ErrorState error={error} onRetry={() => void load()} />;
  return <RetrainingCourseDetailView course={course} />;
}
