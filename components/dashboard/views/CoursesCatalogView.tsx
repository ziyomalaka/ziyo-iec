"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/layout/DashboardSearchContext";
import CatalogCourseCard from "@/components/dashboard/courses/CatalogCourseCard";
import CoursePagination from "@/components/dashboard/courses/CoursePagination";
import InstitutionTabs from "@/components/dashboard/courses/InstitutionTabs";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import { getMyApplications } from "@/lib/api/applications";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { findCourseApplication, isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import {
  classifyEducationLevel,
  countEducationLevels,
  courseEducationLevel,
  educationLevelLabels,
  educationLevels,
  type InstitutionType,
} from "@/lib/dashboard/education-level";
import { emptyFilters, useCourses } from "@/lib/hooks/useCourses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";

export default function CoursesCatalogView() {
  const { search } = useDashboardSearch();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [level, setLevel] = useState<InstitutionType | "all">("all");
  const filters = useMemo(
    () => ({ ...emptyFilters, direction: searchParams.get("category_id") ?? "" }),
    [searchParams]
  );
  const { courses, totalPages, options, loading, error } = useCourses(search, filters, page, pageSize);
  const [applications, setApplications] = useState<Record<string, ClientApplicationResponse>>({});

  useEffect(() => {
    setPage(1);
  }, [search, filters, level]);

  const loadApplications = useCallback(async () => {
    try {
      const apps = await getMyApplications();
      const next: Record<string, ClientApplicationResponse> = {};
      for (const course of courses) {
        const found = findCourseApplication(apps, course);
        if (found) next[course.id] = found;
      }
      setApplications(next);
    } catch {
      /* fon yangilashda xatolikni yashiramiz */
    }
  }, [courses]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useLiveRefresh(() => void loadApplications());

  const classified = useMemo(
    () =>
      courses.filter((course) => !isMandatoryBlockCourse(course)).map((course) => {
        if (course.institution) return course;
        const option = options.direction.find(
          (item) => item.value === String(course.categoryId ?? "") || item.label === course.categoryName
        );
        const institution = classifyEducationLevel(
          option?.label,
          course.categoryName,
          course.courseType,
          course.subject,
          course.title
        );
        return institution ? { ...course, institution } : course;
      }),
    [courses, options.direction]
  );

  const counts = useMemo(() => countEducationLevels(classified), [classified]);

  const grouped = useMemo(() => {
    const sections: Record<InstitutionType, CourseCatalogItem[]> = {
      maktabgacha: [],
      umumtalim: [],
      "orta-maxsus": [],
      oliy: [],
    };
    const other: CourseCatalogItem[] = [];
    for (const course of classified) {
      const key = courseEducationLevel(course);
      if (key) sections[key].push(course);
      else other.push(course);
    }
    return { sections, other };
  }, [classified]);

  const visibleLevels = educationLevels.filter((id) => (level === "all" ? grouped.sections[id].length > 0 : id === level));

  return (
    <div>
      <InstitutionTabs
        active={level}
        counts={counts}
        onChange={(next) => {
          setLevel(next);
          setPage(1);
        }}
      />

      <div className="pt-5 pr-[31px] pb-[30px] pl-[25px]">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-[340px] animate-pulse rounded-[10px] bg-[#E8EDF5]" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={GraduationCap} title="Kurslar yuklanmadi" description={error} />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Yo'nalish topilmadi"
            description="Qidiruv yoki ta'lim turini o'zgartirib ko'ring."
          />
        ) : (
          <div className="space-y-10">
            {visibleLevels.map((id) => {
              const items = grouped.sections[id];
              if (level !== "all" && items.length === 0) {
                return (
                  <EmptyState
                    key={id}
                    icon={GraduationCap}
                    title={`${educationLevelLabels[id]} bo'yicha yo'nalish yo'q`}
                    description="Boshqa ta'lim turi yoki filterni tanlang."
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
                        application={applications[course.id]}
                        onApplied={(courseId, created) =>
                          setApplications((prev) => ({ ...prev, [courseId]: created }))
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {level === "all" && grouped.other.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="text-[20px] font-bold text-[#0C2340]">Boshqa</h2>
                  <span className="text-sm text-[#64748B]">{grouped.other.length} ta yo'nalish</span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {grouped.other.map((course) => (
                    <CatalogCourseCard
                      key={course.id}
                      course={course}
                      application={applications[course.id]}
                      onApplied={(courseId, created) =>
                        setApplications((prev) => ({ ...prev, [courseId]: created }))
                      }
                    />
                  ))}
                  </div>
              </section>
            ) : null}
          </div>
        )}

        <CoursePagination
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
