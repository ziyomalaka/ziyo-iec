"use client";

import { ListFilter } from "lucide-react";
import type { FilterOption } from "@/lib/api/types/courses";
import FilterSelect from "./FilterSelect";

export type CourseFilterState = {
  direction: string;
  subject: string;
  courseType: string;
  hours: string;
  module: string;
  status: string;
};

type CourseFiltersProps = {
  value: CourseFilterState;
  options: {
    direction: FilterOption[];
    subject: FilterOption[];
    courseType: FilterOption[];
    hours: FilterOption[];
    module: FilterOption[];
    status: FilterOption[];
  };
  onChange: (next: CourseFilterState) => void;
  onClear: () => void;
};

export default function CourseFilters({ value, options, onChange, onClear }: CourseFiltersProps) {
  return (
    <div className="flex h-[78px] w-full items-center justify-between gap-4 border-b border-[#edf1f7] bg-white px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5">
        <FilterSelect
          value={value.direction}
          options={options.direction}
          onChange={(direction) => onChange({ ...value, direction })}
        />
        <FilterSelect
          value={value.subject}
          options={options.subject}
          onChange={(subject) => onChange({ ...value, subject })}
        />
        <FilterSelect
          value={value.courseType}
          options={options.courseType}
          onChange={(courseType) => onChange({ ...value, courseType })}
        />
        <FilterSelect
          value={value.hours}
          options={options.hours}
          onChange={(hours) => onChange({ ...value, hours })}
        />
        <FilterSelect
          value={value.module}
          options={options.module}
          onChange={(module) => onChange({ ...value, module })}
        />
        <FilterSelect
          value={value.status}
          options={options.status}
          onChange={(status) => onChange({ ...value, status })}
        />
      </div>
      <button
        type="button"
        onClick={onClear}
        className="flex h-[47px] w-[170px] shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d9e3f0] bg-white text-[14px] font-semibold text-[#0756F5]"
      >
        <ListFilter className="h-4 w-4" strokeWidth={1.75} />
        Filtrni tozalash
      </button>
    </div>
  );
}
