"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type CoursePaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function pageItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "...")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("...");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push("...");
  items.push(totalPages);
  return items;
}

export default function CoursePagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: CoursePaginationProps) {
  const items = pageItems(page, Math.max(totalPages, 1));

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-[46px] w-11 items-center justify-center rounded-lg border border-[#dce4ef] bg-white text-[#101a37] disabled:opacity-40"
          aria-label="Oldingi"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {items.map((item, index) =>
          item === "..." ? (
            <span key={`e-${index}`} className="px-1 text-[14px] text-[#445574]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "flex h-[46px] w-11 items-center justify-center rounded-lg text-[14px] font-semibold",
                item === page
                  ? "bg-[#0756f5] text-white"
                  : "border border-[#dce4ef] bg-white text-[#101a37]"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-[46px] w-11 items-center justify-center rounded-lg border border-[#dce4ef] bg-white text-[#101a37] disabled:opacity-40"
          aria-label="Keyingi"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="ml-auto">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-[46px] w-[200px] appearance-none rounded-lg border border-[#d9e3f0] bg-white bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27 fill=%27none%27%3E%3Cpath d=%27M1 1.5L6 6.5L11 1.5%27 stroke=%27%230d1938%27 stroke-width=%271.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-4 pr-8 text-[14px] font-medium text-[#0d1938] outline-none"
        >
          <option value={8}>Sahifada: 8 ta</option>
          <option value={12}>Sahifada: 12 ta</option>
          <option value={16}>Sahifada: 16 ta</option>
        </select>
      </div>
    </div>
  );
}
