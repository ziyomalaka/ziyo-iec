import EmptyState from "@/components/dashboard/ui/EmptyState";
import type { ActivityResponse } from "@/lib/api/types/profile";
import { formatDateTime } from "@/lib/dashboard/utils";
import { Activity } from "lucide-react";

type ProfileActivitySectionProps = {
  items: ActivityResponse[];
  loading?: boolean;
};

export default function ProfileActivitySection({ items, loading }: ProfileActivitySectionProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-[#E8EDF5] bg-white" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Faoliyat topilmadi"
        description="Hozircha tizimdagi harakatlar qayd etilmagan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id ?? `${item.action}-${item.created_at}`}
          className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[#0C2340]">{item.action}</p>
              <p className="mt-1 text-sm text-[#64748B]">{item.description}</p>
            </div>
            <time className="text-xs text-[#94A3B8]">{formatDateTime(item.created_at)}</time>
          </div>
          {(item.browser || item.device || item.ip_address) && (
            <p className="mt-2 text-xs text-[#94A3B8]">
              {[item.device, item.browser, item.ip_address].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
