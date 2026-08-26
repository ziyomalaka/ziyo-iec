"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, BookOpen, Monitor } from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getCatalogCourses } from "@/lib/dashboard/qualification-catalog";
import { mapCourseCard } from "@/lib/dashboard/mappers/courses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import { isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
import { useTranslations } from "next-intl";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export default function UpgradePopularCourses() {
  const t = useTranslations("upgrade");
  const tCommon = useTranslations("common");
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getCatalogCourses({ page: 1, per_page: 10 }, true);
      setCourses(data.items.map(mapCourseCard).filter((course) => !isMandatoryBlockCourse(course)));
    } catch {
      if (!silent) setCourses([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  return (
    <Section id="kurslar">
      <Container>
        <SectionHeader
          title={t("popularCourses.title")}
          link={{ href: "/dashboard/courses", label: tCommon("viewAllCourses") }}
        />

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-muted">
            Hozircha malaka oshirish kurslari yo'q.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {courses.map((course) => (
              <Card key={course.id} hover padding={false} className="overflow-hidden">
                <div className={`relative h-32 bg-gradient-to-br ${course.imageGradient}`}>
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  {course.status ? (
                    <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {course.status}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="min-h-[2.5rem] text-sm font-bold leading-snug text-slate-900 line-clamp-2">
                    {course.title}
                  </h3>
                  {course.direction ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <BookOpen className="h-3 w-3" />
                      {course.direction}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    {course.duration ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.duration}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.modulesCount} modul
                    </span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {course.format || tCommon("online")}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button href={`/dashboard/courses/${course.id}`} variant="outline-sm" className="flex-1">
                      {tCommon("details")}
                    </Button>
                    <Button href={`/dashboard/courses/${course.id}`} variant="primary-sm" className="flex-1">
                      {tCommon("buttons.enroll")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
