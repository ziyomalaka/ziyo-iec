"use client";

import { cn } from "@/lib/cn";
import {
  CLIENT_PROGRAM_TABS,
  type ClientProgramFilter,
} from "@/lib/admin/client-program";

export default function ClientProgramTabs({
  value,
  onChange,
  counts,
}: {
  value: ClientProgramFilter;
  onChange: (next: ClientProgramFilter) => void;
  counts: Partial<Record<ClientProgramFilter, number>>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-6 border-b border-[#E8EDF5]">
      {CLIENT_PROGRAM_TABS.map((tab) => {
        const active = value === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative pb-2 text-sm font-medium",
              active ? "text-[#0C2340]" : "text-[#94A3B8]"
            )}
          >
            {tab.label}
            {typeof count === "number" ? `(${count})` : ""}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#0756F5]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
