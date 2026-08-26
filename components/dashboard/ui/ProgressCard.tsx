import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { MyCourse } from "@/lib/dashboard/types";
import { formatDate } from "@/lib/dashboard/utils";
import DashboardBadge from "./DashboardBadge";
import ProgressBar from "./ProgressBar";

const statusMap = {
  active: { label: "Faol", variant: "success" as const },
  completed: { label: "Tugallangan", variant: "default" as const },
  pending: { label: "Kutilmoqda", variant: "warning" as const },
  locked: { label: "Qulflangan", variant: "neutral" as const },
};

type ProgressCardProps = {
  course: MyCourse;
  className?: string;
};

export default function ProgressCard({ course, className }: ProgressCardProps) {
  const status = statusMap[course.status];

  return (
    <div className={cn("rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]", className)}>
      <div className="flex gap-4">
        <div className={cn("h-20 w-28 shrink-0 rounded-lg bg-gradient-to-br", course.imageGradient)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[#0C2340]">{course.title}</h3>
            <DashboardBadge variant={status.variant}>{status.label}</DashboardBadge>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">{course.direction}</p>
          <p className="mt-1 text-xs text-[#64748B]">Boshlangan: {formatDate(course.startedAt)}</p>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={course.progress} />
        <p className="mt-2 text-xs text-[#64748B]">
          {course.completedLessons}/{course.totalLessons} dars tugallangan
          {course.score !== undefined && ` · Natija: ${course.score}%`}
        </p>
      </div>
      <div className="mt-4">
        {course.status === "completed" ? (
          <Link href="/dashboard/results" className="text-sm font-medium text-[#2563EB] hover:underline">
            Natijani ko'rish
          </Link>
        ) : course.status === "active" ? (
          <Link
            href="/dashboard/learning"
            className="inline-flex rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]"
          >
            O'qishni davom ettirish
          </Link>
        ) : (
          <span className="text-sm text-[#64748B]">Tasdiqlash kutilmoqda</span>
        )}
      </div>
    </div>
  );
}
