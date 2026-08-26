import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Clock, GraduationCap, TrendingUp } from "lucide-react";
import type { ProfileStatistics } from "@/lib/profile/types";
import { cn } from "@/lib/cn";

type ProfileStatsRowProps = {
  stats: ProfileStatistics | null;
  loading?: boolean;
};

const iconBox = "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl";

function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  iconClass,
  badge,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconClass: string;
  badge?: string;
}) {
  return (
    <div className="flex h-full min-h-[6.5vw] w-full items-center gap-[8%] rounded-[9px] border border-[#DFE7F2] bg-white px-[8%] shadow-[0_1px_3px_rgba(20,40,80,.03)]">
      <div className={cn(iconBox, iconClass)}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] leading-tight text-[#536287]">{label}</p>
        <p className="text-[20px] leading-tight font-bold text-[#121c39]">{value}</p>
        {badge ? (
          <span className="mt-0.5 inline-flex rounded-[5px] bg-[#E7F7EC] px-1.5 py-0.5 text-[9px] font-medium text-[#2D9951]">
            {badge}
          </span>
        ) : (
          <p className="text-[10px] text-[#52668f]">{unit}</p>
        )}
      </div>
    </div>
  );
}

export default function ProfileStatsRow({ stats, loading }: ProfileStatsRowProps) {
  if (loading && !stats) {
    return (
      <div className="grid w-full grid-cols-1 gap-[1%] sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-h-[6.5vw] w-full animate-pulse rounded-[9px] border border-[#DFE7F2] bg-white" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid w-full grid-cols-1 gap-[1%] sm:grid-cols-2 lg:grid-cols-5">
      <StatTile
        label="Jami kurslar"
        value={stats.totalCourses}
        unit="ta kurs"
        icon={BookOpen}
        iconClass="bg-[#EEF5FF] text-[#0756F5]"
      />
      <StatTile
        label="Tugallangan kurslar"
        value={stats.completedCourses}
        unit="ta kurs"
        icon={GraduationCap}
        iconClass="bg-[#E7F7EC] text-[#2D9951]"
      />
      <StatTile
        label="O'rtacha natija"
        value={`${stats.averageScore}%`}
        icon={TrendingUp}
        iconClass="bg-[#FFF4E5] text-[#E08A00]"
        badge={stats.averageLabel}
      />
      <StatTile
        label="Qo'lga kiritilgan sertifikatlar"
        value={stats.certificateCount}
        unit="ta sertifikat"
        icon={Award}
        iconClass="bg-[#F3EEFF] text-[#7C5CFC]"
      />
      <StatTile
        label="O'quv vaqti"
        value={stats.totalLearningHours}
        unit="soat"
        icon={Clock}
        iconClass="bg-[#E8F4FF] text-[#3B82F6]"
      />
    </div>
  );
}
