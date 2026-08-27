"use client";

import { cn } from "@/lib/cn";
import { educationLevelTabs, type InstitutionType } from "@/lib/dashboard/education-level";

type InstitutionTabsProps = {
  active: InstitutionType | "all";
  counts: Record<InstitutionType | "all", number>;
  onChange: (id: InstitutionType | "all") => void;
};

export default function InstitutionTabs({ active, counts, onChange }: InstitutionTabsProps) {
  return (
    <div className="flex h-[62px] w-full items-center gap-4 overflow-x-auto border-b border-[#edf1f7] bg-white px-4 sm:h-[78px] sm:gap-6 sm:px-6">
      {educationLevelTabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 border-b-2 text-[14px] font-medium",
              isActive ? "border-[#0756F5] text-[#0756F5]" : "border-transparent text-[#101A37]"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                isActive ? "bg-[#0756F5] text-white" : "bg-[#E8F0FF] text-[#0756F5]"
              )}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
