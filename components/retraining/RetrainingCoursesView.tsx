"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/layout/DashboardSearchContext";
import RetrainingCourseCard from "@/components/retraining/RetrainingCourseCard";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import { findRetrainingApplication } from "@/lib/retraining/applications";
import { retrainingListApplications, retrainingListCourses } from "@/lib/retraining/service";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { useRouter } from "@/i18n/navigation";
import {
  isRetrainingTypeMissingError,
  useRequireRetrainingType,
} from "@/lib/retraining/use-require-type";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { RetrainingCatalogCourse } from "@/lib/api/types/retraining";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

function RetrainingCoursesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
          <div className="h-[178px] animate-pulse bg-[#E8EDF5]" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-[#E8EDF5]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#E8EDF5]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EDF5]" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#E8EDF5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RetrainingCoursesView() {
  const paths = useStudentProgramPaths();
  const router = useRouter();
  const requireType = useRequireRetrainingType();
  const { search } = useDashboardSearch();
  const [courses, setCourses] = useState<RetrainingCatalogCourse[]>([]);
  const [applications, setApplications] = useState<ClientApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadGen = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;

  const load = useCallback(async (silent = false) => {
    const gen = silent ? loadGen.current : ++loadGen.current;
    if (!silent) setLoading(true);
    try {
      const type = await requireType();
      if (gen !== loadGen.current) return;
      if (!type) return;
      const query = {
        q: searchRef.current.trim() || undefined,
      };
      const [items, apps] = await Promise.all([
        retrainingListCourses(type, query),
        retrainingListApplications(type),
      ]);
      if (gen !== loadGen.current) return;
      setCourses(items);
      setApplications(apps);
      setError(null);
    } catch (caught) {
      if (gen !== loadGen.current) return;
      if (isRetrainingTypeMissingError(caught)) {
        router.replace("/retraining/select-type");
        return;
      }
      if (!silent) setError(caught);
    } finally {
      if (gen === loadGen.current && !silent) setLoading(false);
    }
  }, [requireType, router]);

  useEffect(() => {
    void load(false);
    return () => {
      loadGen.current += 1;
    };
  }, [load, search]);

  useLiveRefresh(() => void load(true), { skipTick: true });

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 min-w-0">
        <h2 className="text-[20px] font-bold text-[#0C2340]">{paths.badge} kurslari</h2>
        <p className="mt-1 text-sm text-[#64748B]">Tanlangan yo‘nalish kurslari.</p>
      </div>

      {loading ? (
        <RetrainingCoursesSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load(false)} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Hozircha qayta tayyorlash kurslari mavjud emas."
          description="Qidiruvni o'zgartirib ko'ring."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <RetrainingCourseCard
              key={course.id}
              course={course}
              application={findRetrainingApplication(applications, course)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
