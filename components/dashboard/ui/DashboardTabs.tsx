"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DashboardTabsProps = {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  action?: ReactNode;
  className?: string;
};

export default function DashboardTabs({ tabs, active, onChange, action, className }: DashboardTabsProps) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-[#E8EDF5] pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", className)}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active === tab.id
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:bg-[#F7F9FC] hover:text-[#0C2340]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
