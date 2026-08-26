"use client";

import EmptyState from "@/components/dashboard/ui/EmptyState";
import { SessionBadge } from "@/components/dashboard/profile/ProfileBadges";
import type { ActivityLog } from "@/lib/profile/types";
import { formatDisplayDateTime } from "@/lib/profile/mappers";
import { Activity, Award, BookOpen, ClipboardList, LogIn, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type ProfileActivityCardProps = {
  items: ActivityLog[];
  loading?: boolean;
  onViewAll: () => void;
};

function activityMeta(type: string): { icon: LucideIcon; box: string } {
  const t = type.toLowerCase();
  if (t.includes("login") || t.includes("kirish")) {
    return { icon: LogIn, box: "bg-[#E7F7EC] text-[#2D9951]" };
  }
  if (t.includes("logout") || t.includes("chiqish")) {
    return { icon: LogOut, box: "bg-[#E7F7EC] text-[#2D9951]" };
  }
  if (t.includes("test")) {
    return { icon: ClipboardList, box: "bg-[#FFF4E5] text-[#E08A00]" };
  }
  if (t.includes("cert") || t.includes("sertifikat")) {
    return { icon: Award, box: "bg-[#F3EEFF] text-[#7C5CFC]" };
  }
  if (t.includes("course") || t.includes("kurs")) {
    return { icon: BookOpen, box: "bg-[#EEF5FF] text-[#0756F5]" };
  }
  return { icon: BookOpen, box: "bg-[#EEF5FF] text-[#0756F5]" };
}

function isLoginActivity(item: ActivityLog) {
  const t = `${item.type} ${item.title}`.toLowerCase();
  return t.includes("login") || t.includes("kirish");
}

export default function ProfileActivityCard({ items, loading, onViewAll }: ProfileActivityCardProps) {
  const preview = items.slice(0, 5);

  return (
    <div className="w-full rounded-[9px] border border-[#DFE7F2] bg-white p-[4%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold text-[#111b39]">So&apos;nggi faoliyat</h3>
        <button type="button" onClick={onViewAll} className="text-[11px] font-medium text-[#0756F5]">
          Barchasini ko&apos;rish →
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[57px] animate-pulse rounded-[9px] bg-[#F7FAFE]" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <EmptyState icon={Activity} title="Hozircha faoliyat mavjud emas." />
      ) : (
        <div>
          {preview.map((item, index) => {
            const meta = activityMeta(item.type || item.title);
            const Icon = meta.icon;
            const current = index === 0 && isLoginActivity(item);
            return (
              <div
                key={item.id}
                className="flex h-auto min-h-[57px] items-center gap-3 border-b border-[#EDF1F6] py-2.5 last:border-0"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]", meta.box)}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#111b39]">{item.title}</p>
                  <p className="text-[10px] text-[#536287]">{formatDisplayDateTime(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-[10px] text-[#536287]">
                    {[item.browser, item.device].filter(Boolean).join(" • ")}
                  </p>
                  {current ? <SessionBadge /> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
