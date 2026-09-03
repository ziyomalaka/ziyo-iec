"use client";

import { useEffect, useState } from "react";
import { LibraryBig, Search, SlidersHorizontal } from "lucide-react";
import AdminPagination from "@/components/admin/AdminPagination";
import LibraryBookCard from "@/components/dashboard/library/LibraryBookCard";
import LibraryFilterSheet from "@/components/dashboard/library/LibraryFilterSheet";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import { emptyLibraryFilters, useStudentLibrary } from "@/lib/hooks/useLibrary";
import { LIBRARY_CATEGORIES, LIBRARY_FILE_TYPES, LIBRARY_LANGUAGES } from "@/lib/library/constants";
import { LibraryAllIcon, libraryCategoryIcon } from "@/lib/library/icons";
import { cn } from "@/lib/cn";

export default function LibraryView() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyLibraryFilters);
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { items, totalPages, loading, error, reload } = useStudentLibrary(search, filters, page);

  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  const setCategory = (category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const filterSelectClass =
    "min-h-11 min-w-[160px] rounded-xl border border-[#E8EDF5] bg-white px-3 text-sm text-[#0C2340] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block w-full min-w-0 flex-1">
          <span className="sr-only">Kitoblarni qidirish</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-[#0756F5]" strokeWidth={1.75} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kitoblarni qidirish"
            className="min-h-11 w-full rounded-xl border border-[#E8EDF5] bg-white py-2 pr-4 pl-11 text-sm text-[#0C2340] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
        </label>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <label className="sr-only" htmlFor="library-language">
            Til
          </label>
          <select
            id="library-language"
            value={filters.language}
            onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
            className={filterSelectClass}
          >
            <option value="">Til: barchasi</option>
            {LIBRARY_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="library-file-type">
            Fayl turi
          </label>
          <select
            id="library-file-type"
            value={filters.file_type}
            onChange={(e) => setFilters((prev) => ({ ...prev, file_type: e.target.value }))}
            className={filterSelectClass}
          >
            <option value="">Fayl: barchasi</option>
            {LIBRARY_FILE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8EDF5] px-4 text-sm font-medium text-[#0C2340] lg:hidden"
        >
          <SlidersHorizontal className="h-[18px] w-[18px] text-[#0756F5]" strokeWidth={1.75} />
          Filtrlar
        </button>
      </div>

      <div className="-mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium",
            !filters.category ? "bg-[#0756F5] text-white" : "border border-[#E8EDF5] bg-white text-[#0C2340]"
          )}
        >
          <LibraryAllIcon className="h-4 w-4" strokeWidth={1.75} />
          Barchasi
        </button>
        {LIBRARY_CATEGORIES.map((item) => {
          const Icon = libraryCategoryIcon(item.value);
          const active = filters.category === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setCategory(item.value)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium",
                active ? "bg-[#0756F5] text-white" : "border border-[#E8EDF5] bg-white text-[#0C2340]"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-[#0756F5]")} strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[10px] border border-[#E8EDF5]">
                <div className="aspect-[3/4] animate-pulse bg-[#E8EDF5]" />
                <div className="space-y-2 p-4">
                  <div className="h-5 animate-pulse rounded bg-[#E8EDF5]" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EDF5]" />
                  <div className="h-11 animate-pulse rounded bg-[#E8EDF5]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={typeof error === "string" ? error : undefined} error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={LibraryBig}
            title="Hozircha kutubxona materiallari mavjud emas."
            description={search || filters.category || filters.language || filters.file_type ? "Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring." : "Materiallar qo'shilgach, shu yerda chiqadi."}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((item) => (
              <LibraryBookCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <LibraryFilterSheet
        open={sheetOpen}
        value={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
