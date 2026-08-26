"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  BookOpen,
  Monitor,
  Star,
  Heart,
  ArrowRight,
} from "@/lib/icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const courseMeta = [
  { gradient: "from-blue-500 to-indigo-600", badgeColor: "bg-emerald-500" },
  { gradient: "from-violet-500 to-purple-600", badgeColor: "bg-primary" },
  { gradient: "from-emerald-500 to-teal-600", badgeColor: "bg-red-500" },
  { gradient: "from-orange-500 to-amber-600", badgeColor: "" },
  { gradient: "from-cyan-500 to-blue-600", badgeColor: "bg-emerald-500" },
];

type CourseItem = {
  title: string;
  badge: string | null;
  type: string;
  hours: string;
  lessons: string;
  rating: number;
  reviews: number;
  price: string;
  oldPrice: string | null;
};

type DirectionCoursesClientProps = {
  courses: CourseItem[];
  filters: string[];
  searchPlaceholder: string;
  filtersLabel: string;
  onlineLabel: string;
  detailsLabel: string;
  addToFavoritesLabel: string;
  viewAllCoursesLabel: string;
};

export default function DirectionCoursesClient({
  courses,
  filters,
  searchPlaceholder,
  filtersLabel,
  onlineLabel,
  detailsLabel,
  addToFavoritesLabel,
  viewAllCoursesLabel,
}: DirectionCoursesClientProps) {
  const [search, setSearch] = useState("");

  const visibleFilters = filters
    .filter((f) => !/narxi|цена|to['’]?lov|оплат/i.test(f))
    .map((f) =>
      f === "Тип курса" ? "Направление" : f === "Kurs turi" ? "Yo'nalish" : f
    );

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Card className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {visibleFilters.map((f) => (
            <button
              key={f}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-primary hover:text-primary transition-colors"
            >
              {f}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2 lg:justify-end">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field py-2 pl-9 pr-3"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-primary hover:text-primary transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{filtersLabel}</span>
          </button>
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {filtered.map((course, index) => {
          const meta = courseMeta[index];
          return (
            <Card key={course.title} hover padding={false} className="overflow-hidden">
              <div className={`relative h-36 bg-gradient-to-br ${meta.gradient}`}>
                {course.badge &&
                  !/chegirma|скидк/i.test(course.badge) && (
                  <span
                    className={`absolute left-3 top-3 rounded-full ${meta.badgeColor} px-2 py-0.5 text-xs font-semibold text-white`}
                  >
                    {course.badge}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold leading-snug text-slate-900 line-clamp-2 min-h-[2.5rem]">
                  {course.title}
                </h3>
                <div className="mt-3 space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" />
                    {course.type}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {course.hours} · {course.lessons}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Monitor className="h-3 w-3" />
                    {onlineLabel}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="flex items-center gap-1 text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {course.rating} ({course.reviews})
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    href={course.type === "Qayta tayyorlash" || course.type === "Переподготовка" ? "/qayta-tayyorlash" : "/malaka-oshirish"}
                    variant="primary-sm"
                    className="flex-1"
                  >
                    {detailsLabel}
                  </Button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
                    aria-label={addToFavoritesLabel}
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Button href="/malaka-oshirish" variant="outline">
          {viewAllCoursesLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
