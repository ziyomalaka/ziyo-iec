"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/layout/DashboardSearchContext";
import CatalogCourseCard from "@/components/dashboard/courses/CatalogCourseCard";
import InstitutionTabs from "@/components/dashboard/courses/InstitutionTabs";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import { getMyApplications } from "@/lib/api/applications";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { findCourseApplication } from "@/lib/dashboard/course-application";
import { mergeOliyEducationCourses } from "@/lib/dashboard/education-catalog";
import { readQualificationSnapshot } from "@/lib/qualification/published-snapshot";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import {
  countEducationLevels,
  educationLevelLabels,
  educationLevels,
  type InstitutionType,
} from "@/lib/dashboard/education-level";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import type { CourseCatalogItem } from "@/lib/dashboard/types";

function matchesSearch(course: CourseCatalogItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [course.title, course.direction, course.description, course.subject].some((value) =>
    (value ?? "").toLowerCase().includes(q)
  );
}

export default function CoursesCatalogView() {
  const { search } = useDashboardSearch();
  const [level, setLevel] = useState<InstitutionType | "all">("all");
  const [applications, setApplications] = useState<ClientApplicationResponse[]>([]);
  const [published, setPublished] = useState<QualificationDirection[]>([]);

  const loadCatalog = useCallback(async () => {
    const [apps, snapshot] = await Promise.all([
      getMyApplications().catch(() => [] as ClientApplicationResponse[]),
      readQualificationSnapshot({ forceNetwork: true }).catch(() => []),
    ]);
    setApplications(apps);
    setPublished(snapshot);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useLiveRefresh(() => void loadCatalog());

  const classified = useMemo(
    () => mergeOliyEducationCourses(published).filter((course) => matchesSearch(course, search)),
    [published, search]
  );

  const counts = useMemo(() => countEducationLevels(classified), [classified]);

  const grouped = useMemo(() => {
    const sections: Record<InstitutionType, CourseCatalogItem[]> = {
      maktabgacha: [],
      umumtalim: [],
      "orta-maxsus": [],
      oliy: classified,
    };
    return sections;
  }, [classified]);

  const visibleLevels = educationLevels.filter((id) => (level === "all" ? grouped[id].length > 0 : id === level));
  const hasVisible = visibleLevels.some((id) => grouped[id].length > 0);

  return (
    <div>
      <InstitutionTabs active={level} counts={counts} onChange={setLevel} />

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        {!hasVisible ? (
          <EmptyState
            icon={GraduationCap}
            title="Yo'nalish topilmadi"
            description="Qidiruv yoki ta'lim turini o'zgartirib ko'ring."
          />
        ) : (
          <div className="space-y-10">
            {visibleLevels.map((id) => {
              const items = grouped[id];
              if (level !== "all" && items.length === 0) {
                return (
                  <EmptyState
                    key={id}
                    icon={GraduationCap}
                    title={`${educationLevelLabels[id]} bo'yicha yo'nalish yo'q`}
                    description="Boshqa ta'lim turini tanlang."
                  />
                );
              }
              if (!items.length) return null;
              return (
                <section key={id}>
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-[20px] font-bold text-[#0C2340]">{educationLevelLabels[id]}</h2>
                    <span className="text-sm text-[#64748B]">{items.length} ta yo'nalish</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((course) => (
                      <CatalogCourseCard
                        key={course.id}
                        course={course}
                        application={findCourseApplication(applications, course)}
                        onApplied={(_courseId, created) => {
                          setApplications((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
