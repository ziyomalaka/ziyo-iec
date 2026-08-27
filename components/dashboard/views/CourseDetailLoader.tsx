"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { getCatalogCourse } from "@/lib/dashboard/qualification-catalog";
import {
  getEducationCourseById,
  isLocalEducationCourseId,
  overlayEducationCourseWithPublished,
} from "@/lib/dashboard/education-catalog";
import { readQualificationSnapshot, matchPublishedDirectionByTitle } from "@/lib/qualification/published-snapshot";
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
        if (isLocalEducationCourseId(id)) {
          const local = getEducationCourseById(id);
          const snapshot = await readQualificationSnapshot({ forceNetwork: true }).catch(() => []);
          const overlaid = local ? overlayEducationCourseWithPublished(local, snapshot) : null;
          const match = overlaid ? matchPublishedDirectionByTitle(snapshot, overlaid.title) : null;
          const numeric = match?.itId ?? match?.id;
          if (numeric && numeric > 0) {
            try {
              const data = await getCatalogCourse(String(numeric));
              const mapped = mapCourseDetail(data);
              if (overlaid) {
                setCourse({
                  ...overlaid,
                  description: mapped.description || overlaid.description,
                  syllabus: mapped.syllabus.length ? mapped.syllabus : overlaid.syllabus,
                  modulesCount: mapped.syllabus.length || overlaid.modulesCount,
                  lessonsCount: mapped.lessonsCount || overlaid.lessonsCount,
                  hours: mapped.hours || overlaid.hours,
                });
              } else {
                setCourse(mapped);
              }
              setError(null);
              return;
            } catch {
              /* snapshot overlay below */
            }
          }
          if (overlaid) {
            setCourse(overlaid);
            setError(null);
            return;
          }
        }
        const data = await getCatalogCourse(id);
        setCourse(mapCourseDetail(data));
        setError(null);
      } catch (err) {
        const local = getEducationCourseById(id);
        if (local) {
          setCourse(local);
          setError(null);
          return;
        }
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
