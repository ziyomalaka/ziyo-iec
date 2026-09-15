"use client";

import { useCallback, useEffect, useState } from "react";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import RetrainingCourseDetailView from "@/components/retraining/RetrainingCourseDetailView";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { retrainingGetCourse } from "@/lib/retraining/service";
import { RETRAINING_SELECT_PATH } from "@/lib/auth/program";
import { useRouter } from "@/i18n/navigation";
import {
  isRetrainingTypeMissingError,
  useRequireRetrainingType,
} from "@/lib/retraining/use-require-type";

export default function RetrainingCourseDetailLoader({ id }: { id: string }) {
  const { retrainingKind } = useStudentProgramPaths();
  const router = useRouter();
  const requireType = useRequireRetrainingType();
  const [course, setCourse] = useState<CourseCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const type = (await requireType()) ?? retrainingKind;
      if (!type) return;
      const next = await retrainingGetCourse(id, type);
      setCourse(next);
      if (!next) setError(new Error("Ma'lumot topilmadi."));
    } catch (caught) {
      if (isRetrainingTypeMissingError(caught)) {
        router.replace(RETRAINING_SELECT_PATH);
        return;
      }
      setCourse(null);
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [id, requireType, retrainingKind, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !course) return <ErrorState error={error} onRetry={() => void load()} />;
  return <RetrainingCourseDetailView course={course} />;
}
