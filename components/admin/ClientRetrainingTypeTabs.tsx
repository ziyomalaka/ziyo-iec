"use client";

import { cn } from "@/lib/cn";
import {
  CLIENT_RETRAINING_TABS,
  type ClientRetrainingFilter,
} from "@/lib/admin/client-program";

export default function ClientRetrainingTypeTabs({
  value,
  onChange,
  counts,
}: {
  value: ClientRetrainingFilter;
  onChange: (next: ClientRetrainingFilter) => void;
  counts: Partial<Record<ClientRetrainingFilter, number>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {CLIENT_RETRAINING_TABS.map((tab) => {
        const active = value === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0C2340]"
          >
            <span
              className={cn("h-3.5 w-3.5 shrink-0 rounded-full border-2", tab.dot, active ? tab.dotActive : tab.dotIdle)}
              aria-hidden
            />
            <span>
              {tab.label}
              {typeof count === "number" ? `(${count})` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
