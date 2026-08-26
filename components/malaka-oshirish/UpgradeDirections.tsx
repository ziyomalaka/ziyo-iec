"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  GraduationCap,
  Shield,
  Monitor,
  Calculator,
  Users,
} from "@/lib/icons";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";
import { getCourseFilters } from "@/lib/api/courses";
import { getCatalogCourses } from "@/lib/dashboard/qualification-catalog";
import type { FilterOption } from "@/lib/api/types/courses";
import { useTranslations } from "next-intl";
import { displayEducationCategoryName } from "@/lib/dashboard/education-level";
import { isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

const directionMeta = [
  { icon: GraduationCap, color: "bg-blue-100 text-blue-600" },
  { icon: Shield, color: "bg-emerald-100 text-emerald-600" },
  { icon: Monitor, color: "bg-violet-100 text-violet-600" },
  { icon: Calculator, color: "bg-orange-100 text-orange-600" },
  { icon: Users, color: "bg-pink-100 text-pink-600" },
] as const;

export default function UpgradeDirections() {
  const t = useTranslations("upgrade");
  const tCommon = useTranslations("common");
  const [directions, setDirections] = useState<Array<FilterOption & { count?: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [filtersRes, coursesRes] = await Promise.allSettled([
      getCourseFilters(true),
      getCatalogCourses({ page: 1, per_page: 100 }, true),
    ]);
    const counts = new Map<string, number>();
    if (coursesRes.status === "fulfilled") {
      for (const course of coursesRes.value.items.filter((item) => !isMandatoryBlockCourse({ title: item.title ?? "" }))) {
        const key = course.category_id ? String(course.category_id) : course.category_name ?? "";
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (course.category_name) counts.set(course.category_name, (counts.get(course.category_name) ?? 0) + 1);
      }
    }

    let items: Array<FilterOption & { count?: number }> = [];
    if (filtersRes.status === "fulfilled") {
      items = filtersRes.value.directions.map((item) => ({
        ...item,
        label: displayEducationCategoryName(item.label, item.value) || item.label,
        count: counts.get(item.value) ?? counts.get(item.label),
      }));
    }
    if (!items.length && coursesRes.status === "fulfilled") {
      const unique = new Map<string, FilterOption & { count?: number }>();
      for (const course of coursesRes.value.items.filter((item) => !isMandatoryBlockCourse({ title: item.title ?? "" }))) {
        const value = course.category_id ? String(course.category_id) : course.category_name;
        const label = displayEducationCategoryName(course.category_name) || course.category_name || value;
        if (!value || !label) continue;
        const prev = unique.get(value);
        unique.set(value, { value, label, count: (prev?.count ?? 0) + 1 });
      }
      items = Array.from(unique.values());
    }
    setDirections(items);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  return (
    <Section id="yonalishlar" muted>
      <Container>
        <SectionHeader
          title={t("directions.title")}
          link={{ href: "/dashboard/courses", label: tCommon("viewAllDirectionsFull") }}
        />

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : directions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-muted">
            Hozircha malaka oshirish yo'nalishlari yo'q.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {directions.map((dir, index) => {
              const meta = directionMeta[index % directionMeta.length];
              const Icon = meta.icon;
              return (
                <Link key={`${dir.value}-${dir.label}`} href={`/dashboard/courses?category_id=${encodeURIComponent(dir.value)}`}>
                  <Card hover className="group flex h-full flex-col items-center text-center">
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-current/20 ${meta.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">{dir.label}</h3>
                    {dir.count != null ? (
                      <p className="mt-1 text-xs text-muted">{tCommon("coursesCount", { count: dir.count })}</p>
                    ) : null}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:gap-2">
                      {tCommon("buttons.goToDirection")}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}
