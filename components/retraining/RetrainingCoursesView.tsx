"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, SlidersHorizontal, X } from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/layout/DashboardSearchContext";
import RetrainingCourseCard from "@/components/retraining/RetrainingCourseCard";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import SearchInput from "@/components/dashboard/ui/SearchInput";
import { findRetrainingApplication, getRetrainingApplications } from "@/lib/retraining/applications";
import { filterRetrainingCourses, getRetrainingCourses, getRetrainingFilterOptions } from "@/lib/retraining/catalog";
import { studentApplicationKind } from "@/lib/dashboard/student-status";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { RetrainingCatalogCourse } from "@/lib/api/types/retraining";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";
import { cn } from "@/lib/cn";

type FilterState = {
  direction: string;
  type: string;
  hours: string;
  status: string;
};

const emptyFilters: FilterState = { direction: "", type: "", hours: "", status: "" };

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

function FilterFields({
  filters,
  options,
  onChange,
}: {
  filters: FilterState;
  options: { directions: { value: string; label: string }[]; types: { value: string; label: string }[]; hours: { value: string; label: string }[] };
  onChange: (next: FilterState) => void;
}) {
  const selectClass =
    "min-h-11 w-full rounded-xl border border-[#E8EDF5] bg-white px-3 text-sm text-[#0C2340] outline-none focus:border-[#2563EB]";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="min-w-0 text-sm font-medium text-[#0C2340]">
        Yo&apos;nalish
        <select
          value={filters.direction}
          onChange={(event) => onChange({ ...filters, direction: event.target.value })}
          className={cn(selectClass, "mt-1")}
        >
          <option value="">Barchasi</option>
          {options.directions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm font-medium text-[#0C2340]">
        Turi
        <select
          value={filters.type}
          onChange={(event) => onChange({ ...filters, type: event.target.value })}
          className={cn(selectClass, "mt-1")}
        >
          <option value="">Barchasi</option>
          {options.types.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm font-medium text-[#0C2340]">
        Davomiyligi
        <select
          value={filters.hours}
          onChange={(event) => onChange({ ...filters, hours: event.target.value })}
          className={cn(selectClass, "mt-1")}
        >
          <option value="">Barchasi</option>
          {options.hours.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm font-medium text-[#0C2340]">
        Holati
        <select
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
          className={cn(selectClass, "mt-1")}
        >
          <option value="">Barchasi</option>
          <option value="none">Ariza yo&apos;q</option>
          <option value="pending">Ko&apos;rib chiqilmoqda</option>
          <option value="approved">Tasdiqlandi</option>
          <option value="rejected">Rad etildi</option>
        </select>
      </label>
    </div>
  );
}

export default function RetrainingCoursesView() {
  const { search, setSearch } = useDashboardSearch();
  const [courses, setCourses] = useState<RetrainingCatalogCourse[]>([]);
  const [applications, setApplications] = useState<ClientApplicationResponse[]>([]);
  const [options, setOptions] = useState<{
    directions: { value: string; label: string }[];
    types: { value: string; label: string }[];
    hours: { value: string; label: string }[];
  }>({ directions: [], types: [], hours: [] });
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useLockBodyScroll(sheetOpen);
  useEscapeKey(sheetOpen, () => setSheetOpen(false));

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [items, apps, filterOptions] = await Promise.all([
        getRetrainingCourses(),
        getRetrainingApplications().catch(() => [] as ClientApplicationResponse[]),
        getRetrainingFilterOptions(),
      ]);
      setCourses(items);
      setApplications(apps);
      const derivedDirections = [...new Map(items.map((item) => [String(item.categoryId ?? item.direction), item.direction || item.categoryName || String(item.categoryId ?? "")])).entries()]
        .filter(([, label]) => label)
        .map(([value, label]) => ({ value, label }));
      const derivedTypes = [...new Map(items.map((item) => [item.courseType || "", item.courseType || ""])).entries()]
        .filter(([value]) => value)
        .map(([value, label]) => ({ value, label }));
      const derivedHours = [...new Map(items.map((item) => [String(item.hours || item.duration), item.duration || `${item.hours} soat`])).entries()]
        .filter(([value]) => value && value !== "0")
        .map(([value, label]) => ({ value, label }));
      setOptions({
        directions: filterOptions.directions.length ? filterOptions.directions : derivedDirections,
        types: filterOptions.types.length ? filterOptions.types : derivedTypes,
        hours: filterOptions.hours.length ? filterOptions.hours : derivedHours,
      });
      setError(null);
    } catch (caught) {
      if (!silent) setError(caught);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  const visible = useMemo(() => {
    const filtered = filterRetrainingCourses(courses, {
      search,
      direction: filters.direction,
      type: filters.type,
      hours: filters.hours,
    });
    if (!filters.status) return filtered;
    return filtered.filter((course) => {
      const application = findRetrainingApplication(applications, course);
      const kind = application ? studentApplicationKind(application.status) : "none";
      return filters.status === "none" ? !application : kind === filters.status;
    });
  }, [applications, courses, filters, search]);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold text-[#0C2340]">Qayta tayyorlash kurslari</h2>
          <p className="mt-1 text-sm text-[#64748B]">Faqat qayta tayyorlash dasturi kurslari.</p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Qidirish"
            className="min-w-0 flex-1 lg:w-[280px]"
          />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#E8EDF5] bg-white px-3 text-sm font-semibold text-[#0C2340] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
            Filter
          </button>
        </div>
      </div>

      <div className="mb-5 hidden lg:block">
        <FilterFields filters={filters} options={options} onChange={setFilters} />
      </div>

      {loading ? (
        <RetrainingCoursesSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load(false)} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Hozircha qayta tayyorlash kurslari mavjud emas."
          description="Qidiruv yoki filterni o'zgartirib ko'ring."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((course) => (
            <RetrainingCourseCard
              key={course.id}
              course={course}
              application={findRetrainingApplication(applications, course)}
            />
          ))}
        </div>
      )}

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#0C2340]/40"
            aria-label="Filterni yopish"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#E8EDF5]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0C2340]">Filter</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[#64748B]"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterFields filters={filters} options={options} onChange={setFilters} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="min-h-11 rounded-xl border border-[#E8EDF5] text-sm font-semibold text-[#64748B]"
              >
                Tozalash
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="min-h-11 rounded-xl bg-[#0756F5] text-sm font-semibold text-white"
              >
                Qo&apos;llash
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
