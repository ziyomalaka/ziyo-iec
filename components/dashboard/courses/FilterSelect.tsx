"use client";

import { cn } from "@/lib/cn";
import type { FilterOption } from "@/lib/api/types/courses";

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
};

export default function FilterSelect({ value, onChange, options, className }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-[47px] w-[146px] appearance-none rounded-lg border border-[#d9e3f0] bg-white bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27 fill=%27none%27%3E%3Cpath d=%27M1 1.5L6 6.5L11 1.5%27 stroke=%27%230d1938%27 stroke-width=%271.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-3 pr-8 text-[14px] font-medium text-[#0d1938] outline-none",
        className
      )}
    >
      {options.map((option, index) => (
        <option key={`${option.value}-${index}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
