import { cn } from "@/lib/cn";
import type { ResultItem } from "@/lib/dashboard/types";
import { formatDate } from "@/lib/dashboard/utils";
import DashboardBadge from "./DashboardBadge";

const statusConfig = {
  success: { label: "Muvaffaqiyatli", variant: "success" as const },
  satisfactory: { label: "Qoniqarli", variant: "warning" as const },
  retry: { label: "Qayta topshirish", variant: "danger" as const },
};

type ResultCardProps = {
  result: ResultItem;
  onView?: () => void;
  className?: string;
};

export default function ResultCard({ result, onView, className }: ResultCardProps) {
  const status = statusConfig[result.status];

  return (
    <div className={cn("rounded-xl border border-[#E8EDF5] bg-white p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#0C2340]">{result.testTitle}</h3>
          <p className="mt-1 text-sm text-[#64748B]">{result.course}</p>
        </div>
        <DashboardBadge variant={status.variant}>{status.label}</DashboardBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="font-bold text-[#2563EB]">{result.score} ball</span>
        <span className="text-[#64748B]">{result.percent}%</span>
        <span className="text-[#64748B]">{formatDate(result.date)}</span>
      </div>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="mt-3 text-sm font-medium text-[#2563EB] hover:underline"
        >
          Natijani ko'rish
        </button>
      )}
    </div>
  );
}
